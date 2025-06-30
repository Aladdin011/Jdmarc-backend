const express = require("express");
const router = express.Router();

// Placeholder route for dashboard
router.get("/", (req, res) => {
  res.json({ message: "Dashboard route is under construction." });
});

module.exports = router;
