-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  revenue_bracket INT NOT NULL CHECK (revenue_bracket BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin GEOGRAPHY(POINT, 4326) NOT NULL,
  destination GEOGRAPHY(POINT, 4326) NOT NULL,
  weight NUMERIC NOT NULL,
  company_id UUID REFERENCES companies(id),
  industry TEXT NOT NULL,
  revenue_bracket INT NOT NULL CHECK (revenue_bracket BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRS load groups table
CREATE TABLE IF NOT EXISTS crs_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_ids UUID[] NOT NULL,
  total_weight NUMERIC NOT NULL,
  route_linestring GEOGRAPHY(LINESTRING, 4326),
  distance_meters NUMERIC,
  total_cost NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking events table
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost splits table
CREATE TABLE IF NOT EXISTS cost_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id),
  company_id UUID REFERENCES companies(id),
  group_id UUID REFERENCES crs_groups(id),
  cost NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GIS Points table (for general geospatial data)
CREATE TABLE IF NOT EXISTS gis_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  geom GEOGRAPHY(POINT, 4326) NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_shipments_origin ON shipments USING GIST (origin);
CREATE INDEX IF NOT EXISTS idx_shipments_destination ON shipments USING GIST (destination);
CREATE INDEX IF NOT EXISTS idx_tracking_events_location ON tracking_events USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_gis_points_geom ON gis_points USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_crs_groups_route ON crs_groups USING GIST (route_linestring);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment_id ON tracking_events (shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipments_company_id ON shipments (company_id);
CREATE INDEX IF NOT EXISTS idx_cost_splits_shipment_id ON cost_splits (shipment_id);
CREATE INDEX IF NOT EXISTS idx_cost_splits_group_id ON cost_splits (group_id);

-- Create function to get tracking coordinates
CREATE OR REPLACE FUNCTION get_tracking_coordinates(event_id UUID)
RETURNS TABLE(lat DOUBLE PRECISION, lng DOUBLE PRECISION) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Y(ST_AsText(location::geometry)) AS lat,
    ST_X(ST_AsText(location::geometry)) AS lng
  FROM tracking_events
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get points within radius
CREATE OR REPLACE FUNCTION points_within_radius(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geojson JSONB,
  properties JSONB,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    ST_Y(ST_AsText(p.geom::geometry)) AS lat,
    ST_X(ST_AsText(p.geom::geometry)) AS lng,
    ST_AsGeoJSON(p.geom)::jsonb AS geojson,
    p.properties,
    ST_Distance(
      p.geom,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance
  FROM gis_points p
  WHERE ST_DWithin(
    p.geom,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance;
END;
$$ LANGUAGE plpgsql;

-- Create function to get GeoJSON for a point
CREATE OR REPLACE FUNCTION get_geojson_for_point(point_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT ST_AsGeoJSON(geom)::jsonb INTO result
  FROM gis_points
  WHERE id = point_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to find shipments within a route buffer
CREATE OR REPLACE FUNCTION within_route_buffer(
  o_lat DOUBLE PRECISION,
  o_lng DOUBLE PRECISION,
  d_lat DOUBLE PRECISION,
  d_lng DOUBLE PRECISION,
  buffer_meters DOUBLE PRECISION
)
RETURNS SETOF shipments AS $$
DECLARE
  route_line GEOGRAPHY;
BEGIN
  -- Create a line from origin to destination
  route_line := ST_MakeLine(
    ST_SetSRID(ST_MakePoint(o_lng, o_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(d_lng, d_lat), 4326)::geography
  );
  
  RETURN QUERY
  SELECT s.*
  FROM shipments s
  WHERE 
    -- Origin is within buffer of the route start point
    ST_DWithin(
      s.origin,
      ST_SetSRID(ST_MakePoint(o_lng, o_lat), 4326)::geography,
      buffer_meters
    )
    AND
    -- Destination is within buffer of the route end point
    ST_DWithin(
      s.destination,
      ST_SetSRID(ST_MakePoint(d_lng, d_lat), 4326)::geography,
      buffer_meters
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate route metrics
CREATE OR REPLACE FUNCTION calculate_route_metrics(route_id UUID)
RETURNS TABLE(
  distance_meters DOUBLE PRECISION,
  total_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ST_Length(route_linestring), 0) AS distance_meters,
    COALESCE(total_cost, 0) AS total_cost
  FROM crs_groups
  WHERE id = route_id;
END;
$$ LANGUAGE plpgsql;
