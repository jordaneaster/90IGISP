const { supabase, gisHelpers } = require('../services/supabase');
const { sendMessage } = require('../services/kafka');
const crsEngine = require('../services/crs');
const costCalculator = require('../services/costCalculator');

/**
 * GraphQL Resolvers
 * Implements the logic for GraphQL operations
 */
const resolvers = {
  Query: {
    // Fetch a GIS point by ID
    gisPoint: async (_, { id }) => {
      const { data: point, error } = await supabase
        .from('gis_points')
        .select('id, name, properties')
        .eq('id', id)
        .single();
      
      if (error || !point) return null;
      
      // Get GeoJSON from PostGIS
      const { data: geojson, error: geoError } = await supabase
        .rpc('get_geojson_for_point', { point_id: id });
      
      if (geoError) throw geoError;
      
      return {
        id: point.id,
        name: point.name,
        coordinates: {
          lat: geojson.coordinates[1],
          lng: geojson.coordinates[0]
        },
        geojson,
        properties: point.properties
      };
    },
    
    // Fetch GIS points within a radius
    gisPointsWithinRadius: async (_, { lat, lng, radius }) => {
      const { data: points, error } = await supabase
        .rpc('points_within_radius', {
          lat,
          lng,
          radius_meters: radius
        });
      
      if (error) throw error;
      
      return points.map(point => ({
        id: point.id,
        name: point.name,
        coordinates: {
          lat: point.lat,
          lng: point.lng
        },
        geojson: point.geojson,
        properties: point.properties,
        distance: point.distance
      }));
    },
    
    // Get matched loads for a shipment request
    matchedLoads: async (_, { input }, context) => {
      // Check authentication
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const matchResult = await crsEngine.findMatchingLoads(input);
      
      if (!matchResult || !matchResult.loadGroup) {
        return null;
      }
      
      // Get full shipment details for the matches
      const { data: shipments, error } = await supabase
        .from('shipments')
        .select(`
          id, 
          origin,
          destination,
          weight,
          status,
          company:company_id (
            id,
            name,
            industry,
            revenue_bracket
          )
        `)
        .in('id', matchResult.loadGroup.shipmentIds);
      
      if (error) throw error;
      
      // Transform shipments data
      const shipmentsWithCoordinates = shipments.map(s => {
        const originCoords = JSON.parse(s.origin);
        const destCoords = JSON.parse(s.destination);
        
        return {
          id: s.id,
          origin: {
            lat: originCoords.coordinates[1],
            lng: originCoords.coordinates[0]
          },
          destination: {
            lat: destCoords.coordinates[1],
            lng: destCoords.coordinates[0]
          },
          weight: s.weight,
          company: {
            id: s.company.id,
            name: s.company.name,
            industry: s.company.industry,
            revenueBracket: s.company.revenue_bracket
          },
          status: s.status
        };
      });
      
      return {
        id: matchResult.loadGroup.id,
        shipments: shipmentsWithCoordinates,
        totalWeight: matchResult.loadGroup.totalWeight,
        routeGeometry: matchResult.loadGroup.routeGeometry,
        createdAt: new Date().toISOString()
      };
    },
    
    // Track shipments for a company
    trackShipments: async (_, { companyId }, context) => {
      // Check authentication
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      // Get shipments for this company
      const { data: shipments, error } = await supabase
        .from('shipments')
        .select('id')
        .eq('company_id', companyId);
      
      if (error) throw error;
      
      if (shipments.length === 0) {
        return [];
      }
      
      // Get the latest tracking event for each shipment
      const shipmentIds = shipments.map(s => s.id);
      
      const { data: latestEvents, error: eventsError } = await supabase
        .from('tracking_events')
        .select('id, shipment_id, metadata, created_at')
        .in('shipment_id', shipmentIds)
        .order('created_at', { ascending: false });
      
      if (eventsError) throw eventsError;
      
      // Get unique latest events per shipment
      const uniqueEvents = [];
      const seenShipments = new Set();
      
      for (const event of latestEvents) {
        if (!seenShipments.has(event.shipment_id)) {
          seenShipments.add(event.shipment_id);
          uniqueEvents.push(event);
        }
      }
      
      // Get coordinates for each event
      return Promise.all(uniqueEvents.map(async (event) => {
        const { data: coords, error } = await supabase
          .rpc('get_tracking_coordinates', { event_id: event.id });
        
        if (error) throw error;
        
        return {
          id: event.id,
          shipmentId: event.shipment_id,
          location: {
            lat: coords.lat,
            lng: coords.lng
          },
          metadata: event.metadata,
          timestamp: event.created_at
        };
      }));
    },
    
    // Get cost breakdown for a shipment
    costBreakdown: async (_, { shipmentId }, context) => {
      // Check authentication
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const breakdown = await costCalculator.getCostBreakdown(shipmentId);
      
      // Get company names for the breakdown
      const companyIds = breakdown.breakdown.map(item => item.companyId);
      
      if (companyIds.length > 0) {
        const { data: companies, error } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);
        
        if (!error && companies) {
          // Add company names to the breakdown
          breakdown.breakdown = breakdown.breakdown.map(item => {
            const company = companies.find(c => c.id === item.companyId);
            return {
              ...item,
              companyName: company ? company.name : 'Unknown'
            };
          });
        }
      }
      
      return breakdown;
    },
    
    // Get route efficiency metrics
    routeEfficiencyMetrics: async (_, { routeId }, context) => {
      // Check authentication
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const { data: route, error } = await supabase
        .from('crs_groups')
        .select('*')
        .eq('id', routeId)
        .single();
      
      if (error) throw error;
      
      // Get route distance from PostGIS
      const { data: routeData, error: routeError } = await supabase
        .rpc('calculate_route_metrics', { route_id: routeId });
      
      if (routeError) throw routeError;
      
      // Calculate efficiency metrics
      const totalWeight = route.total_weight || 10000; // kg
      const distanceInKm = routeData.distance_meters / 1000;
      
      // Estimations:
      // - Fuel consumption: ~30L/100km for truck, adjusted by weight
      // - CO2: ~2.6kg per liter of diesel
      // - Time: Assume 60km/h average speed
      const fuelConsumption = (distanceInKm / 100) * 30 * (totalWeight / 10000);
      const co2Emissions = fuelConsumption * 2.6;
      const timeEstimateHours = distanceInKm / 60;
      
      // Cost per mile (converted from km)
      const costPerMile = (routeData.total_cost || 1000) / (distanceInKm * 0.621371);
      
      return {
        routeId,
        totalDistance: routeData.distance_meters,
        fuelConsumption,
        co2Emissions,
        timeEstimate: timeEstimateHours,
        costPerMile
      };
    }
  },
  
  Mutation: {
    // Unlock GIS data access
    unlockGISData: async (_, { id }, context) => {
      // Check authentication
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      // Send message to Kafka for unlocking GIS data
      await sendMessage('gis-data-access', {
        action: 'unlock',
        dataId: id,
        userId: context.user.id,
        timestamp: new Date().toISOString()
      });
      
      return true;
    },
    
    // Record a tracking event
    recordTrackingEvent: async (_, { shipmentId, lat, lng, metadata }, context) => {
      // Check authentication
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      // Insert tracking event
      const { data, error } = await supabase
        .from('tracking_events')
        .insert({
          shipment_id: shipmentId,
          location: gisHelpers.makePoint(lng, lat),
          metadata
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        shipmentId: data.shipment_id,
        location: { lat, lng },
        metadata: data.metadata,
        timestamp: data.created_at
      };
    }
  }
};

module.exports = resolvers;
