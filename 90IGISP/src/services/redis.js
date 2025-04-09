const redis = require('redis');
const config = require('../config/config');

/**
 * Redis Client Service (90Scan)
 * Manages connection to Redis for caching
 */
const redisClient = redis.createClient({
  url: `redis://${config.redis.password ? `:${config.redis.password}@` : ''}${config.redis.host}:${config.redis.port}`
});

// Error handling
redisClient.on('error', (err) => {
  console.error('90Scan Redis Error:', err);
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('90Scan: Connected to Redis');
  } catch (err) {
    console.error('90Scan: Failed to connect to Redis:', err);
  }
})();

module.exports = redisClient;
