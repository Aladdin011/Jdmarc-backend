// routes/adminRoutes.js
const express = require("express");
const {
  getAllUsers,
  updateUserRole,
  deleteUser,
} = require("../controllers/adminController");

const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/users", protectAdmin, getAllUsers);
router.patch("/users/:id/role", protectAdmin, updateUserRole);
router.delete("/users/:id", protectAdmin, deleteUser);

module.exports = router;
