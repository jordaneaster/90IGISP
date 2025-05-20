const axios = require('axios');

const TRACCAR_BASE_URL = process.env.TRACCAR_BASE_URL || 'https://demo.traccar.org/api';
const AUTH = {
  username: process.env.TRACCAR_USERNAME || 'demo',
  password: process.env.TRACCAR_PASSWORD  || 'demo'
};

// Axios instance with auth and retry logic
const traccarClient = axios.create({
  baseURL: TRACCAR_BASE_URL,
  auth: AUTH,
  timeout: 10000
});

// Implement exponential backoff retry logic
traccarClient.interceptors.response.use(undefined, async (err) => {
  const { config, response = {} } = err;
  
  // Track retry count in the config
  config.retryCount = config.retryCount || 0;
  
  // Only retry on auth errors and if we haven't already tried 3 times
  if (response.status === 401 && config.retryCount < 3) {
    config.retryCount += 1;
    
    // Wait exponentially longer between retries
    const delay = Math.pow(2, config.retryCount) * 1000;
    
    // Log retry attempt
    console.log(`Retry attempt ${config.retryCount} for Traccar request after ${delay}ms`);
    
    return new Promise(resolve => {
      setTimeout(() => resolve(traccarClient(config)), delay);
    });
  }
  
  return Promise.reject(err);
});

// Handle API response safely
const safeApiCall = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('Traccar API error:', error.message);
    
    // Return empty data on error instead of throwing
    if (Array.isArray(error.config?.__expectedArrayResponse)) {
      return [];
    }
    return null;
  }
};

/**
 * Fetch all devices.
 */
async function getDevices() {
  return safeApiCall(async () => {
    const config = { __expectedArrayResponse: true };
    const res = await traccarClient.get(`/devices`, config);
    return res.data;
  });
}

/**
 * Fetch positions for a given device.
 */
async function getDevicePositions(deviceId) {
  return safeApiCall(async () => {
    const config = { __expectedArrayResponse: true };
    const res = await traccarClient.get(`/positions?deviceId=${deviceId}`, config);
    return res.data;
  });
}

/**
 * Create a new device.
 * @param {Object} payload e.g. { name: 'My Truck', uniqueId: 'VIN123' }
 */
async function createDevice(payload) {
  return safeApiCall(async () => {
    const res = await traccarClient.post('/devices', payload);
    return res.data;
  });
}

/**
 * Find a device by VIN/uniqueId.
 */
async function getDeviceByVin(vin) {
  return safeApiCall(async () => {
    const all = await getDevices();
    return all.find(d => String(d.uniqueId) === String(vin));
  });
}

module.exports = {
  getDevices,
  getDevicePositions,
  createDevice,
  getDeviceByVin
};
