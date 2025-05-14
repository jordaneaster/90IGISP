// Mock for Redis client

// In-memory cache for testing
const cache = new Map();

const createClient = () => {
  return {
    connect: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    get: jest.fn((key) => Promise.resolve(cache.get(key) || null)),
    set: jest.fn((key, value) => {
      cache.set(key, value);
      return Promise.resolve('OK');
    }),
    setEx: jest.fn((key, ttl, value) => {
      cache.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key) => {
      const existed = cache.has(key);
      cache.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    }),
    flushAll: jest.fn(() => {
      cache.clear();
      return Promise.resolve('OK');
    })
  };
};

module.exports = {
  createClient,
  // Export cache for assertions
  _getCache: () => cache
};
