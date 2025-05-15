const request = require('supertest');
const express = require('express');
const apiRoutes = require('../../../src/routes/api');
const crsEngine = require('../../../src/services/crs');
const costCalculator = require('../../../src/services/costCalculator');
const cacheMiddleware = require('../../../src/middleware/cache');
const jwt = require('jsonwebtoken');

// Mock auth middleware for testing
jest.mock('../../../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { id: '1', username: 'testuser', role: 'user' };
    next();
  };
});

jest.mock('../../../src/middleware/cache', () => {
  return (duration) => {
    return (req, res, next) => next();
  };
});

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

// Mock service functions
jest.mock('../../../src/services/crs', () => ({
  findMatchingLoads: jest.fn().mockResolvedValue({
    matches: [{ id: '1', company_id: '1' }],
    loadGroup: { id: 'group-123', totalWeight: 5000 },
    costSplit: [{ shipmentId: '1', cost: 500 }]
  })
}));

jest.mock('../../../src/services/costCalculator', () => ({
  getCostBreakdown: jest.fn().mockResolvedValue({
    shipmentId: '1',
    totalGroupCost: 1000,
    companyCost: 500,
    individualCost: 800,
    savings: 300,
    savingsPercentage: '37.50',
    breakdown: [
      { shipmentId: '1', companyId: '1', cost: 500 },
      { shipmentId: '2', companyId: '2', cost: 500 }
    ]
  })
}));

describe('API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /gisdata/:id should return GIS point data', async () => {
    const response = await request(app)
      .get('/api/gisdata/1')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  test('GET /gisdata/search/radius should return points within radius', async () => {
    const response = await request(app)
      .get('/api/gisdata/search/radius?lat=37.7749&lng=-122.4194&radius=5000')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /crs/match should find matching shipments', async () => {
    const payload = {
      origin: { lat: 37.7749, lng: -122.4194 },
      destination: { lat: 40.7128, lng: -74.0060 },
      weight: 3500,
      companyId: '2',
      industryType: 'electronics',
      revenueBracket: 3
    };

    const response = await request(app)
      .post('/api/crs/match')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.matches).toBeDefined();
    expect(response.body.data.loadGroup).toBeDefined();
    expect(response.body.data.costSplit).toBeDefined();
    
    expect(crsEngine.findMatchingLoads).toHaveBeenCalledWith(payload);
  });

  test('GET /crs/costs/:shipmentId should return cost breakdown', async () => {
    const shipmentId = '1';

    const response = await request(app)
      .get(`/api/crs/costs/${shipmentId}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.shipmentId).toBe(shipmentId);
    expect(response.body.data.companyCost).toBeDefined();
    expect(response.body.data.savings).toBeDefined();
    expect(Array.isArray(response.body.data.breakdown)).toBe(true);
    
    expect(costCalculator.getCostBreakdown).toHaveBeenCalledWith(shipmentId);
  });

  test('POST /login should return a JWT token and user info', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'demo', password: 'password' })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.username).toBe('demo');
    
    // Verify token is a valid JWT
    const decoded = jwt.decode(response.body.token);
    expect(decoded).toBeDefined();
    expect(decoded.username).toBe('demo');
  });

  test('POST /login should return 400 for missing credentials', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'demo' }) // Missing password
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  test('POST /login should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'wrong', password: 'incorrect' })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  test('GET /verify-token should validate a valid token', async () => {
    // First get a token
    const loginResponse = await request(app)
      .post('/api/login')
      .send({ username: 'demo', password: 'password' });

    const token = loginResponse.body.token;
    
    const response = await request(app)
      .get('/api/verify-token')
      .set('Authorization', `Bearer ${token}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.username).toBe('demo');
    expect(response.body.tokenExpiration).toBeDefined();
  });

  test('GET /verify-token should return 401 for invalid token', async () => {
    const response = await request(app)
      .get('/api/verify-token')
      .set('Authorization', 'Bearer invalidtoken')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  test('POST /register should create a new user and return token', async () => {
    const userData = {
      username: 'newuser',
      password: 'securepass',
      email: 'newuser@example.com'
    };

    const response = await request(app)
      .post('/api/register')
      .send(userData)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.username).toBe('newuser');
    
    // Verify token is a valid JWT
    const decoded = jwt.decode(response.body.token);
    expect(decoded).toBeDefined();
    expect(decoded.username).toBe('newuser');
  });

  test('POST /register should return 400 for incomplete data', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({ username: 'incomplete' }) // Missing required fields
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});
