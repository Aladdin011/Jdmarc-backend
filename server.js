const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('./utils/logger');

// Load environment variables
require('dotenv').config();

// Create Express app
const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:5173', 'https://jdmarcng.com'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/kyc', require('./routes/kycRoutes'));

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Not Found - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', err);
  
  // Handle specific types of errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'Invalid token or no token provided'
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`CORS allowed origins: ${process.env.ALLOWED_ORIGINS || 'default'}`);
  });
}

// Export for testing
module.exports = app;
