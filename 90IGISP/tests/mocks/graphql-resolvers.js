// Mock resolvers for GraphQL tests

module.exports = {
  Query: {
    gisPoint: () => ({
      id: '1',
      name: 'Test Point',
      coordinates: { lat: 37.7749, lng: -122.4194 },
      properties: { type: 'landmark' }
    }),
    
    gisPointsWithinRadius: () => [
      {
        id: '1',
        name: 'Test Point',
        distance: 500,
        coordinates: { lat: 37.7749, lng: -122.4194 }
      },
      {
        id: '2',
        name: 'Another Point',
        distance: 1200,
        coordinates: { lat: 37.7550, lng: -122.4250 }
      }
    ],
    
    matchedLoads: () => ({
      id: 'group-123',
      totalWeight: 5000,
      shipments: [
        { 
          id: '1', 
          weight: 5000,
          company: { id: '1', name: 'Test Company' }
        }
      ]
    }),
    
    costBreakdown: (_, { shipmentId }) => ({
      shipmentId,
      totalGroupCost: 1000,
      companyCost: 500,
      individualCost: 800,
      savings: 300,
      savingsPercentage: '37.50',
      breakdown: [
        { shipmentId: '1', companyId: '1', cost: 500 },
        { shipmentId: '2', companyId: '2', cost: 500 }
      ]
    }),
    
    routeEfficiencyMetrics: (_, { routeId }) => ({
      routeId,
      totalDistance: 3800000,
      fuelConsumption: 850.5,
      co2Emissions: 2450.75,
      timeEstimate: 42.5,
      costPerMile: 2.65
    })
  },
  
  Mutation: {
    unlockGISData: () => true,
    
    recordTrackingEvent: (_, { shipmentId, lat, lng, metadata }) => ({
      id: 'mock-123',
      shipmentId,
      location: { lat, lng },
      metadata
    })
  }
};
