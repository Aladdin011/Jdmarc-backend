const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Register route
router.post("/register", authController.register);

// Login route
router.post("/login", authController.login);

// Test route
router.get("/test", (req, res) => {
  res.status(200).json({ message: "✅ Auth route is working!" });
});

module.exports = router;