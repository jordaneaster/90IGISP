const express = require('express');
const router = express.Router();
const traccar = require('../services/traccar');
const { supabase, gisHelpers } = require('../services/supabase');
const redisClient = require('../services/redis');

/**
 * Geospatial Tracking API
 * Handles location tracking for shipments
 */

// Record a new location ping
router.post('/', async (req, res) => {
  try {
    const {
      shipmentId,
      lat,
      lng,
      metadata = {}
    } = req.body;
    
    if (!shipmentId || !lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: shipmentId, lat, lng'
      });
    }
    
    // Insert using Supabase with PostGIS
    const { data, error } = await supabase
      .from('tracking_events')
      .insert({
        shipment_id: shipmentId,
        location: gisHelpers.makePoint(lng, lat),
        metadata
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error recording tracking event:', error);
      throw error;
    }
    
    // Cache the most recent location for this shipment
    try {
      const cacheKey = `tracking:latest:${shipmentId}`;
      await redisClient.setEx(cacheKey, 3600, JSON.stringify({
        id: data.id,
        shipmentId: data.shipment_id,
        lat,
        lng,
        metadata: data.metadata,
        timestamp: data.created_at
      }));
    } catch (cacheError) {
      console.log('Redis caching error (non-critical):', cacheError.message);
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        shipmentId: data.shipment_id,
        lat,
        lng,
        metadata: data.metadata,
        timestamp: data.created_at
      }
    });
  } catch (error) {
    console.error('Tracking API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record location'
    });
  }
});

// Get last known location for a shipment
router.get('/:shipmentId/latest', async (req, res) => {
  try {
    const { shipmentId } = req.params;
    let usedCache = false;
    
    // Try to get from cache first
    try {
      const cacheKey = `tracking:latest:${shipmentId}`;
      const cachedLocation = await redisClient.get(cacheKey);
      
      if (cachedLocation) {
        usedCache = true;
        return res.json({
          success: true,
          data: JSON.parse(cachedLocation),
          source: 'cache'
        });
      }
    } catch (cacheError) {
      console.log('Redis get error (falling back to database):', cacheError.message);
    }
    
    // If not in cache, query the database
    const { data, error } = await supabase
      .from('tracking_events')
      .select(`
        id,
        shipment_id,
        metadata,
        created_at
      `)
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'No tracking data found for this shipment'
        });
      }
      throw error;
    }
    
    // Get lat/lng from PostGIS
    const { data: coordinates, error: coordError } = await supabase
      .rpc('get_tracking_coordinates', { event_id: data.id });
    
    if (coordError) throw coordError;
    
    const locationData = {
      id: data.id,
      shipmentId: data.shipment_id,
      lat: coordinates.lat,
      lng: coordinates.lng,
      metadata: data.metadata,
      timestamp: data.created_at
    };
    
    // Cache for next time
    try {
      const cacheKey = `tracking:latest:${shipmentId}`;
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(locationData));
    } catch (cacheError) {
      console.log('Redis cache error (non-critical):', cacheError.message);
    }
    
    res.json({
      success: true,
      data: locationData,
      source: 'database'
    });
  } catch (error) {
    console.error('Tracking API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve location data'
    });
  }
});

// Get location history for a shipment
router.get('/:shipmentId/history', async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { limit = 100, from, to } = req.query;
    
    // Build query
    let query = supabase
      .from('tracking_events')
      .select('id, shipment_id, metadata, created_at')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: true })
      .limit(parseInt(limit));
    
    // Add time filters if provided
    if (from) {
      query = query.gte('created_at', from);
    }
    if (to) {
      query = query.lte('created_at', to);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Get coordinates for each event
    const history = await Promise.all(data.map(async (event) => {
      const { data: coords, error } = await supabase
        .rpc('get_tracking_coordinates', { event_id: event.id });
      
      if (error) throw error;
      
      return {
        id: event.id,
        shipmentId: event.shipment_id,
        lat: coords.lat,
        lng: coords.lng,
        metadata: event.metadata,
        timestamp: event.created_at
      };
    }));
    
    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Tracking history API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve location history'
    });
  }
});

// List all tracked devices (trucks) from Traccar
router.get('/devices', async (req, res) => {
  try {
    const devices = await traccar.getDevices();
    
    // If we get null or [] from the service
    if (!devices || (Array.isArray(devices) && devices.length === 0)) {
      return res.json({ 
        success: true, 
        data: [],
        message: "No devices found or connection issue with Traccar"
      });
    }
    
    // Add location coordinates to each device for easier mapping
    const devicesWithPositions = await Promise.all(devices.map(async (device) => {
      try {
        // Get latest position for this device
        const positions = await traccar.getDevicePositions(device.id);
        if (positions && positions.length > 0) {
          const latestPosition = positions[0];
          return {
            ...device,
            latitude: latestPosition.latitude,
            longitude: latestPosition.longitude,
            altitude: latestPosition.altitude,
            speed: latestPosition.speed,
            course: latestPosition.course
          };
        }
        return device;
      } catch (err) {
        console.error(`Error fetching position for device ${device.id}:`, err.message);
        return device;
      }
    }));
    
    res.json({ success: true, data: devicesWithPositions });
  } catch (err) {
    console.error('Error fetching Traccar devices:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch devices',
      message: err.message
    });
  }
});

// Get latest position for one device
router.get('/devices/:id/positions', async (req, res) => {
  try {
    const positions = await traccar.getDevicePositions(req.params.id);
    
    if (!positions || positions.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        message: "No positions found for this device"
      });
    }
    
    res.json({ success: true, data: positions });
  } catch (err) {
    console.error('Error fetching Traccar positions:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch positions',
      message: err.message
    });
  }
});

/* Create a fake device in Traccar (useful for prototyping).
 * Body: { name: string, uniqueId: string }
 */
router.post('/devices', async (req, res) => {
  try {
    const { name, uniqueId } = req.body;
    if (!name || !uniqueId) {
      return res.status(400).json({ success: false, error: 'name and uniqueId required' });
    }
    
    const device = await traccar.createDevice({ name, uniqueId });
    
    if (!device) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create device in Traccar',
        message: "No response from Traccar server"
      });
    }
    
    res.status(201).json({ success: true, data: device });
  } catch (err) {
    console.error('Error creating Traccar device:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create device',
      message: err.message
    });
  }
});

/**
 * Lookup a single device by its VIN (uniqueId).
 */
router.get('/devices/vin/:vin', async (req, res) => {
  try {
    const vin = req.params.vin;
    const device = await traccar.getDeviceByVin(vin);
    
    if (!device) {
      return res.status(404).json({ success: false, error: `Device VIN ${vin} not found` });
    }
    
    // Get latest position
    let position = null;
    try {
      const positions = await traccar.getDevicePositions(device.id);
      if (positions && positions.length > 0) {
        position = positions[0];
        device.latitude = position.latitude;
        device.longitude = position.longitude;
      }
    } catch (posErr) {
      console.error(`Error fetching position for device ${device.id}:`, posErr.message);
    }
    
    res.json({ success: true, data: device, position });
  } catch (err) {
    console.error('Error looking up device by VIN:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Lookup failed',
      message: err.message
    });
  }
});

module.exports = router;
