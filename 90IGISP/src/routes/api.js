const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getGISPoint, getGISPointsWithinRadius } = require('../services/database');
const { sendMessage } = require('../services/kafka');
const cacheMiddleware = require('../middleware/cache');
const config = require('../config/config');

/**
 * API Routes
 * Defines REST endpoints for the 90IGISP system
 */

// Sample endpoint to get GIS data with caching (cache for 5 minutes)
router.get('/gisdata/:id', cacheMiddleware(300), async (req, res) => {
  try {
    const id = req.params.id;
    const gisPoint = await getGISPoint(id);
    
    if (!gisPoint) {
      return res.status(404).json({ error: 'GIS point not found' });
    }
    
    res.json({
      success: true,
      data: gisPoint
    });
  } catch (error) {
    console.error('Error fetching GIS data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint to search GIS points within a radius
router.get('/gisdata/search/radius', cacheMiddleware(300), async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    
    if (!lat || !lng || !radius) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const points = await getGISPointsWithinRadius(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    );
    
    res.json({
      success: true,
      count: points.length,
      data: points
    });
  } catch (error) {
    console.error('Error searching GIS data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint to unlock GIS data access via Kafka
router.post('/gisdata/unlock/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    
    // Send a message to Kafka to trigger the unlock process
    await sendMessage('gis-data-access', {
      action: 'unlock',
      dataId: id,
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: `Unlock process initiated for GIS data ${id}`
    });
  } catch (error) {
    console.error('Error unlocking GIS data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User authentication endpoint that returns a JWT token (90Auth)
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Mock authentication - in production, validate against database
  if (username === 'demo' && password === 'password') {
    const token = jwt.sign(
      { id: 1, username: 'demo', role: 'user' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    return res.json({
      success: true,
      token
    });
  }
  
  res.status(401).json({ error: 'Invalid credentials' });
});

module.exports = router;
