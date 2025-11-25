import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { bookingAPI } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
 const [bookings, setBookings] = useState([]);
const [availableSpaces, setAvailableSpaces] = useState([]);
const [totalSpaces, setTotalSpaces] = useState(0);
const [bookingDate, setBookingDate] = useState('');
const [spaceNumber, setSpaceNumber] = useState('');
const [vehicleRegistration, setVehicleRegistration] = useState('');
const [error, setError] = useState('');
const [success, setSuccess] = useState('');

// Loading states
const [loadingBookings, setLoadingBookings] = useState(true);
const [loadingAvailability, setLoadingAvailability] = useState(false);
const [creatingBooking, setCreatingBooking] = useState(false);

// Additional state for form (ADD THESE 5 LINES)
const [selectedDate, setSelectedDate] = useState('');
const [selectedSpace, setSelectedSpace] = useState('');
const [vehicleReg, setVehicleReg] = useState('');
const [availability, setAvailability] = useState(null);
const [loading, setLoading] = useState(false);

  // Get today's date
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Get tomorrow's date (24-hour booking window)
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

  // Load user's bookings
  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
  setLoadingBookings(true);
  try {
    const response = await bookingAPI.getUserBookings();
    setBookings(response.data.bookings || []);
  } catch (error) {
    console.error('Error loading bookings:', error);
    setError('Failed to load bookings');
  } finally {
    setLoadingBookings(false);
  }
};

  const checkAvailability = async (date) => {
  setLoadingAvailability(true);
  try {
    const response = await bookingAPI.checkAvailability(date);
    
    // Set both the old format AND the new availability object
    setAvailableSpaces(response.data.availableSpaces || []);
    setTotalSpaces(response.data.totalSpaces || 0);
    
    // Set availability object for the form
    setAvailability({
      availableSpaces: response.data.availableSpaces || [],
      availableCount: response.data.availableSpaces?.length || 0,
      totalSpaces: response.data.totalSpaces || 0
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    setError('Failed to check availability');
    setAvailableSpaces([]);
    setTotalSpaces(0);
    setAvailability(null);
  } finally {
    setLoadingAvailability(false);
  }
};

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setSelectedSpace('');
    if (date) {
      checkAvailability(date);
    } else {
      setAvailability(null);
    }
  };

  const handleBooking = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  setCreatingBooking(true);
  
  try {
    await bookingAPI.create({
      booking_date: selectedDate,
      space_number: parseInt(selectedSpace),
      vehicle_registration: vehicleReg || null
    });
    
    setSuccess('✅ Booking created successfully!');
    
    // Auto-dismiss success message after 5 seconds
    setTimeout(() => {
      setSuccess('');
    }, 5000);
    
    setBookingDate('');
    setSpaceNumber('');
    setVehicleRegistration('');
    setAvailableSpaces([]);
    setTotalSpaces(0);
    loadBookings();
  } catch (err) {
    // Better error messages
    const errorMessage = err.response?.data?.message;
    
    if (errorMessage?.includes('already have a booking')) {
      setError('⚠️ You already have a booking for this date. Please cancel it first or choose a different date.');
    } else if (errorMessage?.includes('No spaces available')) {
      setError('😞 Sorry, all spaces are booked for this date. Please try another date.');
    } else if (errorMessage?.includes('24-hour window')) {
      setError('⏰ Bookings can only be made for tomorrow (within the 24-hour window).');
    } else if (errorMessage?.includes('past date')) {
      setError('📅 Cannot book spaces for past dates. Please select a future date.');
    } else {
      setError(errorMessage || '❌ Failed to create booking. Please try again.');
    }
  } finally {
    setCreatingBooking(false);
  }
};

  const handleCancelBooking = async (bookingId, bookingDate) => {
  // Format date nicely for confirmation
  const formattedDate = new Date(bookingDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  const confirmMessage = `Are you sure you want to cancel your parking booking for ${formattedDate}?\n\nThis action cannot be undone.`;
  
  if (!window.confirm(confirmMessage)) {
    return;
  }
  
  try {
    await bookingAPI.cancel(bookingId);
    setSuccess('✅ Booking cancelled successfully!');
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setSuccess('');
    }, 5000);
    
    loadBookings();
  } catch (err) {
    const errorMessage = err.response?.data?.message;
    
    if (err.response?.status === 404) {
      setError('❌ Booking not found. It may have already been cancelled.');
    } else if (err.response?.status === 403) {
      setError('🔒 You don\'t have permission to cancel this booking.');
    } else {
      setError(errorMessage || '❌ Failed to cancel booking. Please try again.');
    }
  }
};

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
  <div>
    <h1>IBM Leicester Parking Portal</h1>
    <p>Welcome, {user?.name}!</p>
  </div>
  <div className="header-buttons">
    {user?.role === 'admin' && (
      <button onClick={() => navigate('/admin')} className="btn-secondary">
        Admin Dashboard
      </button>
    )}
    <button onClick={handleLogout} className="btn-secondary">
      Logout
    </button>
  </div>
