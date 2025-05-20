/**
 * Simplified Auth Middleware for MVP
 * Always authenticates with a hardcoded admin user
 */
const authMiddleware = (req, res, next) => {
  // For MVP, check if auth header contains hardcoded token or bypass auth completely
  const authHeader = req.headers.authorization;
  const hardcodedToken = 'mvp-hardcoded-token';
  
  // Skip authentication for public endpoints
  if (req.path === '/api/login' || req.path === '/api/register' || req.path === '/api/verify-token') {
    return next();
  }
  
  // For MVP, either accept hardcoded token or bypass auth completely
  // Option 1: Accept hardcoded token
  if (authHeader && authHeader.includes(hardcodedToken)) {
    // Valid hardcoded token
  } 
  // Option 2: Even if no token or invalid, still authenticate for MVP
  
  // Hardcoded user for MVP development
  req.user = {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    // Add any other user properties your app expects
  };

  // Always proceed with the hardcoded user
  next();
};

module.exports = authMiddleware;
