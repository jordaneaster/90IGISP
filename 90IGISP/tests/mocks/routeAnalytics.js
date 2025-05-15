// Mock for Route Analytics Service

const routeAnalytics = {
  getRouteEfficiencyMetrics: jest.fn().mockResolvedValue({
    routeId: '1',
    totalDistance: 3800000, // meters
    fuelConsumption: 850.5, // liters
    co2Emissions: 2450.75, // kg
    timeEstimate: 42.5, // hours
    costPerMile: 2.65 // dollars
  }),
  
  calculateOptimalRoute: jest.fn().mockResolvedValue({
    points: [
      { lat: 37.7749, lng: -122.4194 }, // San Francisco
      { lat: 39.5501, lng: -105.7821 }, // Denver area
      { lat: 41.8781, lng: -87.6298 }, // Chicago
      { lat: 40.7128, lng: -74.0060 }  // New York
    ],
    distanceInMeters: 3800000,
    durationInSeconds: 153000, // ~42.5 hours
    encodedPolyline: "abc123" // This would be a real polyline in production
  }),
  
  getFuelEfficiency: jest.fn().mockResolvedValue({
    mpg: 6.5, // miles per gallon for a typical truck
    kpl: 2.8, // km per liter equivalent
  })
};

module.exports = routeAnalytics;
