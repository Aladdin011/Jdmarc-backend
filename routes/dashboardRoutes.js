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

// GET /api/dashboard/overview
router.get('/overview', verifyToken, async (req, res) => {
  try {
    // Get user's recent activity
    const [recentActivity] = await db.promise().query(
      `SELECT * FROM user_activity 
       WHERE user_id = ? 
       ORDER BY activity_time DESC 
       LIMIT 5`,
      [req.user.id]
    );

    // Get user's pending tasks
    const [pendingTasks] = await db.promise().query(
      `SELECT * FROM tasks 
       WHERE user_id = ? 
       AND status = 'pending' 
       ORDER BY due_date ASC 
       LIMIT 5`,
      [req.user.id]
    );

    logger.info(`Dashboard overview retrieved for user: ${req.user.id}`);

    res.json({
      recentActivity,
      pendingTasks,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to fetch dashboard overview', error);
    res.status(500).json(errorResponse);
  }
});

// GET /api/dashboard/notifications
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const [notifications] = await db.promise().query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       AND read_status = false 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [req.user.id]
    );

    logger.info(`Notifications retrieved for user: ${req.user.id}`);

    res.json({
      notifications,
      unreadCount: notifications.length
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to fetch notifications', error);
    res.status(500).json(errorResponse);
  }
});

// PUT /api/dashboard/notifications/:id/read
router.put('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const [result] = await db.promise().query(
      `UPDATE notifications 
       SET read_status = true 
       WHERE id = ? AND user_id = ?`,
      [notificationId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json(
        createErrorResponse(404, 'Notification not found or unauthorized')
      );
    }

    logger.info(`Notification ${notificationId} marked as read by user: ${req.user.id}`);

    res.json({
      message: 'Notification marked as read',
      notificationId
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to update notification', error);
    res.status(500).json(errorResponse);
  }
});

// GET /api/dashboard/summary
router.get('/summary', verifyToken, async (req, res) => {
  try {
    // Get user's task summary
    const [taskSummary] = await db.promise().query(
      `SELECT 
         COUNT(*) as totalTasks,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedTasks,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingTasks,
         SUM(CASE WHEN due_date < NOW() AND status != 'completed' THEN 1 ELSE 0 END) as overdueTasks
       FROM tasks 
       WHERE user_id = ?`,
      [req.user.id]
    );

    // Get user's recent performance metrics
    const [performance] = await db.promise().query(
      `SELECT 
         AVG(completion_time) as avgCompletionTime,
         COUNT(DISTINCT DATE(completed_at)) as activeDays
       FROM task_completions 
       WHERE user_id = ? 
       AND completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [req.user.id]
    );

    logger.info(`Dashboard summary retrieved for user: ${req.user.id}`);

    res.json({
      taskSummary: taskSummary[0],
      performance: performance[0],
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to fetch dashboard summary', error);
    res.status(500).json(errorResponse);
  }
});

module.exports = router;
