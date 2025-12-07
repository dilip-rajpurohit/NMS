import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const token = localStorage.getItem('nms_token') || localStorage.getItem('token');
      if (token) {
        // Validate token format
        if (!token.includes('.') || token.split('.').length !== 3) {
          throw new Error('Invalid token format');
        }
        
        // Check if token is expired before making API call
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
            throw new Error('Token expired');
          }
        } catch (tokenError) {
          throw new Error('Invalid token structure');
        }
        
        api.setAuthToken(token);
        const response = await api.get('/auth/verify');
        
        if (response.data && response.data.user) {
          setUser(response.data.user);
        } else {
          throw new Error('Invalid user data received');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear all possible token storage locations only if in browser
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('nms_token');
        localStorage.removeItem('token');
        localStorage.removeItem('nms_user');
        sessionStorage.removeItem('nms_token');
        sessionStorage.removeItem('token');
      }
      api.setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, rememberMe = false) => {
    try {
      setError('');
      setLoading(true);
      
      // Basic validation
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      
      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      const response = await api.post('/auth/login', { 
        username: username.trim(), 
        password 
      });
      
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      // Store authentication data only if in browser
      if (typeof window !== 'undefined' && window.localStorage) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('nms_token', token);
        // Keep legacy key for components that read 'token'
        storage.setItem('token', token);
        storage.setItem('nms_user', JSON.stringify(user));
        storage.setItem('nms_remember', rememberMe.toString());
        
        // Also set in localStorage for API interceptor
        localStorage.setItem('nms_token', token);
        localStorage.setItem('token', token);
      }
      
      api.setAuthToken(token);
      setUser(user);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      setError(message);
      console.error('Login error:', error);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError('');
      setLoading(true);
      
      // Validate user data
      const { username, email, password } = userData;
      
      if (!username || !email || !password) {
        throw new Error('All fields are required');
      }
      
      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }
      
      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      const response = await api.post('/auth/register', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        firstName: userData.firstName?.trim() || '',
        lastName: userData.lastName?.trim() || ''
      });
      
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('nms_token', token);
  // Legacy key
  localStorage.setItem('token', token);
      localStorage.setItem('nms_user', JSON.stringify(user));
      api.setAuthToken(token);
      setUser(user);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Registration failed';
      setError(message);
      console.error('Registration error:', error);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('nms_token');
    localStorage.removeItem('token');
    localStorage.removeItem('nms_user');
    api.setAuthToken(null);
    setUser(null);
    setError('');
  };

  const refreshUser = async () => {
    try {
      await checkAuthStatus();
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refreshUser,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;