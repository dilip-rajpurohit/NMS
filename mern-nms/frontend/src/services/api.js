import axios from 'axios';
import ErrorHandler from '../utils/ErrorHandler';

// Determine the API base URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set via environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // For production, try to use the same host as the frontend
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // Use environment variable or fallback to default port
  const backendPort = process.env.REACT_APP_BACKEND_PORT || '5000';
  return `${protocol}//${hostname}:${backendPort}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Debug logging for development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    baseURL: API_BASE_URL,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    env: process.env.NODE_ENV,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    REACT_APP_BACKEND_PORT: process.env.REACT_APP_BACKEND_PORT
  });
} else {
  console.log('🔧 Production API Configuration:', {
    baseURL: API_BASE_URL,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL
  });
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Support both legacy 'token' and new 'nms_token' keys to ensure compatibility
    const token = localStorage.getItem('nms_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and network issues
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle authentication errors by clearing tokens
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Only auto-logout for authentication/verification endpoints that indicate invalid session
      const url = error.config?.url;
      const isAuthVerification = url?.includes('/auth/verify') || url?.includes('/auth/login');
      
      if (isAuthVerification) {
        console.warn('Authentication verification failed, clearing tokens');
        // Clear tokens from localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('nms_token');
          localStorage.removeItem('token');
          localStorage.removeItem('nms_user');
          sessionStorage.removeItem('nms_token');
          sessionStorage.removeItem('token');
        }
        // Clear authorization header
        delete api.defaults.headers.common['Authorization'];
        
        // If this is not already a login page, reload to trigger login
        if (!window.location.pathname.includes('login') && !window.location.pathname.includes('auth')) {
          console.log('Redirecting to login due to authentication verification failure');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        // For other 401/403 errors, just log them without auto-logout
        console.warn('Access denied for request:', url, 'Status:', error.response?.status);
      }
    }

    // Enhanced error logging for network issues
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.error('🚨 Network Connection Error:', {
        message: 'Cannot connect to backend API',
        apiUrl: API_BASE_URL,
        currentUrl: window.location.href,
        suggestion: 'Check if backend is running and accessible'
      });
    } else if (error.response?.status === 0) {
      console.error('🚨 CORS or Network Error:', {
        message: 'Request blocked or network unreachable',
        apiUrl: API_BASE_URL,
        suggestion: 'Check CORS settings or network connectivity'
      });
    } else {
      console.error('API Error:', error);
    }

    // Delegate to centralized handler (shows toast, redirects on 401)
    try {
      ErrorHandler.handleApiError(error, 'Request failed');
    } catch (_) {
      // no-op if toast fails
    }

    return Promise.reject(error);
  }
);

// Helper function to set auth token
api.setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verify: () => api.get('/auth/verify'),
};

export const devicesAPI = {
  getAll: (params) => api.get('/devices', { params }),
  getById: (id) => api.get(`/devices/${id}`),
  create: (device) => api.post('/devices', device),
  update: (id, device) => api.put(`/devices/${id}`, device),
  delete: (id) => api.delete(`/devices/${id}`),
  updateMetrics: (id, metrics) => api.post(`/devices/${id}/metrics`, metrics),
  getStats: () => api.get('/devices/stats/overview'),
};

export const topologyAPI = {
  get: () => api.get('/topology'),
  createLink: (link) => api.post('/topology/links', link),
  updateLink: (id, link) => api.put(`/topology/links/${id}`, link),
  deleteLink: (id) => api.delete(`/topology/links/${id}`),
  getNeighbors: (deviceId) => api.get(`/topology/neighbors/${deviceId}`),
  refresh: () => api.post('/topology/refresh'),
};

export const metricsAPI = {
  getDeviceMetrics: (deviceId, params) => api.get(`/metrics/devices/${deviceId}`, { params }),
  getOverview: (params) => api.get('/metrics/overview', { params }),
};

export const discoveryAPI = {
  getConfig: () => api.get('/discovery/config'),
  updateConfig: (config) => api.put('/discovery/config', config),
  getNetworks: () => api.get('/discovery/networks'),
  startScan: (params) => api.post('/discovery/scan', params),
  stopScan: () => api.post('/discovery/stop'),
  getStatus: () => api.get('/discovery/status'),
  getDevices: (params) => api.get('/discovery/devices', { params }),
};

export const profileAPI = {
  // Get complete user profile
  getProfile: () => api.get('/profile'),
  
  // Personal Information
  updatePersonalInfo: (data) => api.put('/profile/personal', data),
  
  // Email Management  
  updateEmail: (data) => api.put('/profile/email', data),
  
  // Avatar and Cover
  updateAvatar: (avatar) => api.put('/profile/avatar', { avatar }),
  updateCover: (coverImage) => api.put('/profile/cover', { coverImage }),
  
  // Password Management
  changePassword: (data) => api.put('/profile/password', data),
  
  // OTP-based Password Change
  requestPasswordOTP: (data) => api.post('/profile/password/request-otp', data),
  verifyPasswordOTP: (data) => api.post('/profile/password/verify-otp', data),
  
  // Preferences (Theme, Notifications, Interface)
  updatePreferences: (preferences) => api.put('/profile/preferences', preferences),
  
  // Two-Factor Authentication
  updateTwoFactor: (data) => api.put('/profile/two-factor', data),
  
  // Login Sessions Management
  getLoginSessions: () => api.get('/profile/login-sessions'),
  terminateSession: (sessionId) => api.delete(`/profile/login-sessions/${sessionId}`),
  
  // Profile Statistics
  updateStats: (stats) => api.put('/profile/stats', stats),
};

// Email Verification API
export const emailVerificationAPI = {
  // Request email change with verification
  requestEmailChange: (data) => api.post('/email-verification/request-change', data),
  
  // Verify email change token
  verifyEmailChange: (data) => api.post('/email-verification/verify', data),
  
  // Get current verification status
  getVerificationStatus: () => api.get('/email-verification/status'),
  
  // Cancel pending verification
  cancelVerification: () => api.delete('/email-verification/cancel')
};

export default api;