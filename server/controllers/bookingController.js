const { pool } = require('../config/database');

/**
 * Create a new booking
 * POST /api/bookings
 */
const createBooking = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { booking_date, space_number, vehicle_registration } = req.body;
    const userId = req.user.userId;

    // Validate booking date is not in the past
    const bookingDate = new Date(booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDate < today) {
      return res.status(400).json({
        error: 'Invalid booking date',
        message: 'Cannot book parking for a past date'
      });
    }

    // Check 24-hour booking window
    const maxBookingDate = new Date();
    maxBookingDate.setHours(23, 59, 59, 999);
    maxBookingDate.setDate(maxBookingDate.getDate() + 1); // Tomorrow end of day
    
    if (bookingDate > maxBookingDate) {
      return res.status(400).json({
        error: 'Booking window exceeded',
        message: 'You can only book up to 24 hours in advance'
      });
    }

    // Start transaction after basic validations
    await client.query('BEGIN');

    // Check if user already has a booking for this date
    const existingUserBooking = await client.query(
      `SELECT booking_id FROM bookings 
       WHERE user_id = $1 AND booking_date = $2 AND cancelled_at IS NULL`,
      [userId, booking_date]
    );

    if (existingUserBooking.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Booking conflict',
        message: 'You already have a booking for this date'
      });
    }

    // Check if space is available for this date (with row locking)
    const spaceCheck = await client.query(
      `SELECT booking_id FROM bookings 
       WHERE space_number = $1 AND booking_date = $2 AND cancelled_at IS NULL
       FOR UPDATE`,
      [space_number, booking_date]
    );

    if (spaceCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Space unavailable',
        message: 'This parking space is already booked for the selected date'
      });
    }

    // Get total spaces from config
    const configResult = await client.query(
      `SELECT config_value FROM config WHERE config_key = 'total_spaces'`
    );
    const totalSpaces = parseInt(configResult.rows[0]?.config_value || 50);

    // Validate space number
    if (space_number < 1 || space_number > totalSpaces) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Invalid space number',
        message: `Space number must be between 1 and ${totalSpaces}`
      });
    }

    // Create the booking
    const result = await client.query(
      `INSERT INTO bookings (user_id, booking_date, space_number, vehicle_registration)
       VALUES ($1, $2, $3, $4)
       RETURNING booking_id, user_id, booking_date, space_number, vehicle_registration, created_at`,
      [userId, booking_date, space_number, vehicle_registration || null]
    );

    const booking = result.rows[0];

    // Commit transaction
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        bookingId: booking.booking_id,
        userId: booking.user_id,
        bookingDate: booking.booking_date,
        spaceNumber: booking.space_number,
        vehicleRegistration: booking.vehicle_registration,
        createdAt: booking.created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create booking error:', error);
    
    // Handle unique constraint violation (race condition)
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Booking conflict',
        message: 'This space was just booked by another user. Please select a different space.'
      });
    }
    
    res.status(500).json({
      error: 'Booking failed',
      message: 'An error occurred while creating the booking'
    });
  } finally {
    client.release();
  }
};

/**
 * Get user's bookings
 * GET /api/bookings
 */
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { include_past } = req.query;

    let query = `
      SELECT booking_id, user_id, booking_date, space_number, 
             vehicle_registration, created_at, cancelled_at
      FROM bookings 
      WHERE user_id = $1 AND cancelled_at IS NULL
    `;

    // By default, only show current and future bookings
    if (include_past !== 'true') {
      query += ` AND booking_date >= CURRENT_DATE`;
    }

    query += ` ORDER BY booking_date ASC`;

    const result = await pool.query(query, [userId]);

    res.json({
      bookings: result.rows.map(booking => ({
        bookingId: booking.booking_id,
        userId: booking.user_id,
        bookingDate: booking.booking_date,
        spaceNumber: booking.space_number,
        vehicleRegistration: booking.vehicle_registration,
        createdAt: booking.created_at
      })),
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      error: 'Failed to retrieve bookings'
    });
  }
};

/**
 * Get a specific booking
 * GET /api/bookings/:id
 */
const getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT booking_id, user_id, booking_date, space_number, 
              vehicle_registration, created_at, cancelled_at
       FROM bookings 
       WHERE booking_id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    const booking = result.rows[0];

    // Users can only view their own bookings (unless admin)
    if (booking.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own bookings'
      });
    }

    res.json({
      booking: {
        bookingId: booking.booking_id,
        userId: booking.user_id,
        bookingDate: booking.booking_date,
        spaceNumber: booking.space_number,
        vehicleRegistration: booking.vehicle_registration,
        createdAt: booking.created_at,
        cancelledAt: booking.cancelled_at
      }
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      error: 'Failed to retrieve booking'
    });
  }
};

/**
 * Cancel a booking
 * DELETE /api/bookings/:id
 */
const cancelBooking = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const bookingId = req.params.id;
    const userId = req.user.userId;

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

    // Users can only cancel their own bookings (unless admin)
    if (booking.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only cancel your own bookings'
      });
    }

    // Check if already cancelled
    if (booking.cancelled_at) {
      return res.status(400).json({
        error: 'Booking already cancelled'
      });
    }

    // Check if booking is in the past
    const bookingDate = new Date(booking.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return res.status(400).json({
        error: 'Cannot cancel past booking',
        message: 'You cannot cancel a booking for a past date'
      });
    }

    // Cancel the booking
    await client.query(
      `UPDATE bookings 
       SET cancelled_at = CURRENT_TIMESTAMP, cancelled_by = $1
       WHERE booking_id = $2`,
      [userId, bookingId]
    );

    res.json({
      message: 'Booking cancelled successfully',
      bookingId: booking.booking_id
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      error: 'Failed to cancel booking'
    });
  } finally {
    client.release();
  }
};

/**
 * Check availability for a specific date
 * GET /api/bookings/availability/:date
 */
const checkAvailability = async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'Date must be in YYYY-MM-DD format'
      });
    }

    // Get total spaces
    const configResult = await pool.query(
      `SELECT config_value FROM config WHERE config_key = 'total_spaces'`
    );
    const totalSpaces = parseInt(configResult.rows[0]?.config_value || 50);

    // Get booked spaces for this date
    const bookedResult = await pool.query(
      `SELECT space_number 
       FROM bookings 
       WHERE booking_date = $1 AND cancelled_at IS NULL
       ORDER BY space_number`,
      [date]
    );

    const bookedSpaces = bookedResult.rows.map(row => row.space_number);
    const availableSpaces = [];

    // Calculate available spaces
    for (let i = 1; i <= totalSpaces; i++) {
      if (!bookedSpaces.includes(i)) {
        availableSpaces.push(i);
      }
    }

    res.json({
      date,
      totalSpaces,
      bookedCount: bookedSpaces.length,
      availableCount: availableSpaces.length,
      bookedSpaces,
      availableSpaces
    });

  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      error: 'Failed to check availability'
    });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  checkAvailability
};