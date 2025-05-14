const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('../../../src/graphql/schema');
const resolvers = require('../../../src/graphql/resolvers');
const { sendMessage } = require('../../../src/services/kafka');
const { supabase } = require('../../../src/services/supabase');

// Mock services
jest.mock('../../../src/services/kafka', () => ({
  sendMessage: jest.fn().mockResolvedValue(true)
}));

// Create test server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: () => ({
    user: { id: '1', username: 'testuser', role: 'user' }
  })
});

describe('GraphQL Mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('unlockGISData mutation should trigger Kafka message', async () => {
    const result = await server.executeOperation({
      query: `mutation UnlockData($id: ID!) {
        unlockGISData(id: $id)
      }`,
      variables: { id: '1' }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.unlockGISData).toBe(true);
    
    expect(sendMessage).toHaveBeenCalledWith(
      'gis-data-access',
      expect.objectContaining({
        action: 'unlock',
        dataId: '1',
        userId: '1'
      })
    );
  });

  test('recordTrackingEvent mutation should save location', async () => {
    const result = await server.executeOperation({
      query: `mutation RecordLocation($shipmentId: ID!, $lat: Float!, $lng: Float!, $metadata: JSON) {
        recordTrackingEvent(
          shipmentId: $shipmentId,
          lat: $lat,
          lng: $lng,
          metadata: $metadata
        ) {
          id
          shipmentId
          location {
            lat
            lng
          }
          metadata
        }
      }`,
      variables: {
        shipmentId: '1',
        lat: 37.7749,
        lng: -122.4194,
        metadata: { speed: 65, heading: 270 }
      }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.recordTrackingEvent).toBeDefined();
    expect(result.data?.recordTrackingEvent.shipmentId).toBe('1');
    expect(result.data?.recordTrackingEvent.location).toEqual({
      lat: 37.7749,
      lng: -122.4194
    });
    expect(result.data?.recordTrackingEvent.metadata).toEqual({
      speed: 65,
      heading: 270
    });
  });

  test('mutations should fail without authentication', async () => {
    // Create a server without auth context
    const unauthenticatedServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({}) // No user
    });

    const result = await unauthenticatedServer.executeOperation({
      query: `mutation UnlockData($id: ID!) {
        unlockGISData(id: $id)
      }`,
      variables: { id: '1' }
    });

    // Should return an authentication error
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toBe('Authentication required');
  });
});
