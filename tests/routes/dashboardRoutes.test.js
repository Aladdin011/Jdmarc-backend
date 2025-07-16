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

describe('Dashboard Routes', () => {
  let mockToken;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a mock token for authentication
    mockToken = jwt.sign(
      { id: 1, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  describe('GET /api/dashboard/overview', () => {
    it('should return dashboard overview for authenticated user', async () => {
      const mockActivity = [{ id: 1, activity: 'test activity' }];
      const mockTasks = [{ id: 1, title: 'test task' }];

      // Mock DB responses
      db.promise().query
        .mockResolvedValueOnce([mockActivity])
        .mockResolvedValueOnce([mockTasks]);

      const response = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recentActivity');
      expect(response.body).toHaveProperty('pendingTasks');
      expect(response.body).toHaveProperty('lastUpdated');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/dashboard/overview');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/notifications', () => {
    it('should return unread notifications for authenticated user', async () => {
      const mockNotifications = [
        { id: 1, message: 'test notification' }
      ];

      // Mock DB response
      db.promise().query.mockResolvedValueOnce([mockNotifications]);

      const response = await request(app)
        .get('/api/dashboard/notifications')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('notifications');
      expect(response.body).toHaveProperty('unreadCount');
    });
  });

  describe('PUT /api/dashboard/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      // Mock successful update
      db.promise().query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .put('/api/dashboard/notifications/1/read')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Notification marked as read');
    });

    it('should return 404 for non-existent notification', async () => {
      // Mock no rows affected
      db.promise().query.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app)
        .put('/api/dashboard/notifications/999/read')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return dashboard summary for authenticated user', async () => {
      const mockTaskSummary = [{
        totalTasks: 10,
        completedTasks: 5,
        pendingTasks: 5,
        overdueTasks: 1
      }];

      const mockPerformance = [{
        avgCompletionTime: 120,
        activeDays: 15
      }];

      // Mock DB responses
      db.promise().query
        .mockResolvedValueOnce([mockTaskSummary])
        .mockResolvedValueOnce([mockPerformance]);

      const response = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('taskSummary');
      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('lastUpdated');
    });

    it('should handle database errors gracefully', async () => {
      // Mock DB error
      db.promise().query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});