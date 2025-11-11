const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Middleware to verify JWT token and authenticate user
 * Adds user information to req.user if valid
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No authentication token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database to ensure they still exist and are active
    const result = await pool.query(
      'SELECT user_id, name, email, role, is_active FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Account has been deactivated'
      });
    }

    // Attach user info to request object
    req.user = {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    next(); // Continue to next middleware/route handler
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token has expired'
      });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to check if user has admin role
 * Must be used AFTER authenticateToken
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required'
    });
  }

  next();
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for routes that work with or without authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // No token, continue without user info
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT user_id, name, email, role FROM users WHERE user_id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = {
        userId: result.rows[0].user_id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        role: result.rows[0].role
      };
    }

    next();
  } catch (error) {
    // Token invalid/expired, but we don't fail - just continue without user
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth
};