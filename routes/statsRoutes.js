const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const db = require('../db');

// Helper function for standardized error responses
const createErrorResponse = (statusCode, message, error = null) => {
  if (error) {
    logger.error(`${message}: ${error.message}`, { stack: error.stack });
  }
  return { status: statusCode, error: message };
};

// GET /api/stats/user
router.get('/user', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT COUNT(*) as loginCount, MAX(login_time) as lastLogin FROM user_logins WHERE user_id = ?',
      [req.user.id]
    );

    const [taskRows] = await db.promise().query(
      'SELECT COUNT(*) as taskCount FROM tasks WHERE user_id = ?',
      [req.user.id]
    );

    logger.info(`Stats retrieved for user: ${req.user.id}`);

    res.json({
      loginCount: rows[0].loginCount,
      lastLogin: rows[0].lastLogin,
      taskCount: taskRows[0].taskCount
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to fetch user stats', error);
    res.status(500).json(errorResponse);
  }
});

// GET /api/stats/dashboard
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // Get overall system stats
    const [systemStats] = await db.promise().query(`
      SELECT 
        COUNT(DISTINCT user_id) as activeUsers,
        COUNT(*) as totalLogins,
        MAX(login_time) as lastSystemActivity
      FROM user_logins
      WHERE login_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Get task statistics
    const [taskStats] = await db.promise().query(`
      SELECT 
        COUNT(*) as totalTasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedTasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingTasks
      FROM tasks
    `);

    logger.info('Dashboard stats retrieved successfully');

    res.json({
      system: systemStats[0],
      tasks: taskStats[0]
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to fetch dashboard stats', error);
    res.status(500).json(errorResponse);
  }
});

// GET /api/stats/admin
router.get('/admin', verifyToken, async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json(
        createErrorResponse(403, 'Access denied. Admin privileges required')
      );
    }

    const [userStats] = await db.promise().query(`
      SELECT 
        SUM(role = 'admin') AS adminCount, 
        SUM(role = 'staff') AS staffCount, 
        SUM(role = 'employer') AS employerCount, 
        COUNT(*) AS totalUsers,
        SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS activeLastWeek
      FROM users
    `);

    logger.info('Admin stats retrieved successfully');

    res.json({
      userStats: userStats[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to fetch admin stats', error);
    res.status(500).json(errorResponse);
  }
});

module.exports = router;
