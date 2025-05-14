const { supabase, gisHelpers } = require('./supabase');
const { sendMessage } = require('./kafka');
const redisClient = require('./redis');
const costCalculator = require('./costCalculator');

/**
 * CRS Load Matching Engine
 * Matches shipment requests with compatible routes along I-90
 */
class CRSLoadMatchingEngine {
  /**
   * Find compatible shipments that can be grouped together
   * @param {Object} shipmentRequest - New shipment request details
   * @returns {Promise<Object>} Matching results with cost splits
   */
  async findMatchingLoads(shipmentRequest) {
    try {
      const {
        origin, // { lat, lng }
        destination, // { lat, lng }
        weight,
        companyId,
        industryType,
        revenueBracket
      } = shipmentRequest;
      
      // Cache key for potential matches
      const cacheKey = `crs:matches:${origin.lat.toFixed(3)}:${origin.lng.toFixed(3)}:${destination.lat.toFixed(3)}:${destination.lng.toFixed(3)}`;
      const cachedMatches = await redisClient.get(cacheKey);
      
      if (cachedMatches) {
        console.log('90Scan: Serving CRS matches from cache');
        return JSON.parse(cachedMatches);
      }
      
      // Search for shipments along similar route (within 10km of origin & destination)
      // that are not from the same company and are compatible
      const { data: potentialMatches, error } = await supabase
        .from('shipments')
        .select(`
          id,
          origin,
          destination,
          weight,
          company_id,
          industry,
          revenue_bracket,
          status
        `)
        .neq('company_id', companyId)
        .eq('status', 'pending')
        .rpc('within_route_buffer', {
          o_lat: origin.lat,
          o_lng: origin.lng,
          d_lat: destination.lat,
          d_lng: destination.lng,
          buffer_meters: 10000 // 10km buffer
        });
      
      if (error) throw error;
      
      // Apply business rules to filter matches
      const compatibleMatches = this._applyBusinessRules(
        potentialMatches,
        industryType,
        weight,
        revenueBracket
      );
      
      // Group shipments and calculate costs
      const loadGroup = this._createLoadGroup([
        ...compatibleMatches,
        {
          id: 'new-request', // Placeholder ID for new request
          company_id: companyId,
          weight,
          industry: industryType,
          revenue_bracket: revenueBracket
        }
      ]);
      
      // Calculate cost split for the group
      const costSplit = await costCalculator.calculateGroupSplit(loadGroup);
      
      // Cache results for 5 minutes
      await redisClient.setEx(cacheKey, 300, JSON.stringify({
        matches: compatibleMatches,
        loadGroup,
        costSplit
      }));
      
      // Publish match event to Kafka
      await sendMessage('crs.load.match', {
        companyId,
        matchCount: compatibleMatches.length,
        loadGroupId: loadGroup.id,
        timestamp: new Date().toISOString()
      });
      
      return {
        matches: compatibleMatches,
        loadGroup,
        costSplit
      };
    } catch (error) {
      console.error('CRS Load Matching error:', error);
      throw error;
    }
  }
  
  /**
   * Save a matched load group to the database
   * @param {Object} loadGroup - Group of matched shipments
   * @param {Array} costSplits - Calculated cost splits
   * @returns {Promise<Object>} Saved group
   */
  async saveMatchedLoadGroup(loadGroup, costSplits) {
    // Start a transaction
    const { data: group, error: groupError } = await supabase
      .from('crs_groups')
      .insert({
        shipment_ids: loadGroup.shipmentIds,
        total_weight: loadGroup.totalWeight,
        route_linestring: loadGroup.routeGeometry
      })
      .select()
      .single();
    
    if (groupError) throw groupError;
    
    // Insert cost splits
    const costSplitRecords = costSplits.map(split => ({
      shipment_id: split.shipmentId,
      company_id: split.companyId,
      cost: split.cost,
      group_id: group.id
    }));
    
    const { error: costSplitError } = await supabase
      .from('cost_splits')
      .insert(costSplitRecords);
    
    if (costSplitError) throw costSplitError;
    
    return group;
  }
  
  /**
   * Apply business rules to filter matching shipments
   * @private
   */
  _applyBusinessRules(potentialMatches, industryType, weight, revenueBracket) {
    // Filter out incompatible industry types
    const compatibilityMap = {
      'food': ['food', 'consumer_goods'],
      'hazardous': ['hazardous'],
      'consumer_goods': ['consumer_goods', 'food', 'electronics'],
      'electronics': ['electronics', 'consumer_goods'],
      'automotive': ['automotive', 'industrial'],
      'industrial': ['industrial', 'automotive', 'raw_materials'],
      'raw_materials': ['raw_materials', 'industrial']
    };
    
    // Get compatible industry types
    const compatibleIndustries = compatibilityMap[industryType] || [industryType];
    
    // Filter matches based on:
    // 1. Industry compatibility
    // 2. Total weight can't exceed 44,000 lbs (20,000 kg)
    // 3. Prioritize companies in similar revenue brackets for fairer cost sharing
    return potentialMatches.filter(match => {
      // Industry compatibility check
      if (!compatibleIndustries.includes(match.industry)) {
        return false;
      }
      
      // Weight limit check (assuming weight is in kg)
      if (match.weight + weight > 20000) {
        return false;
      }
      
      // Revenue bracket preference (not a hard filter but a scoring factor)
      const bracketDiff = Math.abs(match.revenue_bracket - revenueBracket);
      // Lower bracket difference = higher score
      const revenueBracketScore = 5 - bracketDiff; // Max score 5
      
      // Set a minimum threshold for matching (revenueBracketScore >= 3)
      return revenueBracketScore >= 3;
    });
  }
  
  /**
   * Create a load group from matched shipments
   * @private
   */
  _createLoadGroup(matchedShipments) {
    const shipmentIds = matchedShipments
      .filter(s => s.id !== 'new-request')
      .map(s => s.id);
    
    const totalWeight = matchedShipments
      .reduce((sum, s) => sum + s.weight, 0);
    
    return {
      id: `group-${Date.now()}`,
      shipmentIds,
      companies: matchedShipments.map(s => s.company_id),
      totalWeight,
      routeGeometry: null // Will be calculated and filled later
    };
  }
}

// Export instance
const crsEngine = new CRSLoadMatchingEngine();
module.exports = crsEngine;
