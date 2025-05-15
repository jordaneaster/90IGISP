// Mock for Redis client

// In-memory cache store
const cacheStore = {};

const redisClient = {
  // Set with expiration
  setEx: jest.fn().mockImplementation((key, ttl, value) => {
    cacheStore[key] = {
      value,
      expiry: Date.now() + (ttl * 1000) // Store expiry in ms
    };
    return Promise.resolve('OK');
  }),

  // Get value
  get: jest.fn().mockImplementation((key) => {
    const item = cacheStore[key];
    if (!item) return Promise.resolve(null);
    
    // Check if expired
    if (item.expiry && item.expiry < Date.now()) {
      delete cacheStore[key];
      return Promise.resolve(null);
    }
    
    return Promise.resolve(item.value);
  }),

  // Delete key
  del: jest.fn().mockImplementation((key) => {
    if (typeof key === 'string') {
      const existed = key in cacheStore;
      delete cacheStore[key];
      return Promise.resolve(existed ? 1 : 0);
    }
    
    // For array of keys
    let count = 0;
    key.forEach(k => {
      if (k in cacheStore) {
        delete cacheStore[k];
        count++;
      }
    });
    return Promise.resolve(count);
  }),

  // Quit connection
  quit: jest.fn().mockImplementation(() => {
    return Promise.resolve('OK');
  }),

  // Clear all data (helper for tests)
  _flushAll: () => {
    Object.keys(cacheStore).forEach(key => delete cacheStore[key]);
    return Promise.resolve('OK');
  }
};

module.exports = redisClient;
