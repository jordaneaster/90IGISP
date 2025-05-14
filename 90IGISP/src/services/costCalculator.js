const { supabase, gisHelpers } = require('./supabase');

/**
 * CRS Cost Split Calculator
 * Computes each company's share of shipping costs
 */
const costCalculator = {
  /**
   * Calculate cost split for a group of shipments
   * @param {Object} loadGroup - Group of shipments to split costs for
   * @returns {Promise<Array>} Cost allocation per company
   */
  async calculateGroupSplit(loadGroup) {
    try {
      // Retrieve full shipment details
      const shipmentIds = loadGroup.shipmentIds || [];
      if (shipmentIds.length === 0) {
        return [];
      }
      
      const { data: shipments, error } = await supabase
        .from('shipments')
        .select('*')
        .in('id', shipmentIds);
      
      if (error) throw error;
      
      // Add the new shipment request if it exists
      const allShipments = shipments;
      if (loadGroup.companies && !shipmentIds.includes('new-request')) {
        const newRequestCompany = loadGroup.companies.find(
          c => !shipments.some(s => s.company_id === c)
        );
        
        if (newRequestCompany) {
          // Find the corresponding shipment data in the loadGroup
          const newRequestData = loadGroup.newShipmentData;
          if (newRequestData) {
            allShipments.push({
              id: 'new-request',
              company_id: newRequestCompany,
              weight: newRequestData.weight,
              industry: newRequestData.industryType,
              revenue_bracket: newRequestData.revenueBracket
            });
          }
        }
      }
      
      // Base cost factors 
      const totalCost = this._calculateBaseCost(loadGroup);
      
      // Calculate splits for each company
      const costSplits = this._allocateCosts(allShipments, totalCost, loadGroup);
      
      return costSplits;
    } catch (error) {
      console.error('Cost calculation error:', error);
      throw error;
    }
  },
  
  /**
   * Calculate base shipping cost for a route
   * @param {Object} loadGroup - Load group with route data
   * @returns {number} Base cost in dollars
   * @private
   */
  _calculateBaseCost(loadGroup) {
    // Calculate base cost using standard industry rates
    // $1.50 per mile + $0.10 per kg
    const distanceInMiles = loadGroup.distanceInMeters 
      ? loadGroup.distanceInMeters / 1609 // Convert meters to miles
      : 500; // Default to 500 miles if no distance provided
      
    const weightInKg = loadGroup.totalWeight || 10000;
    
    const distanceCost = distanceInMiles * 1.5; // $1.50 per mile
    const weightCost = weightInKg * 0.1; // $0.10 per kg
    
    return distanceCost + weightCost;
  },
  
  /**
   * Allocate costs among companies based on multiple factors
   * @param {Array} shipments - Shipment records
   * @param {number} totalCost - Total cost to allocate
   * @param {Object} loadGroup - Load group data
   * @returns {Array} Allocated costs per company
   * @private
   */
  _allocateCosts(shipments, totalCost, loadGroup) {
    // Weight-based allocation - companies with heavier loads pay more
    const totalWeight = loadGroup.totalWeight || 
      shipments.reduce((sum, s) => sum + (s.weight || 0), 0);
    
    // Revenue bracket weighting - higher bracket companies pay slightly more
    // Revenue brackets 1-5, with 5 being highest revenue
    const revenueBracketWeights = {
      1: 0.85, // Smallest companies get a discount
      2: 0.90,
      3: 1.00, // Standard rate
      4: 1.10,
      5: 1.20  // Largest companies pay premium
    };
    
    // Calculate weighted values for each shipment
    const weightedValues = shipments.map(shipment => {
      const weightProportion = shipment.weight / totalWeight;
      const bracketFactor = revenueBracketWeights[shipment.revenue_bracket] || 1.0;
      
      // Combined weight factor (70% weight-based, 30% revenue-based)
      const combinedFactor = (weightProportion * 0.7) + (bracketFactor * 0.3);
      return {
        shipmentId: shipment.id,
        companyId: shipment.company_id,
        weightedValue: combinedFactor
      };
    });
    
    // Normalize weighted values to sum to 1
    const totalWeightedValue = weightedValues.reduce(
      (sum, item) => sum + item.weightedValue, 
      0
    );
    
    // Calculate final cost splits
    return weightedValues.map(item => ({
      shipmentId: item.shipmentId,
      companyId: item.companyId,
      // Calculate the cost share based on weighted value and round to 2 decimal places
      cost: parseFloat((totalCost * (item.weightedValue / totalWeightedValue)).toFixed(2))
    }));
  },
  
  /**
   * Get cost breakdown for a specific shipment
   * @param {string} shipmentId - Shipment ID to get cost breakdown for
   * @returns {Promise<Object>} Detailed cost breakdown
   */
  async getCostBreakdown(shipmentId) {
    try {
      // Get the cost split data for this shipment
      const { data: costSplit, error } = await supabase
        .from('cost_splits')
        .select(`
          *,
          crs_groups(*)
        `)
        .eq('shipment_id', shipmentId)
        .single();
      
      if (error) throw error;
      
      if (!costSplit) {
        return {
          shipmentId,
          totalCost: 0,
          companyCost: 0,
          savings: 0,
          breakdown: []
        };
      }
      
      // Calculate what the cost would be without sharing
      const individualCost = this._calculateIndividualCost(shipmentId, costSplit.crs_groups);
      
      // Get all cost splits for the group to show the breakdown
      const { data: groupSplits, error: groupError } = await supabase
        .from('cost_splits')
        .select(`
          company_id,
          cost
        `)
        .eq('group_id', costSplit.group_id);
      
      if (groupError) throw groupError;
      
      return {
        shipmentId,
        totalGroupCost: costSplit.crs_groups.total_cost || 0,
        companyCost: costSplit.cost,
        individualCost: individualCost,
        savings: individualCost - costSplit.cost,
        savingsPercentage: ((individualCost - costSplit.cost) / individualCost * 100).toFixed(2),
        breakdown: groupSplits
      };
    } catch (error) {
      console.error('Cost breakdown error:', error);
      throw error;
    }
  },
  
  /**
   * Calculate what a shipment would cost without sharing
   * @param {string} shipmentId - Shipment ID
   * @param {Object} groupData - Group data with route information
   * @returns {number} Individual cost estimate
   * @private
   */
  async _calculateIndividualCost(shipmentId, groupData) {
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single();
    
    if (error) throw error;
    
    // Use the same base calculation as for groups but for single shipment
    const distanceInMiles = groupData.distance_meters / 1609; // Convert to miles
    const weightInKg = shipment.weight;
    
    const distanceCost = distanceInMiles * 1.5; // $1.50 per mile
    const weightCost = weightInKg * 0.1; // $0.10 per kg
    
    // Add 25% for non-shared shipment (economies of scale factor)
    return (distanceCost + weightCost) * 1.25;
  }
};

module.exports = costCalculator;
