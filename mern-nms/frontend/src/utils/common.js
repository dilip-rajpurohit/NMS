import { Badge } from 'react-bootstrap';

/**
 * Format bytes into human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string with appropriate unit
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format percentage value with 2 decimal places
 * @param {number} value - Percentage value
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value) => {
  return `${parseFloat(value).toFixed(2)}%`;
};

/**
 * Format uptime in seconds to human readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
export const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

/**
 * Get Bootstrap badge component for severity levels
 * @param {string} severity - Severity level (critical, high, medium, low)
 * @returns {JSX.Element} Bootstrap Badge component
 */
export const getSeverityBadge = (severity) => {
  const variants = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'secondary'
  };
  return (
    <Badge bg={variants[severity] || 'secondary'}>
      {severity}
    </Badge>
  );
};

/**
 * Get Bootstrap badge component for status
 * @param {string} status - Status value
 * @param {Object} statusMap - Optional mapping of status to badge variants
 * @returns {JSX.Element} Bootstrap Badge component
 */
export const getStatusBadge = (status, statusMap = {}) => {
  const defaultMap = {
    online: 'success',
    offline: 'danger',
    active: 'success',
    inactive: 'secondary',
    up: 'success',
    down: 'danger',
    warning: 'warning',
    error: 'danger',
    enabled: 'success',
    disabled: 'secondary'
  };
  
  const variants = { ...defaultMap, ...statusMap };
  return (
    <Badge bg={variants[status] || 'secondary'}>
      {status}
    </Badge>
  );
};

/**
 * Format timestamp to locale string
 * @param {string|Date} timestamp - Timestamp value
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatTimestamp = (timestamp, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(timestamp).toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

/**
 * Debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate IP address format
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP format
 */
export const isValidIP = (ip) => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

/**
 * Generate random ID for temporary use
 * @returns {string} Random ID string
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Common loading spinner component
 * @param {string} message - Optional loading message
 * @returns {JSX.Element} Loading spinner component
 */
export const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
    <div className="text-center">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">{message}</span>
      </div>
      <div className="mt-2 text-muted">{message}</div>
    </div>
  </div>
);

/**
 * Common error message component
 * @param {string} message - Error message
 * @param {Function} onRetry - Optional retry function
 * @returns {JSX.Element} Error message component
 */
export const ErrorMessage = ({ message, onRetry }) => (
  <div className="alert alert-danger" role="alert">
    <i className="fas fa-exclamation-triangle me-2"></i>
    {message}
    {onRetry && (
      <button className="btn btn-outline-danger btn-sm ms-2" onClick={onRetry}>
        <i className="fas fa-redo me-1"></i>
        Retry
      </button>
    )}
  </div>
);

/**
 * Common empty state component
 * @param {string} title - Empty state title
 * @param {string} description - Empty state description
 * @param {string} icon - FontAwesome icon class
 * @param {JSX.Element} action - Optional action button
 * @returns {JSX.Element} Empty state component
 */
export const EmptyState = ({ title, description, icon = 'fas fa-inbox', action }) => (
  <div className="text-center py-5">
    <i className={`${icon} fa-3x text-muted mb-3`}></i>
    <h4 className="text-muted">{title}</h4>
    <p className="text-muted">{description}</p>
    {action}
  </div>
);