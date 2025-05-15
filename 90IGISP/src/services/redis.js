const Redis = require('ioredis');
const { promisify } = require('util');

// In-memory fallback when Redis is not available
class RedisMockClient {
  constructor() {
    this.store = new Map();
    console.log('Using in-memory Redis mock (Redis server not available)');
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async setEx(key, seconds, value) {
    this.store.set(key, value);
    if (seconds > 0) {
      setTimeout(() => this.store.delete(key), seconds * 1000);
    }
    return 'OK';
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }
}

// Initialize with mock client first
let redisClient = new RedisMockClient();
let usingMock = true;

// Try to connect to Redis
try {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      // Return false to stop retrying and use the mock instead
      if (times > 1) {
        console.log('Redis connection failed, using in-memory fallback');
        return false; // Stop retrying
      }
      return 1000; // Wait 1 second before retry
    }
  });

  // Set up connection handler
  client.once('ready', () => {
    console.log('Connected to Redis server');
    if (usingMock) {
      redisClient = client;
      usingMock = false;
    }
  });

  // Set up error handling
  client.on('error', (error) => {
    if (!usingMock) {
      console.log('Redis connection lost, switching to in-memory fallback');
      redisClient = new RedisMockClient();
      usingMock = true;
      // Try to close the failing connection
      try {
        client.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
  });
} catch (error) {
  console.log('Failed to initialize Redis client:', error.message);
  // Already using mock client, so no need to do anything else
}

module.exports = redisClient;
