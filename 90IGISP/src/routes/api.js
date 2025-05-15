const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { supabase, gisHelpers } = require('../services/supabase');
const { sendMessage } = require('../services/kafka');
const crsEngine = require('../services/crs');
const costCalculator = require('../services/costCalculator');
const cacheMiddleware = require('../middleware/cache');
const config = require('../config/config');
const trackingRoutes = require('./tracking');

/**
 * API Routes
 * Defines REST endpoints for the 90IGISP system
 */

// Mount tracking routes
router.use('/tracking', trackingRoutes);

// Sample endpoint to get GIS data with caching (cache for 5 minutes)
router.get('/gisdata/:id', cacheMiddleware(300), async (req, res) => {
  try {
    const id = req.params.id;
    
    const { data: gisPoint, error } = await supabase
      .from('gis_points')
      .select('id, name, properties')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'GIS point not found' });
      }
      throw error;
    }
    
    // Get GeoJSON from PostGIS
    const { data: geojson, error: geoError } = await supabase
      .rpc('get_geojson_for_point', { point_id: id });
    
    if (geoError) throw geoError;
    
    gisPoint.geojson = geojson;
    
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
    
    const { data: points, error } = await supabase
      .rpc('points_within_radius', {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_meters: parseFloat(radius)
      });
    
    if (error) throw error;
    
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

// CRS Load Matching endpoint
router.post('/crs/match', async (req, res) => {
  try {
    const shipmentRequest = req.body;
    
    if (!shipmentRequest.origin || !shipmentRequest.destination || !shipmentRequest.weight) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required shipment details' 
      });
    }
    
    const matchResult = await crsEngine.findMatchingLoads(shipmentRequest);
    
    res.json({
      success: true,
      data: matchResult
    });
  } catch (error) {
    console.error('Error in CRS load matching:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// CRS Cost breakdown for a shipment
router.get('/crs/costs/:shipmentId', cacheMiddleware(300), async (req, res) => {
  try {
    const { shipmentId } = req.params;
    
    const costBreakdown = await costCalculator.getCostBreakdown(shipmentId);
    
    res.json({
      success: true,
      data: costBreakdown
    });
  } catch (error) {
    console.error('Error fetching cost breakdown:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User authentication endpoints (90Auth)
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }
    
    // Mock authentication - in production, validate against database
    if (username === 'demo' && password === 'password') {
      const token = jwt.sign(
        { id: 1, username: 'demo', role: 'user' },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      
      return res.json({
        success: true,
        token,
        user: { id: 1, username: 'demo', role: 'user' }
      });
    }
    
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error during authentication' });
  }
});

// Verify token validity
router.get('/verify-token', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    
    res.json({
      success: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      },
      tokenExpiration: new Date(decoded.exp * 1000)
    });
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, password, and email are required' 
      });
    }
    
    // In a real application, check if username already exists
    // and securely hash the password before storing
    
    // Mock successful registration
    // In a real application, store user in database
    const newUser = { id: Date.now(), username, email, role: 'user' };
    
    // Generate token for automatic login
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
});

module.exports = router;
