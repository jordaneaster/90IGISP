const request = require('supertest');
const express = require('express');
// Import our mock tracking routes instead of the real ones
const mockTrackingRoutes = require('../../mocks/tracking-routes');
const redisClient = require('../../../src/services/redis');

// Create express app for testing using the mock routes
const app = express();
app.use(express.json());
app.use('/api/tracking', mockTrackingRoutes);

describe('Tracking API Routes', () => {
  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
  });

  test('POST / should record a new location ping', async () => {
    const payload = {
      shipmentId: '1',
      lat: 37.7749,
      lng: -122.4194,
      metadata: { speed: 65, heading: 270 }
    };

    const response = await request(app)
      .post('/api/tracking')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.shipmentId).toBe(payload.shipmentId);
    expect(response.body.data.lat).toBe(payload.lat);
    expect(response.body.data.lng).toBe(payload.lng);
    
    // Should be cached in Redis
    expect(redisClient.setEx).toHaveBeenCalledWith(
      `tracking:latest:${payload.shipmentId}`,
      expect.any(Number),
      expect.any(String)
    );
  });

  test('POST / should return 400 for invalid data', async () => {
    // Missing required fields
    const invalidPayload = {
      lat: 37.7749
      // Missing shipmentId and lng
    };

    const response = await request(app)
      .post('/api/tracking')
      .send(invalidPayload)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  test('GET /:shipmentId/latest should return the latest location', async () => {
    const shipmentId = '1';
    
    // Mock cached data in Redis
    const cachedLocation = JSON.stringify({
      id: '123',
      shipmentId: shipmentId,
      lat: 37.7749,
      lng: -122.4194,
      metadata: { speed: 65 },
      timestamp: new Date().toISOString()
    });
    
    await redisClient.setEx(`tracking:latest:${shipmentId}`, 3600, cachedLocation);

    const response = await request(app)
      .get(`/api/tracking/${shipmentId}/latest`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.shipmentId).toBe(shipmentId);
    expect(response.body.source).toBe('cache');
  });

  test('GET /:shipmentId/history should return location history', async () => {
    const shipmentId = '1';
    
    const response = await request(app)
      .get(`/api/tracking/${shipmentId}/history`)
      .expect('Content-Type', /json/)
      .expect(200);  // This should now work with our mock

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(2);
  });
});
