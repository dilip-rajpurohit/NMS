import axios from 'axios';
import ErrorHandler from '../utils/ErrorHandler';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
    console.error('API Error:', error);

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