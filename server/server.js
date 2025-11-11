// Import required dependencies
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Create Express application
const app = express();

// Security middleware
app.use(helmet()); // Adds security headers

// Rate limiting - prevents abuse (max 100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS - allows frontend to communicate with backend
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Logging middleware (shows requests in console)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Basic test route
app.get('/', (req, res) => {
  res.json({
    message: 'IBM Leicester Parking Portal API',
    status: 'Server is running',
    version: '1.0.0',
    student: 'Rizwan Lunat (P2605119)',
    module: 'CTEC3360'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Routes will be added here later
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/bookings', require('./routes/bookingRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));

// 404 handler - catches routes that don't exist
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚗 IBM Leicester Parking Portal API                     ║
║                                                            ║
║   Server: http://localhost:${PORT}                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}                      ║
║   Student: Rizwan Lunat (P2605119)                        ║
║   Module: CTEC3360                                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

module.exports = app;