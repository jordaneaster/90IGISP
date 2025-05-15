const { createClient } = require('@supabase/supabase-js');
const config = require('../config/config');

// Check if Supabase config exists
if (!config.supabase?.url || !config.supabase?.key) {
  console.error('ERROR: Supabase configuration is missing or incomplete');
  console.error('Please set SUPABASE_URL and SUPABASE_KEY environment variables');
  console.error('or update the values in src/config/config.js');
  process.exit(1); // Exit with error
}

// Create Supabase client
const supabase = createClient(config.supabase.url, config.supabase.key);

// Helper function for PostGIS operations
const gisHelpers = {
  makePoint: (lng, lat) => `POINT(${lng} ${lat})`,
  makePolygon: (points) => {
    // Format for PostGIS polygon: ((x1 y1, x2 y2, ..., x1 y1))
    const coordStr = points.map(p => `${p.lng} ${p.lat}`).join(',');
    return `POLYGON((${coordStr}))`;
  }
};

module.exports = {
  supabase,
  gisHelpers
};
