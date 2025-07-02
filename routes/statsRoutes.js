const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

// Example: /api/user/stats
router.get("/user/stats", verifyToken, async (req, res) => {
  // In a real app, fetch these from your DB using req.user.id
  res.json({
    loginCount: 15,
    lastLogin: "2025-06-30T14:22:10Z",
    taskCount: 7,
  });
});

// Example: /api/dashboard/stats
router.get("/dashboard/stats", verifyToken, async (req, res) => {
  // In a real app, fetch these from your DB using req.user.id or role
  res.json({
    loginCount: 15,
    lastLogin: "2025-06-30T14:22:10Z",
    taskCount: 7,
  });
});

module.exports = router;
