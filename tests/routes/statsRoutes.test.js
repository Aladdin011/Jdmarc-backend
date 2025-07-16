const request = require('supertest');
const app = require('../../server');
const db = require('../../db');
const jwt = require('jsonwebtoken');

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

describe('Stats Routes', () => {
  let mockToken;
  let adminMockToken;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a mock token for regular user authentication
    mockToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'user' },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Create a mock token for admin authentication
    adminMockToken = jwt.sign(
      { id: 2, email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  describe('GET /api/stats/user', () => {
    it('should return user stats for authenticated user', async () => {
      const mockLoginStats = [{
        loginCount: 10,
        lastLogin: '2025-01-01T00:00:00Z'
      }];

      const mockTaskStats = [{
        taskCount: 5
      }];

      // Mock DB responses
      db.promise().query
        .mockResolvedValueOnce([mockLoginStats])
        .mockResolvedValueOnce([mockTaskStats]);

      const response = await request(app)
        .get('/api/stats/user')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('loginCount');
      expect(response.body).toHaveProperty('lastLogin');
      expect(response.body).toHaveProperty('taskCount');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/stats/user');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/stats/dashboard', () => {
    it('should return dashboard stats for authenticated user', async () => {
      const mockSystemStats = [{
        activeUsers: 100,
        totalLogins: 500,
        lastSystemActivity: '2025-01-01T00:00:00Z'
      }];

      const mockTaskStats = [{
        totalTasks: 200,
        completedTasks: 150,
        pendingTasks: 50
      }];

      // Mock DB responses
      db.promise().query
        .mockResolvedValueOnce([mockSystemStats])
        .mockResolvedValueOnce([mockTaskStats]);

      const response = await request(app)
        .get('/api/stats/dashboard')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('tasks');
    });

    it('should handle database errors gracefully', async () => {
      // Mock DB error
      db.promise().query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/stats/dashboard')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/stats/admin', () => {
    it('should return admin stats for authenticated admin user', async () => {
      const mockUserStats = [{
        adminCount: 5,
        staffCount: 20,
        employerCount: 75,
        totalUsers: 100,
        activeLastWeek: 80
      }];

      // Mock DB response
      db.promise().query.mockResolvedValueOnce([mockUserStats]);

      const response = await request(app)
        .get('/api/stats/admin')
        .set('Authorization', `Bearer ${adminMockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userStats');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/stats/admin')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied. Admin privileges required');
    });

    it('should handle database errors gracefully', async () => {
      // Mock DB error
      db.promise().query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/stats/admin')
        .set('Authorization', `Bearer ${adminMockToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});