const { supabase, gisHelpers } = require('../../../src/services/supabase');

// Mock the config module
jest.mock('../../../src/config/config', () => ({
  supabase: {
    url: 'https://test.supabase.co',
    key: 'test-key'
  }
}));

describe('Supabase Service', () => {
  test('supabase client should be initialized', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });

  describe('gisHelpers', () => {
    test('makePoint should create a PostGIS point string', () => {
      const point = gisHelpers.makePoint(-122.4194, 37.7749);
      expect(point).toBe('POINT(-122.4194 37.7749)');
    });

    test('toGeography should chain RPC calls correctly', async () => {
      const result = gisHelpers.toGeography(-122.4194, 37.7749);
      expect(result).toBeDefined();
    });

    test('calculateDistance should return distance between two points', async () => {
      const point1 = { lat: 37.7749, lng: -122.4194 }; // San Francisco
      const point2 = { lat: 40.7128, lng: -74.0060 }; // New York
      
      const distance = await gisHelpers.calculateDistance(point1, point2);
      
      // Should return a distance (mocked)
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(0);
    });

    test('findWithinRadius should return points in the radius', async () => {
      const lat = 37.7749;
      const lng = -122.4194;
      const radius = 5000; // 5km
      
      const points = await gisHelpers.findWithinRadius(
        lat, lng, radius, 'gis_points', 'geom'
      );
      
      expect(Array.isArray(points)).toBe(true);
      expect(points.length).toBeGreaterThan(0);
    });
  });
});
