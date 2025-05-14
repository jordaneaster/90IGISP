// Load environment variables for testing
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Close any connections or clean up resources after tests
  const redisClient = require('../src/services/redis');
  await redisClient.quit().catch(() => {});
  
  // Add any other cleanup operations here
});
