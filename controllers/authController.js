const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const db = require('../db');
const logger = require('../utils/logger');

// Email transporter setup
const transporter = nodemailer.createTransporter({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper function for standardized error responses
const createErrorResponse = (statusCode, message, error = null) => {
  if (error) {
    logger.error(`${message}: ${error.message}`, { stack: error.stack });
  }
  return { status: statusCode, error: message };
};

// Helper function to send email
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    logger.info(`Email sent to: ${to}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};

// Helper function to generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// 🔐 Register User
exports.register = async (req, res) => {
  try {
    const { username, email, password, role, department, staffCode } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json(
        createErrorResponse(400, 'Username, email, and password are required')
      );
    }

    // Validate role
    const validRoles = ['admin', 'staff', 'employer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json(
        createErrorResponse(400, 'Invalid role specified')
      );
    }

    // Check if user already exists
    const [existingUsers] = await db.promise().query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json(
        createErrorResponse(409, 'User already exists')
      );
    }

    // Check if staff code is already used (for staff registration)
    if (staffCode) {
      const [existingStaffCode] = await db.promise().query(
        'SELECT id FROM users WHERE staff_code = ?',
        [staffCode]
      );

      if (existingStaffCode.length > 0) {
        return res.status(409).json(
          createErrorResponse(409, 'Staff code has already been used')
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with role and department info
    const [result] = await db.promise().query(
      'INSERT INTO users (username, email, password, role, department, staff_code) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, role || 'staff', department || null, staffCode || null]
    );

    logger.info(`New user registered: ${username} with role: ${role || 'staff'}`);

    res.status(201).json({
      message: 'User created successfully',
      userId: result.insertId,
      role: role || 'staff'
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Registration failed', error);
    res.status(500).json(errorResponse);
  }
};

// 🔓 Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(
        createErrorResponse(400, 'Email and password are required')
      );
    }

    // Find user
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json(
        createErrorResponse(401, 'Invalid credentials')
      );
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logger.warn(`Failed login attempt for user: ${email}`);
      return res.status(401).json(
        createErrorResponse(401, 'Invalid credentials')
      );
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${email}`);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Login failed', error);
    res.status(500).json(errorResponse);
  }
};

// 🔒 Verify User (token check)
exports.verify = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        createErrorResponse(401, 'No token provided')
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await db.promise().query(
      'SELECT id, username, email FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(404).json(
        createErrorResponse(404, 'User not found')
      );
    }

    res.status(200).json({ user: users[0], token });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(
        createErrorResponse(401, 'Invalid token')
      );
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json(
        createErrorResponse(401, 'Token expired')
      );
    }

    const errorResponse = createErrorResponse(500, 'Verification failed', error);
    res.status(500).json(errorResponse);
  }
};

