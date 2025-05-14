const { createClient } = require('@supabase/supabase-js');
const config = require('../config/config');

/**
 * Supabase Client Service
 * Handles interactions with Supabase (PostgreSQL + PostGIS)
 */
const supabase = createClient(
  config.supabase.url,
  config.supabase.key
);

// Helper functions for PostGIS operations
const gisHelpers = {
  /**
   * Create a PostGIS point from lat/lng
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {string} PostGIS point string
   */
  makePoint: (lng, lat) => `POINT(${lng} ${lat})`,
  
  /**
   * Convert lat/lng to PostGIS geography
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {object} SQL query object for geography
   */
  toGeography: (lng, lat) => 
    supabase.rpc('st_makepoint', { xcoord: lng, ycoord: lat })
      .rpc('st_setsrid', { geom: 'ST_MakePoint', srid: 4326 })
      .rpc('st_transform', { geom: 'ST_SetSRID', srid: 4326 }),
  
  /**
   * Calculate distance between two points
   * @param {object} point1 - {lat, lng}
   * @param {object} point2 - {lat, lng}
   * @returns {Promise<number>} Distance in meters
   */
  calculateDistance: async (point1, point2) => {
    const { data, error } = await supabase.rpc('calculate_distance', {
      lat1: point1.lat,
      lng1: point1.lng,
      lat2: point2.lat,
      lng2: point2.lng
    });
    
    if (error) throw error;
    return data;
  },
  
  /**
   * Find points within a radius
   * @param {number} lat - Latitude of center
   * @param {number} lng - Longitude of center
   * @param {number} radiusInMeters - Search radius
   * @param {string} table - Table name to search
   * @param {string} geomColumn - Geography column name
   * @returns {Promise<Array>} Array of matching records
   */
  findWithinRadius: async (lat, lng, radiusInMeters, table, geomColumn) => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .rpc('nearby_points', {
        lat,
        lng,
        distance: radiusInMeters,
        geom_column: geomColumn
      });
      
    if (error) throw error;
    return data;
  }
};

module.exports = {
  supabase,
  gisHelpers
};
