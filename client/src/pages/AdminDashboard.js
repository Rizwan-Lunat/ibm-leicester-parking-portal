import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminAPI, bookingAPI } from '../services/api';
import './AdminDashboard.css';

function AdminDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [newCapacity, setNewCapacity] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availability, setAvailability] = useState(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // Load data when tab changes
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (activeTab === 'stats') {
        const statsRes = await adminAPI.getStats();
        setStats(statsRes.data.statistics);
        
        const configRes = await adminAPI.getConfig();
        setConfig(configRes.data.config);
      } else if (activeTab === 'bookings') {
        const bookingsRes = await adminAPI.getAllBookings();
        setBookings(bookingsRes.data.bookings);
      } else if (activeTab === 'users') {
        const usersRes = await adminAPI.getAllUsers();
        setUsers(usersRes.data.users);
      }
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    }
    
    setLoading(false);
  };

  const handleUpdateCapacity = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await adminAPI.updateCapacity(parseInt(newCapacity));
      setSuccess(`Capacity updated to ${newCapacity} spaces`);
      setNewCapacity('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update capacity');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) {
      return;
    }

    try {
      await adminAPI.toggleUserStatus(userId, !currentStatus);
      setSuccess('User status updated successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    const reason = window.prompt('Enter cancellation reason:');
    if (!reason) return;

    try {
      await adminAPI.cancelBooking(bookingId, reason);
      setSuccess('Booking cancelled successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
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
    if (date) {
      checkAvailability(date);
    } else {
      setAvailability(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome, {user?.name}</p>
        </div>
        <div className="header-buttons">
          <button onClick={handleBackToDashboard} className="btn-secondary">
            User Dashboard
          </button>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="admin-tabs">
        <button 
          className={activeTab === 'stats' ? 'tab-active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistics
        </button>
        <button 
          className={activeTab === 'bookings' ? 'tab-active' : ''}
          onClick={() => setActiveTab('bookings')}
        >
          📅 All Bookings
        </button>
        <button 
          className={activeTab === 'users' ? 'tab-active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          className={activeTab === 'availability' ? 'tab-active' : ''}
          onClick={() => setActiveTab('availability')}
        >
          🚗 Availability
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {/* Statistics Tab */}
            {activeTab === 'stats' && stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Users</h3>
                  <p className="stat-number">{stats.totalUsers}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Bookings</h3>
                  <p className="stat-number">{stats.totalBookings}</p>
                </div>
                <div className="stat-card">
                  <h3>Active Bookings</h3>
                  <p className="stat-number">{stats.activeBookings}</p>
                </div>
                <div className="stat-card">
                  <h3>Today's Bookings</h3>
                  <p className="stat-number">{stats.todayBookings}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Capacity</h3>
                  <p className="stat-number">{stats.totalCapacity}</p>
                </div>
                <div className="stat-card">
                  <h3>Avg Occupancy (7d)</h3>
                  <p className="stat-number">{stats.averageOccupancyLast7Days}%</p>
                </div>

                <div className="stat-card wide">
                  <h3>Popular Spaces</h3>
                  <div className="popular-spaces">
                    {stats.popularSpaces.map((space, index) => (
                      <div key={space.spaceNumber} className="popular-space-item">
                        <span className="rank">#{index + 1}</span>
                        <span className="space">Space {space.spaceNumber}</span>
                        <span className="count">{space.bookingCount} bookings</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="stat-card wide">
                  <h3>Busiest Days (Last 30 Days)</h3>
                  <div className="busiest-days">
                    {stats.busiestDays.map(day => (
                      <div key={day.date} className="busy-day-item">
                        <span className="date">{new Date(day.date).toLocaleDateString('en-GB')}</span>
                        <span className="count">{day.bookingCount} bookings</span>
                      </div>
                    ))}
                  </div>
                </div>

                {config && (
                  <div className="stat-card wide">
                    <h3>Update Parking Capacity</h3>
                    <p>Current capacity: <strong>{config.total_spaces.value} spaces</strong></p>
                    <form onSubmit={handleUpdateCapacity} className="capacity-form">
                      <input
                        type="number"
                        value={newCapacity}
                        onChange={(e) => setNewCapacity(e.target.value)}
                        placeholder="Enter new capacity"
                        min="1"
                        max="1000"
                        required
                      />
                      <button type="submit" className="btn-primary">
                        Update Capacity
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div className="bookings-table-container">
                <h2>All Bookings ({bookings.length})</h2>
                {bookings.length === 0 ? (
                  <p className="no-data">No bookings found</p>
                ) : (
                  <table className="bookings-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Date</th>
                        <th>Space</th>
                        <th>Vehicle</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(booking => (
                        <tr key={booking.bookingId}>
                          <td>{booking.bookingId}</td>
                          <td>
                            <div>{booking.userName}</div>
                            <small>{booking.userEmail}</small>
                          </td>
                          <td>{new Date(booking.bookingDate).toLocaleDateString('en-GB')}</td>
                          <td><strong>Space {booking.spaceNumber}</strong></td>
                          <td>{booking.vehicleRegistration || '-'}</td>
                          <td><small>{new Date(booking.createdAt).toLocaleString('en-GB')}</small></td>
                          <td>
                            <button 
                              onClick={() => handleCancelBooking(booking.bookingId)}
                              className="btn-danger-small"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="users-table-container">
                <h2>All Users ({users.length})</h2>
                {users.length === 0 ? (
                  <p className="no-data">No users found</p>
                ) : (
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.userId}>
                          <td>{u.userId}</td>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>{u.phone || '-'}</td>
                          <td>
                            <span className={`role-badge ${u.role}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${u.isActive ? 'active' : 'inactive'}`}>
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            {u.userId !== user.userId && (
                              <button 
                                onClick={() => handleToggleUserStatus(u.userId, u.isActive)}
                                className={u.isActive ? 'btn-danger-small' : 'btn-success-small'}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <div className="availability-container">
                <h2>Check Space Availability</h2>
                <div className="availability-form">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                  />
                </div>

                {availability && (
                  <div className="availability-results">
                    <div className="availability-summary">
                      <h3>Summary for {new Date(availability.date).toLocaleDateString('en-GB')}</h3>
                      <div className="summary-stats">
                        <div className="summary-item">
                          <span className="label">Total Spaces:</span>
                          <span className="value">{availability.totalSpaces}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">Booked:</span>
                          <span className="value booked">{availability.bookedCount}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">Available:</span>
                          <span className="value available">{availability.availableCount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="spaces-grid">
                      <div className="spaces-section">
                        <h4>🔴 Booked Spaces ({availability.bookedCount})</h4>
                        <div className="space-chips">
                          {availability.bookedSpaces.length === 0 ? (
                            <p className="no-spaces">No booked spaces</p>
                          ) : (
                            availability.bookedSpaces.map(space => (
                              <span key={space} className="space-chip booked">
                                {space}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="spaces-section">
                        <h4>🟢 Available Spaces ({availability.availableCount})</h4>
                        <div className="space-chips">
                          {availability.availableSpaces.length === 0 ? (
                            <p className="no-spaces">No available spaces</p>
                          ) : (
                            availability.availableSpaces.map(space => (
                              <span key={space} className="space-chip available">
                                {space}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;