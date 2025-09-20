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
      const token = localStorage.getItem('nms_token');
      if (token) {
        // Validate token format
        if (!token.includes('.')) {
          throw new Error('Invalid token format');
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
      // Clear invalid tokens
      localStorage.removeItem('nms_token');
      localStorage.removeItem('nms_user');
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
      
      // Store authentication data
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('nms_token', token);
      storage.setItem('nms_user', JSON.stringify(user));
      storage.setItem('nms_remember', rememberMe.toString());
      
      // Also set in localStorage for API interceptor
      localStorage.setItem('nms_token', token);
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
        password
      });
      
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('nms_token', token);
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
    localStorage.removeItem('nms_user');
    api.setAuthToken(null);
    setUser(null);
    setError('');
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};