import axios from 'axios';
import ErrorHandler from '../utils/ErrorHandler';

// Determine the API base URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set via environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // For development or when running locally
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api';
  }
  
  // For production, try to use the same host as the frontend
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // If running on localhost or 127.0.0.1, use localhost for API
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // Otherwise, use the same hostname as the frontend
  return `${protocol}//${hostname}:5000/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Debug logging for development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    baseURL: API_BASE_URL,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    env: process.env.NODE_ENV
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
    const token = localStorage.getItem('nms_token');
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
  getProfile: () => api.get('/auth/profile'),
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
  startScan: (params) => api.post('/discovery/scan', params),
  stopScan: () => api.post('/discovery/stop'),
  getStatus: () => api.get('/discovery/status'),
  getDevices: (params) => api.get('/discovery/devices', { params }),
};

export default api;