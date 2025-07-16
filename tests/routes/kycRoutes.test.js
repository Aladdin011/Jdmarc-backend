const request = require('supertest');
const app = require('../../server');
const db = require('../../db');

// Mock the database
jest.mock('../../db');

describe('KYC Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/kyc/validate', () => {
    it('should validate correct staff code format', async () => {
      // Mock DB response for unused staff code
      db.promise().query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .post('/api/kyc/validate')
        .send({
          code: '1234-ENG',
          department: 'Engineering'
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.message).toBe('Staff code validated successfully');
    });

    it('should reject invalid staff code format', async () => {
      const response = await request(app)
        .post('/api/kyc/validate')
        .send({
          code: '1234-FIN',
          department: 'Engineering'
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.message).toBe('Invalid staff code format');
    });

    it('should reject already used staff code', async () => {
      // Mock DB response for used staff code
      db.promise().query.mockResolvedValueOnce([[{ id: 1 }]]);

      const response = await request(app)
        .post('/api/kyc/validate')
        .send({
          code: '1234-ENG',
          department: 'Engineering'
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.message).toBe('Staff code has already been used');
    });

    it('should reject invalid department', async () => {
      const response = await request(app)
        .post('/api/kyc/validate')
        .send({
          code: '1234-XXX',
          department: 'InvalidDepartment'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid department');
    });

    it('should require both code and department', async () => {
      const response = await request(app)
        .post('/api/kyc/validate')
        .send({
          code: '1234-ENG'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Staff code and department are required');
    });

    it('should handle database errors gracefully', async () => {
      // Mock DB error
      db.promise().query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/kyc/validate')
        .send({
          code: '1234-ENG',
          department: 'Engineering'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('KYC validation failed');
    });
  });
}); 