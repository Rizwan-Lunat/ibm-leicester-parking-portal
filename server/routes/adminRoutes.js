const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { validateCapacity } = require('../middleware/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication AND admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/bookings
 * @desc    Get all bookings (with filters)
 * @access  Admin only
 */
router.get('/bookings', adminController.getAllBookings);

/**
 * @route   DELETE /api/admin/bookings/:id
 * @desc    Cancel any booking (admin override)
 * @access  Admin only
 */
router.delete('/bookings/:id', adminController.adminCancelBooking);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin only
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Activate/Deactivate user
 * @access  Admin only
 */
router.patch('/users/:id/status', adminController.toggleUserStatus);

/**
 * @route   GET /api/admin/config
 * @desc    Get system configuration
 * @access  Admin only
 */
router.get('/config', adminController.getConfig);

/**
 * @route   PUT /api/admin/config/capacity
 * @desc    Update parking capacity
 * @access  Admin only
 */
router.put('/config/capacity', validateCapacity, adminController.updateCapacity);

/**
 * @route   GET /api/admin/stats
 * @desc    Get usage statistics
 * @access  Admin only
 */
router.get('/stats', adminController.getStatistics);

module.exports = router;