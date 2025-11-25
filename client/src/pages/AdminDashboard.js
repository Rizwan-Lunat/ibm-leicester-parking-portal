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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredStats, setFilteredStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookings, setSelectedBookings] = useState([]);

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

  // ADD THESE TWO FUNCTIONS HERE:
  
  const handleFilterStats = async () => {
    if (!dateFrom || !dateTo) return;
    
    setLoading(true);
    try {
      // Load all bookings to filter
      const bookingsRes = await adminAPI.getAllBookings();
      const allBookings = bookingsRes.data.bookings;
      
      // Filter by date range
      const bookingsInRange = allBookings.filter(booking => {
        const bookingDate = new Date(booking.bookingDate);
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        return bookingDate >= from && bookingDate <= to;
      });
      
      // Calculate filtered stats
      const filtered = {
        ...stats,
        totalBookings: bookingsInRange.length,
        activeBookings: bookingsInRange.filter(b => new Date(b.bookingDate) >= new Date()).length,
      };
      
      setFilteredStats(filtered);
      setSuccess(`✅ Filter applied`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to filter statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setFilteredStats(null);
    setSuccess('✅ Filter cleared');
    setTimeout(() => setSuccess(''), 3000);
  };

const handleBulkCancel = async () => {
    if (selectedBookings.length === 0) return;
    
    const reason = window.prompt(`Cancel ${selectedBookings.length} booking(s)?\n\nEnter reason:`);
    if (!reason) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Cancel each selected booking
      await Promise.all(
        selectedBookings.map(bookingId => 
          adminAPI.cancelBooking(bookingId, reason)
        )
      );
      
      setSuccess(`✅ Successfully cancelled ${selectedBookings.length} booking(s)`);
      setSelectedBookings([]);
      loadData(); // Reload bookings
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Failed to cancel some bookings');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
  <>
    {/* Date Range Filter */}
    <div className="date-range-filter">
      <h3>📅 Filter Statistics</h3>
      <div className="filter-controls">
        <div className="filter-group">
          <label>From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <button 
          onClick={handleFilterStats}
          className="btn-primary"
          disabled={!dateFrom || !dateTo}
        >
          Apply Filter
        </button>
        {(dateFrom || dateTo) && (
          <button 
            onClick={handleClearFilter}
            className="btn-secondary"
          >
            Clear Filter
          </button>
        )}
      </div>
      {filteredStats && (
        <p className="filter-info">
          Showing stats from {new Date(dateFrom).toLocaleDateString('en-GB')} to {new Date(dateTo).toLocaleDateString('en-GB')}
        </p>
      )}
    </div>

    <div className="stats-grid">
      <div className="stat-card">
        <h3>Total Users</h3>
        <p className="stat-number">{(filteredStats || stats).totalUsers}</p>
      </div>
      <div className="stat-card">
        <h3>Total Bookings</h3>
        <p className="stat-number">{(filteredStats || stats).totalBookings}</p>
      </div>
      <div className="stat-card">
        <h3>Active Bookings</h3>
        <p className="stat-number">{(filteredStats || stats).activeBookings}</p>
      </div>
      <div className="stat-card">
        <h3>Today's Bookings</h3>
        <p className="stat-number">{(filteredStats || stats).todayBookings}</p>
      </div>
      <div className="stat-card">
        <h3>Total Capacity</h3>
        <p className="stat-number">{(filteredStats || stats).totalCapacity}</p>
      </div>
      <div className="stat-card">
        <h3>Avg Occupancy (7d)</h3>
        <p className="stat-number">{(filteredStats || stats).averageOccupancyLast7Days}%</p>
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
  </>
)}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div className="bookings-table-container">
                <h2>All Bookings ({bookings.length})</h2>
                
                {/* Search and Bulk Actions */}
                <div className="bookings-controls">
                  <input
                    type="text"
                    placeholder="🔍 Search by user name, email, or date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {selectedBookings.length > 0 && (
                    <button
                      onClick={handleBulkCancel}
                      className="btn-danger"
                    >
                      Cancel Selected ({selectedBookings.length})
                    </button>
                  )}
                </div>

                {bookings.length === 0 ? (
                  <p className="no-data">No bookings found</p>
                ) : (
                  <table className="bookings-table">
                    <thead>
                      <tr>
  <th>
    <input
      type="checkbox"
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedBookings(bookings.map(b => b.bookingId));
        } else {
          setSelectedBookings([]);
        }
      }}
      checked={selectedBookings.length === bookings.length && bookings.length > 0}
    />
  </th>
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
                      {bookings
  .filter(booking => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      booking.userName.toLowerCase().includes(search) ||
      booking.userEmail.toLowerCase().includes(search) ||
      booking.bookingDate.includes(search) ||
      booking.spaceNumber.toString().includes(search)
    );
  })
  .map(booking => (
                        <tr key={booking.bookingId}>
  <td>
    <input
      type="checkbox"
      checked={selectedBookings.includes(booking.bookingId)}
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedBookings([...selectedBookings, booking.bookingId]);
        } else {
          setSelectedBookings(selectedBookings.filter(id => id !== booking.bookingId));
        }
      }}
    />
  </td>
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