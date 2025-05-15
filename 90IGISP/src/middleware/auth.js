const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * JWT Authentication Middleware (90Auth)
 * Validates incoming requests with JWT token
 */
const authMiddleware = (req, res, next) => {
  // Skip authentication for public endpoints
  if (req.path === '/api/login' || req.path === '/api/register' || req.path === '/api/verify-token') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired', 
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token', 
      code: 'INVALID_TOKEN'
    });
  }
};

module.exports = authMiddleware;
