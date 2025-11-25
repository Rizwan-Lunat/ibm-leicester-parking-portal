import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { bookingAPI } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSpace, setSelectedSpace] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    try {
      const response = await bookingAPI.getUserBookings();
      setBookings(response.data.bookings);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  };

  const checkAvailability = async (date) => {
    try {
      const response = await bookingAPI.checkAvailability(date);
      setAvailability(response.data);
    } catch (err) {
      setError('Failed to check availability');
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
    setLoading(true);

    try {
      await bookingAPI.create({
        booking_date: selectedDate,
        space_number: parseInt(selectedSpace),
        vehicle_registration: vehicleReg || null
      });
      
      setSuccess('Booking created successfully!');
      setSelectedDate('');
      setSelectedSpace('');
      setVehicleReg('');
      setAvailability(null);
      loadBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    }
    
    setLoading(false);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingAPI.cancel(bookingId);
      setSuccess('Booking cancelled successfully');
      loadBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed');
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
        <button onClick={handleLogout} className="btn-secondary">
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        {/* Book Parking Section */}
        <div className="dashboard-card">
          <h2>Book Parking Space</h2>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={handleBooking} className="booking-form">
            <div className="form-group">
              <label htmlFor="date">Select Date (Up to 24 hours ahead)</label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={handleDateChange}
                min={getTomorrowDate()}
                max={getTomorrowDate()}
                required
                disabled={loading}
              />
            </div>

            {availability && (
              <div className="availability-info">
                <p><strong>Available Spaces:</strong> {availability.availableCount} / {availability.totalSpaces}</p>
              </div>
            )}

            {availability && availability.availableCount > 0 && (
              <>
                <div className="form-group">
                  <label htmlFor="space">Select Space</label>
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
                  <label htmlFor="vehicle">Vehicle Registration (Optional)</label>
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
                  disabled={loading || !selectedSpace}
                >
                  {loading ? 'Booking...' : 'Book Space'}
                </button>
              </>
            )}

            {availability && availability.availableCount === 0 && (
              <p className="no-spaces">No spaces available for this date</p>
            )}
          </form>
        </div>

        {/* My Bookings Section */}
        <div className="dashboard-card">
          <h2>My Bookings</h2>
          
          {bookings.length === 0 ? (
            <p className="no-bookings">You have no active bookings</p>
          ) : (
            <div className="bookings-list">
              {bookings.map(booking => (
                <div key={booking.bookingId} className="booking-item">
                  <div className="booking-info">
                    <h3>Space {booking.spaceNumber}</h3>
                    <p><strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString('en-GB')}</p>
                    {booking.vehicleRegistration && (
                      <p><strong>Vehicle:</strong> {booking.vehicleRegistration}</p>
                    )}
                    <p className="booking-created">
                      Booked: {new Date(booking.createdAt).toLocaleString('en-GB')}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleCancelBooking(booking.bookingId)}
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