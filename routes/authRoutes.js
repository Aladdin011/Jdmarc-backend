const express = require("express");
const router = express.Router();
const { 
  register, 
  login, 
  verify,
  sendVerificationEmail,
  verifyEmail,
  generate2FASecret,
  enable2FA,
  verify2FA,
  disable2FA,
  googleAuth,
  githubAuth,
  microsoftAuth,
  getNotifications,
  markNotificationRead
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// Basic Auth Routes
router.post("/register", register);
router.post("/login", login);
router.post("/verify", verify);

// Email Verification Routes
router.post("/send-verification", sendVerificationEmail);
router.post("/verify-email", verifyEmail);

// Two-Factor Authentication Routes
router.post("/2fa/generate", verifyToken, generate2FASecret);
router.post("/2fa/enable", verifyToken, enable2FA);
router.post("/2fa/verify", verifyToken, verify2FA);
router.post("/2fa/disable", verifyToken, disable2FA);

// Social Login Routes
router.post("/google", googleAuth);
router.post("/github", githubAuth);
router.post("/microsoft", microsoftAuth);

// Social Login OAuth URLs
router.get("/google/url", (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/oauth2/authorize?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=email profile`;
  res.json({ authUrl: googleAuthUrl });
});

router.get("/github/url", (req, res) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user:email`;
  res.json({ authUrl: githubAuthUrl });
});

router.get("/microsoft/url", (req, res) => {
  const microsoftAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID}&redirect_uri=${process.env.MICROSOFT_REDIRECT_URI}&response_type=code&scope=openid email profile`;
  res.json({ authUrl: microsoftAuthUrl });
});

// Notification Routes
router.get("/notifications", verifyToken, getNotifications);
router.put("/notifications/:notificationId/read", verifyToken, markNotificationRead);

module.exports = router;
