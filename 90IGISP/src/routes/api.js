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
