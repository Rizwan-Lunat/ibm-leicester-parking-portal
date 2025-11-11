const { body, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 * Returns errors if validation failed
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email is too long'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character (!@#$%^&*)'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9\s\-\+\(\)]+$/).withMessage('Phone number format is invalid')
    .isLength({ max: 20 }).withMessage('Phone number is too long'),
  
  validate
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  validate
];

/**
 * Validation rules for booking creation
 */
const validateBooking = [
  body('booking_date')
    .notEmpty().withMessage('Booking date is required')
    .isDate().withMessage('Must be a valid date (YYYY-MM-DD)'),
  
  body('space_number')
    .notEmpty().withMessage('Space number is required')
    .isInt({ min: 1 }).withMessage('Space number must be a positive integer'),
  
  body('vehicle_registration')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 }).withMessage('Vehicle registration is too long'),
  
  validate
];

/**
 * Validation rules for updating parking capacity
 */
const validateCapacity = [
  body('total_spaces')
    .notEmpty().withMessage('Total spaces is required')
    .isInt({ min: 1, max: 1000 }).withMessage('Total spaces must be between 1 and 1000'),
  
  validate
];

module.exports = {
  validate,
  validateRegister,
  validateLogin,
  validateBooking,
  validateCapacity
};