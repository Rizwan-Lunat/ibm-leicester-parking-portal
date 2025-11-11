const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Generate JWT token for user
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
  );
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT email FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Registration failed',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING user_id, name, email, role, created_at`,
      [name, email, password_hash, phone || null]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken(user.user_id, user.role);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  } finally {
    client.release();
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user from database
    const result = await pool.query(
      'SELECT user_id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Login failed',
        message: 'Account has been deactivated'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user.user_id, user.role);

    res.json({
      message: 'Login successful',
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 * Requires authentication
 */
const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, phone, role, created_at, updated_at
       FROM users 
       WHERE user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to retrieve profile'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile
};