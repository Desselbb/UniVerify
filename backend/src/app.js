require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const authRoutes = require('./routes/auth');
const verificationRoutes = require('./routes/verification');
const adminRoutes = require('./routes/admin');
const graduateRoutes = require('./routes/graduate');
const healthRoutes = require('./routes/health');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 3600000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/graduate', graduateRoutes);
app.use('/api/health', healthRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
