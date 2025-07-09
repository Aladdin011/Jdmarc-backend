const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// Register route
router.post("/register", authController.register);

// Login route
router.post("/login", authController.login);


// Verify route
router.post("/verify", authController.verify);

// Example protected route (replace with your real controller)
// router.get("/dashboard", verifyToken, dashboardController.view);

module.exports = router;