</header>

      <div className="dashboard-content">
        {/* Book Parking Section */}
        <div className="dashboard-card">
          <h2>Book Parking Space</h2>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={handleBooking} className="booking-form">
            <div className="form-group">
              <label htmlFor="date">
  Select Date (Up to 24 hours ahead)
  <span className="help-text">📅 You can only book parking up to 24 hours in advance to prevent space hoarding</span>
</label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={handleDateChange}
                min={getTodayDate()}
                max={getTomorrowDate()}
                required
                disabled={loading}
              />
            </div>

            {loadingAvailability ? (
              <p style={{ fontStyle: 'italic', color: '#666', marginTop: '10px' }}>
                Checking availability...
              </p>
            ) : availability && (
              <div className="availability-info">
                <p><strong>Available Spaces:</strong> {availability.availableCount} / {availability.totalSpaces}</p>
              </div>
            )}

            {availability && availability.availableCount > 0 && (
              <>
                <div className="form-group">
                  <label htmlFor="space">
  Select Space
  <span className="help-text">🅿️ Choose any available space</span>
</label>
                  <select
                    id="space"
                    value={selectedSpace}
                    onChange={(e) => setSelectedSpace(e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="">Choose a space...</option>
                    {availability.availableSpaces.map(space => (
                      <option key={space} value={space}>
                        Space {space}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="vehicle">
  Vehicle Registration (Optional)
  <span className="help-text">🚗 Helps reception identify your vehicle if needed</span>
</label>
                  <input
                    type="text"
                    id="vehicle"
                    value={vehicleReg}
                    onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                    placeholder="AB12 CDE"
                    disabled={loading}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={creatingBooking || !selectedSpace}
                >
                  {creatingBooking ? 'Creating Booking...' : 'Book Space'}
                </button>
              </>
            )}

            {availability && availability.availableCount === 0 && (
  <div className="no-spaces-state">
    <p>😞 <strong>Fully Booked</strong></p>
    <p>All {availability.totalSpaces} spaces are reserved for this date. Try selecting a different date or check back later for cancellations.</p>
  </div>
)}
          </form>
        </div>

        {/* My Bookings Section */}
        <div className="dashboard-card">
          <h2>My Bookings</h2>
          
          {loadingBookings ? (
            <div className="loading-state">
              <p>Loading your bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
  <div className="empty-state">
    <p className="empty-icon">🅿️</p>
    <h3>No bookings yet</h3>
    <p>You haven't made any parking reservations. Select a date to get started!</p>
  </div>
          ) : (
            <div className="bookings-list">
              {bookings.map(booking => (
                <div key={booking.bookingId} className="booking-item">
                  <div className="booking-info">
                    <h3>Space {booking.spaceNumber}</h3>
                    <p><strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}</p>
                    {booking.vehicleRegistration && (
                      <p><strong>Vehicle:</strong> {booking.vehicleRegistration}</p>
                    )}
                    <p className="booking-created">
                      <small>Booked: {new Date(booking.createdAt).toLocaleString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</small>
                    </p>
                  </div>
                  <button 
                    onClick={() => handleCancelBooking(booking.bookingId, booking.bookingDate)}
                    className="btn-danger"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;