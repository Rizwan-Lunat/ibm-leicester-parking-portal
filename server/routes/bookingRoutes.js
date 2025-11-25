const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { validateBooking } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// All booking routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Private
 */
router.post('/', validateBooking, bookingController.createBooking);

/**
 * @route   GET /api/bookings
 * @desc    Get user's bookings
 * @access  Private
 */
router.get('/', bookingController.getUserBookings);

/**
 * @route   GET /api/bookings/availability/:date
 * @desc    Check availability for a specific date
 * @access  Private
 */
router.get('/availability/:date', bookingController.checkAvailability);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get a specific booking by ID
 * @access  Private
 */
router.get('/:id', bookingController.getBookingById);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Cancel a booking
 * @access  Private
 */
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;