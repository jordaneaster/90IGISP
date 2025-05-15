const redisClient = require('../services/redis');

/**
 * Cache middleware
 * @param {number} duration - Cache duration in seconds
 */
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate a cache key from the request path and query params
    const cacheKey = `cache:${req.originalUrl || req.url}`;
    
    try {
      // Try to get from cache
      const cachedResponse = await redisClient.get(cacheKey);
      
      if (cachedResponse) {
        const data = JSON.parse(cachedResponse);
        return res.json(data);
      }
      
      // If not cached, intercept the response
      const originalSend = res.json;
      res.json = function(body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            redisClient.setEx(cacheKey, duration, JSON.stringify(body))
              .catch(err => console.error('Redis cache error:', err));
          } catch (err) {
            console.error('Cache serialization error:', err);
          }
        }
        originalSend.call(this, body);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next(); // Continue without caching
    }
  };
};

module.exports = cacheMiddleware;
