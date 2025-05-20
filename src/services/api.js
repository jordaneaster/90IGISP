import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock data for development
const MOCK_MODE = true; // Set to false when real backend is ready

// Mock data handlers
const getMockData = (type) => {
  switch (type) {
    case 'vehicles':
      return {
        success: true,
        data: [
          {
            id: '1',
            year: '2022',
            make: 'Ford',
            model: 'F-150',
            vin: 'VIN123456',
            status: 'available',
            location: 'Main Lot',
            location_lat: 37.7749,
            location_lng: -122.4194,
            color: 'Black',
            lastMovement: {
              by: 'John Doe',
              date: new Date().toISOString()
            }
          },
          {
            id: '2',
            year: '2021',
            make: 'Toyota',
            model: 'Tacoma',
            vin: 'VIN789012',
            status: 'leased',
            location: 'Overflow Lot',
            location_lat: 37.7739,
            location_lng: -122.4184,
            color: 'Silver',
            lastMovement: {
              by: 'Jane Smith',
              date: new Date().toISOString()
            }
          }
        ]
      };
    case 'routes':
      return {
        success: true,
        data: [
          {
            id: '1',
            name: 'Route 1',
            status: 'active',
            origin: 'San Francisco',
            destination: 'Los Angeles',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 86400000).toISOString(),
            waypoints: [
              { lat: 37.7749, lng: -122.4194, name: 'San Francisco' },
              { lat: 35.3733, lng: -119.0187, name: 'Bakersfield' },
              { lat: 34.0522, lng: -118.2437, name: 'Los Angeles' }
            ]
          },
          {
            id: '2',
            name: 'Route 2',
            status: 'completed',
            origin: 'New York',
            destination: 'Boston',
            startDate: new Date(Date.now() - 86400000).toISOString(),
            endDate: new Date().toISOString(),
            waypoints: [
              { lat: 40.7128, lng: -74.0060, name: 'New York' },
              { lat: 42.3601, lng: -71.0589, name: 'Boston' }
            ]
          }
        ]
      };
    case 'traccarDevices':
      return {
        success: true,
        data: [
          {
            id: 1,
            name: 'Truck 101',
            uniqueId: 'VIN101',
            status: 'online',
            lastUpdate: new Date().toISOString(),
            latitude: 37.7735,
            longitude: -122.4165
          },
          {
            id: 2,
            name: 'Truck 102',
            uniqueId: 'VIN102',
            status: 'offline',
            lastUpdate: new Date(Date.now() - 86400000).toISOString(),
            latitude: 37.7845,
            longitude: -122.4075
          }
        ]
      };
    case 'traccarPositions':
      return {
        success: true,
        data: [
          {
            id: 1,
            deviceId: 1,
            latitude: 37.7735,
            longitude: -122.4165,
            speed: 0,
            deviceTime: new Date().toISOString(),
            fixTime: new Date().toISOString()
          }
        ]
      };
    default:
      return { success: false, error: 'Unknown mock data type' };
  }
};

