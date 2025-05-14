const crsEngine = require('../../../src/services/crs');
const { supabase } = require('../../../src/services/supabase');
const redisClient = require('../../../src/services/redis');
const { sendMessage } = require('../../../src/services/kafka');
const kafkaMock = require('../../mocks/kafka');

// Mock dependencies
jest.mock('../../../src/services/costCalculator', () => ({
  calculateGroupSplit: jest.fn().mockResolvedValue([
    { shipmentId: '1', companyId: '1', cost: 450.50 },
    { shipmentId: 'new-request', companyId: '2', cost: 350.25 }
  ])
}));

jest.mock('../../../src/services/kafka', () => ({
  sendMessage: jest.fn().mockResolvedValue(true)
}));

describe('CRS Load Matching Engine', () => {
  beforeEach(() => {
    // Clear mock data between tests
    jest.clearAllMocks();
    kafkaMock._reset();
  });

  test('findMatchingLoads should return matches for a shipment request', async () => {
    const shipmentRequest = {
      origin: { lat: 37.7749, lng: -122.4194 },
      destination: { lat: 40.7128, lng: -74.0060 },
      weight: 3500,
      companyId: '2',
      industryType: 'electronics',
      revenueBracket: 3
    };

    const result = await crsEngine.findMatchingLoads(shipmentRequest);

    expect(result).toBeDefined();
    expect(result.matches).toBeDefined();
    expect(result.loadGroup).toBeDefined();
    expect(result.costSplit).toBeDefined();

    // Check if Kafka message was sent
    expect(sendMessage).toHaveBeenCalledWith(
      'crs.load.match',
      expect.objectContaining({
        companyId: '2'
      })
    );
  });

  test('saveMatchedLoadGroup should save a load group and cost splits', async () => {
    const loadGroup = {
      shipmentIds: ['1', '2'],
      totalWeight: 8500,
      routeGeometry: 'LINESTRING(-122.4194 37.7749, -74.0060 40.7128)'
    };

    const costSplits = [
      { shipmentId: '1', companyId: '1', cost: 450.50 },
      { shipmentId: '2', companyId: '2', cost: 350.25 }
    ];

    const result = await crsEngine.saveMatchedLoadGroup(loadGroup, costSplits);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  test('Should use cache when available', async () => {
    // Set up cache
    const cacheKey = 'crs:matches:37.775:-122.419:40.713:-74.006';
    const cachedData = {
      matches: [{ id: '1', company_id: '1' }],
      loadGroup: { id: 'group-123', totalWeight: 5000 },
      costSplit: [{ shipmentId: '1', cost: 500 }]
    };

    // Pre-populate cache
    await redisClient.setEx(cacheKey, 300, JSON.stringify(cachedData));

    const shipmentRequest = {
      origin: { lat: 37.7749, lng: -122.4194 },
      destination: { lat: 40.7128, lng: -74.0060 },
      weight: 3500,
      companyId: '2',
      industryType: 'electronics',
      revenueBracket: 3
    };

    const result = await crsEngine.findMatchingLoads(shipmentRequest);

    expect(result).toEqual(cachedData);
    // Redis get should have been called
    expect(redisClient.get).toHaveBeenCalled();
  });
});