// 📧 Email Verification
exports.sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json(
        createErrorResponse(400, 'Email is required')
      );
    }

    // Check if user exists
    const [users] = await db.promise().query(
      'SELECT id, username, email_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json(
        createErrorResponse(404, 'User not found')
      );
    }

    const user = users[0];
    
    if (user.email_verified) {
      return res.status(400).json(
        createErrorResponse(400, 'Email is already verified')
      );
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await db.promise().query(
      'INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?',
      [user.id, verificationToken, expiresAt, verificationToken, expiresAt]
    );

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${email}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Verify Your Email Address</h2>
        <p>Hello ${user.username},</p>
        <p>Please click the button below to verify your email address:</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Verify Email Address
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `;

    await sendEmail(email, 'Verify Your Email Address', emailHtml);

    res.status(200).json({
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to send verification email', error);
    res.status(500).json(errorResponse);
  }
};

// ✅ Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.body;
    
    if (!token || !email) {
      return res.status(400).json(
        createErrorResponse(400, 'Token and email are required')
      );
    }

    // Find user
    const [users] = await db.promise().query(
      'SELECT id, username FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json(
        createErrorResponse(404, 'User not found')
      );
    }

    const user = users[0];

    // Check verification token
    const [verifications] = await db.promise().query(
      'SELECT * FROM email_verifications WHERE user_id = ? AND token = ? AND expires_at > NOW() AND used = 0',
      [user.id, token]
    );

    if (verifications.length === 0) {
      return res.status(400).json(
        createErrorResponse(400, 'Invalid or expired verification token')
      );
    }

    // Mark email as verified
    await db.promise().query(
      'UPDATE users SET email_verified = 1 WHERE id = ?',
      [user.id]
    );

    // Mark token as used
    await db.promise().query(
      'UPDATE email_verifications SET used = 1 WHERE id = ?',
      [verifications[0].id]
    );

    logger.info(`Email verified for user: ${email}`);

    res.status(200).json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
        username: user.username,
        email,
        emailVerified: true
      }
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Email verification failed', error);
    res.status(500).json(errorResponse);
  }
};

// 🔐 Two-Factor Authentication - Generate Secret
exports.generate2FASecret = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `JDMarc (${req.user.email})`,
      issuer: 'JDMarc',
      length: 20
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store secret temporarily (will be confirmed when user verifies)
    await db.promise().query(
      'UPDATE users SET two_factor_secret = ?, two_factor_backup_codes = ? WHERE id = ?',
      [secret.base32, JSON.stringify(backupCodes), userId]
    );

    res.status(200).json({
      secret: secret.base32,
      qrCode,
      backupCodes
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to generate 2FA secret', error);
    res.status(500).json(errorResponse);
  }
};

// ✅ Enable Two-Factor Authentication
exports.enable2FA = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json(
        createErrorResponse(400, 'Verification code is required')
      );
    }

    // Get user's 2FA secret
    const [users] = await db.promise().query(
      'SELECT two_factor_secret FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json(
        createErrorResponse(404, 'User not found')
      );
    }

    const secret = users[0].two_factor_secret;

    // Verify code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 time steps tolerance
    });

    if (!verified) {
      return res.status(400).json(
        createErrorResponse(400, 'Invalid verification code')
      );
    }

    // Enable 2FA
    await db.promise().query(
      'UPDATE users SET two_factor_enabled = 1 WHERE id = ?',
      [userId]
    );

    logger.info(`2FA enabled for user: ${req.user.email}`);

    res.status(200).json({
      message: 'Two-factor authentication enabled successfully'
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to enable 2FA', error);
    res.status(500).json(errorResponse);
  }
};

// 🔍 Verify Two-Factor Authentication
exports.verify2FA = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json(
        createErrorResponse(400, 'Verification code is required')
      );
    }

    // Get user's 2FA secret
    const [users] = await db.promise().query(
      'SELECT two_factor_secret, two_factor_backup_codes FROM users WHERE id = ? AND two_factor_enabled = 1',
      [userId]
    );

    if (users.length === 0) {
      return res.status(400).json(
        createErrorResponse(400, '2FA not enabled or user not found')
      );
    }

    const user = users[0];
    const secret = user.two_factor_secret;
    const backupCodes = JSON.parse(user.two_factor_backup_codes || '[]');

    // Check if it's a backup code
    if (backupCodes.includes(code)) {
      // Remove used backup code
      const updatedBackupCodes = backupCodes.filter(c => c !== code);
      await db.promise().query(
        'UPDATE users SET two_factor_backup_codes = ? WHERE id = ?',
        [JSON.stringify(updatedBackupCodes), userId]
      );

      res.status(200).json({
        message: 'Two-factor authentication verified with backup code'
      });
      return;
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json(
        createErrorResponse(400, 'Invalid verification code')
      );
    }

    res.status(200).json({
      message: 'Two-factor authentication verified successfully'
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to verify 2FA', error);
    res.status(500).json(errorResponse);
  }
};

// 🚫 Disable Two-Factor Authentication
exports.disable2FA = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json(
        createErrorResponse(400, 'Verification code is required')
      );
    }

    // Verify code first
    const [users] = await db.promise().query(
      'SELECT two_factor_secret FROM users WHERE id = ? AND two_factor_enabled = 1',
      [userId]
    );

    if (users.length === 0) {
      return res.status(400).json(
        createErrorResponse(400, '2FA not enabled')
      );
    }

    const secret = users[0].two_factor_secret;

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json(
        createErrorResponse(400, 'Invalid verification code')
      );
    }

    // Disable 2FA
    await db.promise().query(
      'UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL, two_factor_backup_codes = NULL WHERE id = ?',
      [userId]
    );

    logger.info(`2FA disabled for user: ${req.user.email}`);

    res.status(200).json({
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to disable 2FA', error);
    res.status(500).json(errorResponse);
  }
};

// 🌐 Social Login - Google
exports.googleAuth = async (req, res) => {
  try {
    const { accessToken, userData } = req.body;

    // Verify Google token (implement Google API verification)
    // For now, we'll trust the frontend data
    
    // Check if user exists
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [userData.email]
    );

    let user;
    let isNewUser = false;

    if (users.length === 0) {
      // Create new user
      const [result] = await db.promise().query(
        'INSERT INTO users (username, email, email_verified, provider) VALUES (?, ?, 1, ?)',
        [userData.name, userData.email, 'google']
      );
      
      user = {
        id: result.insertId,
        username: userData.name,
        email: userData.email,
        emailVerified: true,
        provider: 'google'
      };
      isNewUser = true;
    } else {
      user = users[0];
      // Update provider if not set
      if (!user.provider) {
        await db.promise().query(
          'UPDATE users SET provider = ? WHERE id = ?',
          ['google', user.id]
        );
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`Google login: ${user.email} (${isNewUser ? 'new user' : 'existing user'})`);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        provider: user.provider
      },
      isNewUser
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Google authentication failed', error);
    res.status(500).json(errorResponse);
  }
};

// 🌐 Social Login - GitHub
exports.githubAuth = async (req, res) => {
  try {
    const { accessToken, userData } = req.body;

    // Check if user exists
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [userData.email]
    );

    let user;
    let isNewUser = false;

    if (users.length === 0) {
      // Create new user
      const [result] = await db.promise().query(
        'INSERT INTO users (username, email, email_verified, provider) VALUES (?, ?, 1, ?)',
        [userData.login, userData.email, 'github']
      );
      
      user = {
        id: result.insertId,
        username: userData.login,
        email: userData.email,
        emailVerified: true,
        provider: 'github'
      };
      isNewUser = true;
    } else {
      user = users[0];
      if (!user.provider) {
        await db.promise().query(
          'UPDATE users SET provider = ? WHERE id = ?',
          ['github', user.id]
        );
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`GitHub login: ${user.email} (${isNewUser ? 'new user' : 'existing user'})`);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        provider: user.provider
      },
      isNewUser
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'GitHub authentication failed', error);
    res.status(500).json(errorResponse);
  }
};

// 🌐 Social Login - Microsoft
exports.microsoftAuth = async (req, res) => {
  try {
    const { accessToken, userData } = req.body;

    // Check if user exists
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [userData.email]
    );

    let user;
    let isNewUser = false;

    if (users.length === 0) {
      // Create new user
      const [result] = await db.promise().query(
        'INSERT INTO users (username, email, email_verified, provider) VALUES (?, ?, 1, ?)',
        [userData.displayName, userData.email, 'microsoft']
      );
      
      user = {
        id: result.insertId,
        username: userData.displayName,
        email: userData.email,
        emailVerified: true,
        provider: 'microsoft'
      };
      isNewUser = true;
    } else {
      user = users[0];
      if (!user.provider) {
        await db.promise().query(
          'UPDATE users SET provider = ? WHERE id = ?',
          ['microsoft', user.id]
        );
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`Microsoft login: ${user.email} (${isNewUser ? 'new user' : 'existing user'})`);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        provider: user.provider
      },
      isNewUser
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Microsoft authentication failed', error);
    res.status(500).json(errorResponse);
  }
};

// 📢 Get Notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const [notifications] = await db.promise().query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, parseInt(limit), offset]
    );

    const [total] = await db.promise().query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
      [userId]
    );

    res.status(200).json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].count,
        pages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to fetch notifications', error);
    res.status(500).json(errorResponse);
  }
};

// ✅ Mark Notification as Read
exports.markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const [result] = await db.promise().query(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json(
        createErrorResponse(404, 'Notification not found')
      );
    }

    res.status(200).json({
      message: 'Notification marked as read'
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'Failed to mark notification as read', error);
    res.status(500).json(errorResponse);
  }
};
