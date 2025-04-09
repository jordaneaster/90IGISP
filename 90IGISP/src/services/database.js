const { Pool } = require('pg');
const config = require('../config/config');

/**
 * PostgreSQL/PostGIS Database Service
 * Handles connections and queries to the spatial database
 */
const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
});

// Test connection and PostGIS extension on startup
pool.query('SELECT PostGIS_Version()')
  .then(result => {
    console.log(`Connected to PostgreSQL with PostGIS version: ${result.rows[0].postgis_version}`);
  })
  .catch(err => {
    console.error('PostgreSQL/PostGIS connection error:', err);
  });

/**
 * Fetch a GIS point by ID
 * @param {number} id - Point ID to fetch
 * @returns {Object} GIS point data with GeoJSON
 */
async function getGISPoint(id) {
  try {
    const query = `
      SELECT id, name, ST_AsGeoJSON(geom) AS geojson, properties
      FROM gis_points 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) return null;
    
    const point = result.rows[0];
    // Parse GeoJSON string to object
    point.geojson = JSON.parse(point.geojson);
    
    return point;
  } catch (error) {
    console.error('Error fetching GIS point:', error);
    throw error;
  }
}

/**
 * Fetch GIS points within a radius
 * @param {number} lat - Latitude of center point
 * @param {number} lng - Longitude of center point
 * @param {number} radiusInMeters - Search radius in meters
 * @returns {Array} Array of GIS points within radius
 */
async function getGISPointsWithinRadius(lat, lng, radiusInMeters) {
  try {
    const query = `
      SELECT id, name, ST_AsGeoJSON(geom) AS geojson, properties,
             ST_Distance(
               geom,
               ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
             ) AS distance
      FROM gis_points
      WHERE ST_DWithin(
        geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ORDER BY distance
    `;
    const result = await pool.query(query, [lng, lat, radiusInMeters]);
    
    return result.rows.map(row => {
      row.geojson = JSON.parse(row.geojson);
      return row;
    });
  } catch (error) {
    console.error('Error fetching GIS points within radius:', error);
    throw error;
  }
}

module.exports = {
  pool,
  getGISPoint,
  getGISPointsWithinRadius
};
