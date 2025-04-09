const { getGISPoint, getGISPointsWithinRadius } = require('../services/database');
const { sendMessage } = require('../services/kafka');

/**
 * GraphQL Resolvers
 * Implements the logic for GraphQL operations
 */
const resolvers = {
  Query: {
    // Fetch a GIS point by ID
    gisPoint: async (_, { id }) => {
      const point = await getGISPoint(id);
      if (!point) return null;
      
      return {
        id: point.id,
        name: point.name,
        coordinates: {
          lat: point.geojson.coordinates[1],
          lng: point.geojson.coordinates[0]
        },
        geojson: point.geojson,
        properties: point.properties
      };
    },
    
    // Fetch GIS points within a radius
    gisPointsWithinRadius: async (_, { lat, lng, radius }) => {
      const points = await getGISPointsWithinRadius(lat, lng, radius);
      
      return points.map(point => ({
        id: point.id,
        name: point.name,
        coordinates: {
          lat: point.geojson.coordinates[1],
          lng: point.geojson.coordinates[0]
        },
        geojson: point.geojson,
        properties: point.properties,
        distance: point.distance
      }));
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
    }
  }
};

module.exports = resolvers;
