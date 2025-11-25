const { pool } = require('../config/database');

/**
 * Get all bookings (admin only)
 * GET /api/admin/bookings
 */
const getAllBookings = async (req, res) => {
  try {
    const { date, user_id, include_cancelled } = req.query;

    let query = `
      SELECT b.booking_id, b.user_id, b.booking_date, b.space_number,
             b.vehicle_registration, b.created_at, b.cancelled_at, b.cancelled_by,
             u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Filter by date if provided
    if (date) {
      query += ` AND b.booking_date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    // Filter by user if provided
    if (user_id) {
      query += ` AND b.user_id = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }

    // Exclude cancelled bookings by default
    if (include_cancelled !== 'true') {
      query += ` AND b.cancelled_at IS NULL`;
    }

    query += ` ORDER BY b.booking_date DESC, b.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      bookings: result.rows.map(booking => ({
        bookingId: booking.booking_id,
        userId: booking.user_id,
        userName: booking.user_name,
        userEmail: booking.user_email,
        bookingDate: booking.booking_date,
        spaceNumber: booking.space_number,
        vehicleRegistration: booking.vehicle_registration,
        createdAt: booking.created_at,
        cancelledAt: booking.cancelled_at,
        cancelledBy: booking.cancelled_by
      })),
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      error: 'Failed to retrieve bookings'
    });
  }
};

/**
 * Get all users (admin only)
 * GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
  try {
    const { include_inactive } = req.query;

    let query = `
      SELECT user_id, name, email, phone, role, is_active, created_at
      FROM users
    `;

    // Exclude inactive users by default
    if (include_inactive !== 'true') {
      query += ` WHERE is_active = true`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query);

    res.json({
      users: result.rows.map(user => ({
        userId: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at
      })),
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      error: 'Failed to retrieve users'
    });
  }
};

/**
 * Update parking capacity (admin only)
 * PUT /api/admin/config/capacity
 */
const updateCapacity = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { total_spaces } = req.body;
    const adminId = req.user.userId;

    // Get current capacity
    const currentConfig = await client.query(
      `SELECT config_value FROM config WHERE config_key = 'total_spaces'`
    );
    const currentCapacity = parseInt(currentConfig.rows[0]?.config_value || 50);

    // If reducing capacity, check if it would affect existing bookings
    if (total_spaces < currentCapacity) {
      const affectedBookings = await client.query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE space_number > $1 AND cancelled_at IS NULL AND booking_date >= CURRENT_DATE`,
        [total_spaces]
      );

      if (parseInt(affectedBookings.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Cannot reduce capacity',
          message: `There are ${affectedBookings.rows[0].count} active bookings for spaces beyond the new capacity. Cancel these bookings first.`
        });
      }
    }

    // Update capacity
    await client.query(
      `UPDATE config 
       SET config_value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
       WHERE config_key = 'total_spaces'`,
      [total_spaces.toString(), adminId]
    );

    res.json({
      message: 'Parking capacity updated successfully',
      previousCapacity: currentCapacity,
      newCapacity: total_spaces
    });

  } catch (error) {
    console.error('Update capacity error:', error);
    res.status(500).json({
      error: 'Failed to update capacity'
    });
  } finally {
    client.release();
  }
};

/**
 * Get system configuration (admin only)
 * GET /api/admin/config
 */
const getConfig = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT config_key, config_value, updated_at FROM config ORDER BY config_key`
    );

    const config = {};
    result.rows.forEach(row => {
      config[row.config_key] = {
        value: row.config_value,
        updatedAt: row.updated_at
      };
    });

    res.json({ config });

  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      error: 'Failed to retrieve configuration'
    });
  }
};

/**
 * Get usage statistics (admin only)
 * GET /api/admin/stats
 */
