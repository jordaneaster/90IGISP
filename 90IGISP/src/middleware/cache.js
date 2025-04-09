const redisClient = require('../services/redis');

/**
 * Redis Caching Middleware (90Scan)
 * Checks Redis for cached responses before hitting the database
 * @param {number} duration - Cache duration in seconds
 */
const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `90IGISP:${req.originalUrl}`;
    
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        console.log(`90Scan: Serving from cache: ${key}`);
        return res.json(JSON.parse(cachedData));
      }

      // Store the original res.json function
      const originalJson = res.json;
      
      // Override res.json to cache the response before sending
      res.json = function(data) {
        // Store in Redis cache
        redisClient.setEx(key, duration, JSON.stringify(data));
        console.log(`90Scan: Cached ${key} for ${duration} seconds`);
        
        // Call the original res.json with the data
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next(); // Proceed without caching if Redis fails
    }
  };
};

module.exports = cacheMiddleware;
