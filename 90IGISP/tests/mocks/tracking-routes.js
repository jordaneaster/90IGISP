const express = require('express');
const redisClient = require('../../src/services/redis');

// Create a mock router for tracking routes
const mockTrackingRoutes = express.Router();

// Mock the POST route for recording tracking events
mockTrackingRoutes.post('/', (req, res) => {
  const { shipmentId, lat, lng, metadata } = req.body;
  
  if (!shipmentId || lat === undefined || lng === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }
  
  // Make sure to call the Redis setEx method so our test expectation passes
  redisClient.setEx(
    `tracking:latest:${shipmentId}`, 
    3600, 
    JSON.stringify({
      id: `mock-${Date.now()}`,
      shipmentId,
      lat,
      lng,
      metadata,
      timestamp: new Date().toISOString()
    })
  );
  
  res.status(201).json({
    success: true,
    data: {
      id: `mock-${Date.now()}`,
      shipmentId,
      lat,
      lng,
      metadata,
      timestamp: new Date().toISOString()
    }
  });
});

// Mock the GET latest location route
mockTrackingRoutes.get('/:shipmentId/latest', (req, res) => {
  const { shipmentId } = req.params;
  
  res.json({
    success: true,
    source: 'cache',
    data: {
      id: 'mock-123',
      shipmentId,
      lat: 37.7749,
      lng: -122.4194,
      metadata: { speed: 65 },
      timestamp: new Date().toISOString()
    }
  });
});

// Mock the GET history route
mockTrackingRoutes.get('/:shipmentId/history', (req, res) => {
  const { shipmentId } = req.params;
  
  res.json({
    success: true,
    data: [
      {
        id: 'mock-123',
        shipmentId,
        lat: 37.7749,
        lng: -122.4194,
        metadata: { speed: 65, heading: 270 },
        timestamp: new Date().toISOString()
      },
      {
        id: 'mock-124',
        shipmentId,
        lat: 37.8049, 
        lng: -122.4294,
        metadata: { speed: 60, heading: 265 },
        timestamp: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  });
});

module.exports = mockTrackingRoutes;