const getStatistics = async (req, res) => {
  try {
    // Total users
    const totalUsersResult = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE is_active = true`
    );

    // Total bookings
    const totalBookingsResult = await pool.query(
      `SELECT COUNT(*) as count FROM bookings WHERE cancelled_at IS NULL`
    );

    // Active bookings (future)
    const activeBookingsResult = await pool.query(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE cancelled_at IS NULL AND booking_date >= CURRENT_DATE`
    );

    // Bookings today
    const todayBookingsResult = await pool.query(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE cancelled_at IS NULL AND booking_date = CURRENT_DATE`
    );

    // Average occupancy last 7 days
    const occupancyResult = await pool.query(
      `SELECT 
         COUNT(*) as total_bookings,
         COUNT(DISTINCT booking_date) as days_with_bookings
       FROM bookings 
       WHERE cancelled_at IS NULL 
       AND booking_date >= CURRENT_DATE - INTERVAL '7 days'
       AND booking_date < CURRENT_DATE`
    );

    // Get total capacity
    const capacityResult = await pool.query(
      `SELECT config_value FROM config WHERE config_key = 'total_spaces'`
    );
    const totalSpaces = parseInt(capacityResult.rows[0]?.config_value || 50);

    // Calculate average occupancy
    const totalBookings = parseInt(occupancyResult.rows[0].total_bookings);
    const daysWithBookings = parseInt(occupancyResult.rows[0].days_with_bookings) || 1;
    const averageOccupancy = daysWithBookings > 0 
      ? ((totalBookings / daysWithBookings / totalSpaces) * 100).toFixed(2)
      : 0;

    // Most popular spaces (top 5)
    const popularSpacesResult = await pool.query(
      `SELECT space_number, COUNT(*) as booking_count
       FROM bookings 
       WHERE cancelled_at IS NULL
       GROUP BY space_number
       ORDER BY booking_count DESC
       LIMIT 5`
    );

    // Busiest days (last 30 days)
    const busiestDaysResult = await pool.query(
      `SELECT booking_date, COUNT(*) as booking_count
       FROM bookings 
       WHERE cancelled_at IS NULL 
       AND booking_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY booking_date
       ORDER BY booking_count DESC
       LIMIT 5`
    );

    res.json({
      statistics: {
        totalUsers: parseInt(totalUsersResult.rows[0].count),
        totalBookings: parseInt(totalBookingsResult.rows[0].count),
        activeBookings: parseInt(activeBookingsResult.rows[0].count),
        todayBookings: parseInt(todayBookingsResult.rows[0].count),
        totalCapacity: totalSpaces,
        averageOccupancyLast7Days: parseFloat(averageOccupancy),
        popularSpaces: popularSpacesResult.rows.map(row => ({
          spaceNumber: row.space_number,
          bookingCount: parseInt(row.booking_count)
        })),
        busiestDays: busiestDaysResult.rows.map(row => ({
          date: row.booking_date,
          bookingCount: parseInt(row.booking_count)
        }))
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics'
    });
  }
};

/**
 * Deactivate/Activate user (admin only)
 * PATCH /api/admin/users/:id/status
 */
const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { is_active } = req.body;

    // Prevent admin from deactivating themselves
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({
        error: 'Cannot modify own status',
        message: 'You cannot deactivate your own account'
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING user_id, name, email, is_active`,
      [is_active, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        isActive: user.is_active
      }
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      error: 'Failed to update user status'
    });
  }
};

/**
 * Cancel any booking (admin only)
 * DELETE /api/admin/bookings/:id
 */
const adminCancelBooking = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const bookingId = req.params.id;
    const adminId = req.user.userId;
    const { reason } = req.body;

    // Get the booking
    const bookingResult = await client.query(
      `SELECT booking_id, user_id, booking_date, cancelled_at
       FROM bookings 
       WHERE booking_id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    const booking = bookingResult.rows[0];

    // Check if already cancelled
    if (booking.cancelled_at) {
      return res.status(400).json({
        error: 'Booking already cancelled'
      });
    }

    // Admin can cancel any booking, including past ones
    await client.query(
      `UPDATE bookings 
       SET cancelled_at = CURRENT_TIMESTAMP, 
           cancelled_by = $1,
           cancellation_reason = $2
       WHERE booking_id = $3`,
      [adminId, reason || 'Cancelled by admin', bookingId]
    );

    res.json({
      message: 'Booking cancelled successfully',
      bookingId: booking.booking_id
    });

  } catch (error) {
    console.error('Admin cancel booking error:', error);
    res.status(500).json({
      error: 'Failed to cancel booking'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllBookings,
  getAllUsers,
  updateCapacity,
  getConfig,
  getStatistics,
  toggleUserStatus,
  adminCancelBooking
};