const apiService = {
  // Auth endpoints
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  
  // Vehicle endpoints
  getVehicles: () => {
    if (MOCK_MODE) {
      const mockVehicles = getMockData('vehicles').data;
      const importedVehicles = JSON.parse(localStorage.getItem('importedVehicles') || '[]');
      return Promise.resolve({ data: { success: true, data: [...mockVehicles, ...importedVehicles] } });
    }
    return apiClient.get('/vehicles');
  },
  getVehicle: (id) => {
    if (MOCK_MODE) {
      const allVehicles = [...getMockData('vehicles').data, ...JSON.parse(localStorage.getItem('importedVehicles') || '[]')];
      const vehicle = allVehicles.find(v => v.id === id);
      return Promise.resolve({ data: { success: true, data: vehicle || null }});
    }
    return apiClient.get(`/vehicles/${id}`);
  },
  updateVehicle: (id, data) => apiClient.patch(`/vehicles/${id}`, data),
  getVehicleByCode: (code) => apiClient.get(`/vehicles/scan/${code}`),
  
  // Route endpoints
  getRoutes: () => {
    if (MOCK_MODE) return Promise.resolve({ data: getMockData('routes') });
    return apiClient.get('/routes');
  },
  getRoute: (id) => {
    if (MOCK_MODE) {
      const allRoutes = getMockData('routes').data;
      const route = allRoutes.find(r => r.id === id);
      return Promise.resolve({ data: { success: true, data: route || null }});
    }
    return apiClient.get(`/routes/${id}`);
  },
  createRoute: (data) => apiClient.post('/routes', data),
  updateRoute: (id, data) => apiClient.patch(`/routes/${id}`, data),
  
  // Tracking endpoints
  recordLocation: (data) => apiClient.post('/tracking', data),
  getLatestLocation: (shipmentId) => apiClient.get(`/tracking/${shipmentId}/latest`),
  getLocationHistory: (shipmentId, params) => apiClient.get(`/tracking/${shipmentId}/history`, { params }),
  
  // Traccar endpoints
  getTraccarDevices: () => {
    if (MOCK_MODE) return Promise.resolve({ data: getMockData('traccarDevices') });
    return apiClient.get('/tracking/devices');
  },
  getTraccarPositions: (deviceId) => {
    if (MOCK_MODE) return Promise.resolve({ data: getMockData('traccarPositions') });
    return apiClient.get(`/tracking/devices/${deviceId}/positions`);
  },
  getDeviceByVin: (vin) => {
    if (MOCK_MODE) {
      const allDevices = getMockData('traccarDevices').data;
      const device = allDevices.find(d => d.uniqueId === vin);
      return Promise.resolve({ data: { success: true, data: device || null }});
    }
    return apiClient.get(`/tracking/devices/vin/${vin}`);
  },
  createTraccarDevice: (data) => {
    if (MOCK_MODE) {
      return Promise.resolve({ 
        data: { 
          success: true, 
          data: {
            id: Math.floor(Math.random() * 1000),
            name: data.name,
            uniqueId: data.uniqueId,
            status: 'created',
            lastUpdate: new Date().toISOString()
          }
        }
      });
    }
    return apiClient.post('/tracking/devices', data);
  },
  
  // Onboarding endpoints
  parseFile: (fileData) => {
    if (MOCK_MODE) {
      // Simulate file parsing with mock data
      const mockParsedData = [];
      const fieldsMap = {
        csv: {
          'Vehicle_ID': 'vin',
          'Manufacturer': 'make',
          'Model': 'model',
          'Year': 'year',
          'Color': 'color',
          'Current_Status': 'status',
          'Current_Location': 'location',
          'Latitude': 'location_lat',
          'Longitude': 'location_lng'
        },
        json: {
          'vehicleId': 'vin',
          'manufacturer': 'make',
          'model': 'model',
          'modelYear': 'year',
          'exteriorColor': 'color',
          'inventoryStatus': 'status',
          'dealerLocation': 'location',
          'gpsLatitude': 'location_lat',
          'gpsLongitude': 'location_lng'  
        },
        excel: {
          'VIN': 'vin',
          'Make': 'make',
          'Model': 'model',
          'Year': 'year',
          'Color': 'color',
          'Status': 'status',
          'Lot': 'location',
          'Lat': 'location_lat',
          'Lng': 'location_lng'
        }
      };
      
      // Generate random number of vehicles (between 15-30)
      const numVehicles = Math.floor(Math.random() * 15) + 15;
      
      // Choose a random file type
      const fileTypes = ['csv', 'json', 'excel'];
      const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
      const fields = Object.keys(fieldsMap[fileType]);
      
      // Generate more valid VINs
      const validVins = [
        "1HGCM82633A123456", "WBAPM7339AE111111", "5XYKT3A17CG222222",
        "JN8AS5MT4CW444444", "1FT8W3BT2LEC33333", "3VWDX7AJ5BM012345",
        "19UYA31581L000000", "WAUAF78E45A000000", "JH4KB16565C000000",
        "1G1JC524417000000", "SAJWA0HEXDMS00000", "2LMTJ8JP7GBL00000"
      ];
      
      // Generate mock data
      for (let i = 0; i < numVehicles; i++) {
        const mockItem = {};
        fields.forEach(field => {
          // Generate values based on field name
          if (field.toLowerCase().includes('vin') || field.toLowerCase().includes('vehicle')) {
            // Make at least half of VINs valid
            if (i < validVins.length) {
              mockItem[field] = validVins[i];
            } else {
              mockItem[field] = `V${Math.floor(100000 + Math.random() * 900000)}`;
            }
          } else if (field.toLowerCase().includes('make') || field.toLowerCase().includes('manufacturer')) {
            const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes'];
            mockItem[field] = makes[Math.floor(Math.random() * makes.length)];
          } else if (field.toLowerCase().includes('model')) {
            const models = ['Camry', 'Civic', 'F-150', 'Silverado', '3 Series', 'C-Class'];
            mockItem[field] = models[Math.floor(Math.random() * models.length)];
          } else if (field.toLowerCase().includes('year')) {
            mockItem[field] = 2018 + Math.floor(Math.random() * 6); // 2018-2023
          } else if (field.toLowerCase().includes('color')) {
            const colors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Green'];
            mockItem[field] = colors[Math.floor(Math.random() * colors.length)];
          } else if (field.toLowerCase().includes('status')) {
            const statuses = ['available', 'leased', 'service', 'sold'];
            mockItem[field] = statuses[Math.floor(Math.random() * statuses.length)];
          } else if (field.toLowerCase().includes('location') && !field.toLowerCase().includes('lat') && !field.toLowerCase().includes('lng')) {
            const locations = ['Main Lot', 'Overflow Lot', 'Service Center', 'Downtown Showroom'];
            mockItem[field] = locations[Math.floor(Math.random() * locations.length)];
          } else if (field.toLowerCase().includes('lat')) {
            mockItem[field] = (37.7749 + (Math.random() - 0.5) * 0.1).toFixed(6);
          } else if (field.toLowerCase().includes('lng') || field.toLowerCase().includes('long')) {
            mockItem[field] = (-122.4194 + (Math.random() - 0.5) * 0.1).toFixed(6);
          } else {
            mockItem[field] = `Value ${i} for ${field}`;
          }
        });
        mockParsedData.push(mockItem);
      }
      
      return Promise.resolve({ 
        data: { 
          success: true, 
          data: mockParsedData,
          suggestedMapping: fieldsMap[fileType]
        } 
      });
    }
    return apiClient.post('/onboarding/parse', fileData);
  },
  
  importVehicles: (vehicleData) => {
    if (MOCK_MODE) {
      // Store imported vehicles in localStorage for the demo
      try {
        const existingVehicles = JSON.parse(localStorage.getItem('importedVehicles') || '[]');
        
        // Add a unique ID to each vehicle
        const vehiclesWithIds = vehicleData.map(vehicle => ({
          ...vehicle,
          id: `imp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          // Add default values for any missing fields
          status: vehicle.status || 'available',
          color: vehicle.color || 'Not specified',
          location: vehicle.location || 'Main Lot',
          location_lat: vehicle.location_lat || 37.7749,
          location_lng: vehicle.location_lng || -122.4194,
          lastMovement: {
            by: 'Import Process',
            date: new Date().toISOString()
          }
        }));
        
        // Save to localStorage
        const updatedVehicles = [...existingVehicles, ...vehiclesWithIds];
        localStorage.setItem('importedVehicles', JSON.stringify(updatedVehicles));
      
        // Simulate import with mock results
        const totalCount = vehicleData.length;
        const successCount = vehiclesWithIds.length;
        const failCount = totalCount - successCount;
        
        // Generate mock warnings (no errors since we stored everything)
        const mockWarnings = [];
        const warningCount = Math.floor(Math.random() * 3);
        for (let i = 0; i < warningCount; i++) {
          mockWarnings.push({
            row: Math.floor(Math.random() * totalCount) + 1,
            message: `Warning while importing`,
            details: `Non-critical issue with ${['color', 'location', 'status'][Math.floor(Math.random() * 3)]} field`
          });
        }
        
        return Promise.resolve({ 
          data: { 
            success: true, 
            imported: successCount,
            failed: failCount,
            errors: [],
            warnings: mockWarnings,
            timestamp: new Date().toISOString()
          } 
        });
      } catch (err) {
        console.error('Error saving imported vehicles:', err);
        return Promise.resolve({ 
          data: { 
            success: false,
            error: 'Failed to import vehicles'
          } 
        });
      }
    }
    return apiClient.post('/onboarding/import', vehicleData);
  },
  
  getImportedVehicles: () => {
    try {
      const importedVehicles = JSON.parse(localStorage.getItem('importedVehicles') || '[]');
      return Promise.resolve({ 
        data: { 
          success: true, 
          data: importedVehicles 
        } 
      });
    } catch (err) {
      console.error('Error retrieving imported vehicles:', err);
      return Promise.resolve({ 
        data: { 
          success: false, 
          error: 'Failed to retrieve imported vehicles',
          data: []
        } 
      });
    }
  },

  getImportHistory: () => {
    if (MOCK_MODE) {
      // Mock import history
      const mockHistory = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        mockHistory.push({
          id: `import-${i}`,
          filename: `vehicles-import-${i}.${['csv', 'xlsx', 'json'][i % 3]}`,
          timestamp: date.toISOString(),
          status: i === 0 ? 'completed' : i === 1 ? 'completed_with_errors' : 'completed',
          total: 20 + i,
          imported: 20 + i - (i === 1 ? 2 : 0),
          failed: i === 1 ? 2 : 0
        });
      }
      
      return Promise.resolve({
        data: {
          success: true,
          data: mockHistory
        }
      });
    }
    return apiClient.get('/onboarding/history');
  }
};

export default apiService;
