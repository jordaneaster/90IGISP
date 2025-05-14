const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('../../../src/graphql/schema');
const resolvers = require('../../../src/graphql/resolvers');
const { supabase } = require('../../../src/services/supabase');
const crsEngine = require('../../../src/services/crs');
const costCalculator = require('../../../src/services/costCalculator');

// Mock service functions
jest.mock('../../../src/services/crs', () => ({
  findMatchingLoads: jest.fn().mockResolvedValue({
    matches: [{ id: '1', company_id: '1' }],
    loadGroup: { 
      id: 'group-123', 
      shipmentIds: ['1'],
      totalWeight: 5000 
    },
    costSplit: [{ shipmentId: '1', cost: 500 }]
  })
}));

jest.mock('../../../src/services/costCalculator', () => ({
  getCostBreakdown: jest.fn().mockResolvedValue({
    shipmentId: '1',
    totalGroupCost: 1000,
    companyCost: 500,
    individualCost: 800,
    savings: 300,
    savingsPercentage: '37.50',
    breakdown: [
      { shipmentId: '1', companyId: '1', cost: 500 },
      { shipmentId: '2', companyId: '2', cost: 500 }
    ]
  })
}));

// Create test server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: () => ({
    user: { id: '1', username: 'testuser', role: 'user' }
  })
});

describe('GraphQL Queries', () => {
  test('gisPoint query should return point data', async () => {
    const result = await server.executeOperation({
      query: `query GetPoint($id: ID!) {
        gisPoint(id: $id) {
          id
          name
          coordinates {
            lat
            lng
          }
          properties
        }
      }`,
      variables: { id: '1' }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.gisPoint).toBeDefined();
    expect(result.data?.gisPoint.id).toBe('1');
    expect(result.data?.gisPoint.coordinates).toEqual(
      expect.objectContaining({
        lat: expect.any(Number),
        lng: expect.any(Number)
      })
    );
  });

  test('gisPointsWithinRadius query should return points', async () => {
    const result = await server.executeOperation({
      query: `query PointsInRadius($lat: Float!, $lng: Float!, $radius: Float!) {
        gisPointsWithinRadius(lat: $lat, lng: $lng, radius: $radius) {
          id
          name
          distance
          coordinates {
            lat
            lng
          }
        }
      }`,
      variables: { 
        lat: 37.7749, 
        lng: -122.4194, 
        radius: 5000 
      }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.gisPointsWithinRadius).toBeDefined();
    expect(Array.isArray(result.data?.gisPointsWithinRadius)).toBe(true);
  });

  test('matchedLoads query should find compatible shipments', async () => {
    const result = await server.executeOperation({
      query: `query FindMatches($input: MatchedLoadsInput!) {
        matchedLoads(input: $input) {
          id
          totalWeight
          shipments {
            id
            weight
            company {
              id
              name
            }
          }
        }
      }`,
      variables: {
        input: {
          origin: { lat: 37.7749, lng: -122.4194 },
          destination: { lat: 40.7128, lng: -74.0060 },
          weight: 3500,
          companyId: "2",
          industryType: "electronics",
          revenueBracket: 3
        }
      }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.matchedLoads).toBeDefined();
    expect(result.data?.matchedLoads.id).toBeDefined();
    expect(result.data?.matchedLoads.totalWeight).toBeDefined();
    expect(Array.isArray(result.data?.matchedLoads.shipments)).toBe(true);
    
    expect(crsEngine.findMatchingLoads).toHaveBeenCalled();
  });

  test('costBreakdown query should return cost analysis', async () => {
    const result = await server.executeOperation({
      query: `query GetCostBreakdown($shipmentId: ID!) {
        costBreakdown(shipmentId: $shipmentId) {
          shipmentId
          totalGroupCost
          companyCost
          individualCost
          savings
          savingsPercentage
          breakdown {
            companyId
            cost
          }
        }
      }`,
      variables: { shipmentId: '1' }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.costBreakdown).toBeDefined();
    expect(result.data?.costBreakdown.shipmentId).toBe('1');
    expect(result.data?.costBreakdown.savings).toBe(300);
    expect(Array.isArray(result.data?.costBreakdown.breakdown)).toBe(true);
    
    expect(costCalculator.getCostBreakdown).toHaveBeenCalledWith('1');
  });

  test('routeEfficiencyMetrics query should return metrics', async () => {
    const result = await server.executeOperation({
      query: `query GetRouteMetrics($routeId: ID!) {
        routeEfficiencyMetrics(routeId: $routeId) {
          routeId
          totalDistance
          fuelConsumption
          co2Emissions
          timeEstimate
          costPerMile
        }
      }`,
      variables: { routeId: '1' }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.routeEfficiencyMetrics).toBeDefined();
    expect(result.data?.routeEfficiencyMetrics.routeId).toBe('1');
    expect(result.data?.routeEfficiencyMetrics.totalDistance).toBeDefined();
    expect(result.data?.routeEfficiencyMetrics.fuelConsumption).toBeDefined();
  });
});
