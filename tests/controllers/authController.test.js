const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const app = require('../../server'); // Make sure to export app from server.js

// Mock the database queries
jest.mock('../../db', () => ({
  promise: jest.fn().mockReturnValue({
    query: jest.fn()
  })
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Auth Controller', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock DB responses
      db.promise().query
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/auth/register')
        .send(mockUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId');
      expect(response.body.message).toBe('User created successfully');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('All fields are required');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully with correct credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 12),
        username: 'testuser'
      };

      // Mock DB response
      db.promise().query.mockResolvedValueOnce([[mockUser]]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
    });

    it('should return 401 for invalid credentials', async () => {
      // Mock empty DB response
      db.promise().query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify valid token successfully', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      };

      const token = jwt.sign(
        { id: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET
      );

      // Mock DB response
      db.promise().query.mockResolvedValueOnce([[mockUser]]);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject(mockUser);
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });
  });
});