const express = require('express');
const router = express.Router();
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
    const cacheKey = `tracking:latest:${shipmentId}`;
    await redisClient.setEx(cacheKey, 3600, JSON.stringify({
      id: data.id,
      shipmentId: data.shipment_id,
      lat,
      lng,
      metadata: data.metadata,
      timestamp: data.created_at
    }));
    
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
    
    // Try to get from cache first
    const cacheKey = `tracking:latest:${shipmentId}`;
    const cachedLocation = await redisClient.get(cacheKey);
    
    if (cachedLocation) {
      return res.json({
        success: true,
        data: JSON.parse(cachedLocation),
        source: 'cache'
      });
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
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(locationData));
    
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

module.exports = router;
