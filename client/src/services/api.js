import axios from 'axios';

// Base API configuration
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
};

// Booking API calls
export const bookingAPI = {
  create: (bookingData) => api.post('/bookings', bookingData),
  getUserBookings: () => api.get('/bookings'),
  getBookingById: (id) => api.get(`/bookings/${id}`),
  cancel: (id) => api.delete(`/bookings/${id}`),
  checkAvailability: (date) => api.get(`/bookings/availability/${date}`),
};

// Admin API calls
export const adminAPI = {
  getAllBookings: (params) => api.get('/admin/bookings', { params }),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  getStats: () => api.get('/admin/stats'),
  getConfig: () => api.get('/admin/config'),
  updateCapacity: (total_spaces) => api.put('/admin/config/capacity', { total_spaces }),
  toggleUserStatus: (userId, is_active) => api.patch(`/admin/users/${userId}/status`, { is_active }),
  cancelBooking: (bookingId, reason) => api.delete(`/admin/bookings/${bookingId}`, { data: { reason } }),
};

export default api;