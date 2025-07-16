const express = require("express");
const {
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAdminStats,
  getAdminTasks,
} = require("../controllers/adminController");

const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Create admin user
router.post("/create-admin", protectAdmin, require("../controllers/adminController").createAdmin);

// User management
router.get("/users", protectAdmin, getAllUsers);
router.patch("/users/:id/role", protectAdmin, updateUserRole);
router.delete("/users/:id", protectAdmin, deleteUser);

// Admin dashboard data
router.get("/stats", protectAdmin, getAdminStats);
router.get("/tasks", protectAdmin, getAdminTasks);

module.exports = router;
