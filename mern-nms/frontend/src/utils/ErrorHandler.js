import { toast } from 'react-toastify';

// Global error handler for API calls and other async operations
class ErrorHandler {
  static handleApiError(error, defaultMessage = 'An error occurred') {
    let message = defaultMessage;
    let variant = 'error';

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          message = data.message || 'Invalid request';
          break;
        case 401:
          message = 'Authentication required';
          variant = 'warning';
          // Redirect to login if needed
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 403:
          message = 'Access denied';
          variant = 'warning';
          break;
        case 404:
          message = 'Resource not found';
          break;
        case 429:
          message = 'Too many requests. Please try again later.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        case 503:
          message = 'Service unavailable. Please try again later.';
          break;
        default:
          message = data.message || `Error ${status}: ${defaultMessage}`;
      }
    } else if (error.request) {
      // Network error
      message = 'Network error. Please check your connection.';
    } else {
      // Other error
      message = error.message || defaultMessage;
    }

    // Show toast notification
    toast[variant](message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });

    return { message, variant, status: error.response?.status };
  }

  static handleNetworkError() {
    toast.error('Network connection lost. Please check your internet connection.', {
      position: "top-right",
      autoClose: false,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  static handleSuccess(message) {
    toast.success(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  static handleWarning(message) {
    toast.warning(message, {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  static handleInfo(message) {
    toast.info(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  // Generic error logging for development
  static logError(error, context = '') {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error in ${context || 'Unknown context'}`);
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      if (context) console.info('Context:', context);
      console.groupEnd();
    }
  }

  // Handle form validation errors
  static handleValidationErrors(errors) {
    if (Array.isArray(errors)) {
      errors.forEach(error => {
        toast.error(error.message || error, {
          position: "top-right",
          autoClose: 4000,
        });
      });
    } else if (typeof errors === 'object') {
      Object.values(errors).forEach(error => {
        toast.error(error, {
          position: "top-right",
          autoClose: 4000,
        });
      });
    } else {
      toast.error(errors || 'Validation failed', {
        position: "top-right",
        autoClose: 4000,
      });
    }
  }
}

export default ErrorHandler;