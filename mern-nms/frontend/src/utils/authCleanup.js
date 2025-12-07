// Authentication cleanup utility
// This helps prevent 403 errors from stale tokens

export const clearAuthData = () => {
  try {
    // Clear localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('nms_token');
      localStorage.removeItem('token');
      localStorage.removeItem('nms_user');
      localStorage.removeItem('user');
      
      // Clear any other potential auth keys
      Object.keys(localStorage).forEach(key => {
        if (key.includes('token') || key.includes('auth') || key.includes('session')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Clear sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('nms_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('nms_user');
      sessionStorage.removeItem('user');
      
      // Clear any other potential auth keys
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('token') || key.includes('auth') || key.includes('session')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    console.log('🔧 Authentication data cleared');
  } catch (error) {
    console.warn('Failed to clear auth data:', error);
  }
};

export const hasValidToken = () => {
  try {
    const token = localStorage.getItem('nms_token') || localStorage.getItem('token');
    if (!token) return false;
    
    // Basic JWT format validation
    if (!token.includes('.') || token.split('.').length !== 3) {
      return false;
    }
    
    // Check expiration
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        return false;
      }
    } catch (tokenError) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export default { clearAuthData, hasValidToken };