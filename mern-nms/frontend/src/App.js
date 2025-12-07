/**
 * NMS Frontend Application
 * Version: 2.0.0
 * Updated: December 7, 2025
 * Modern React Interface for Enterprise Network Management
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { ToastContainer } from 'react-toastify';
import * as feather from 'feather-icons';
import { clearAuthData, hasValidToken } from './utils/authCleanup';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './styles/enhanced.css';
import './styles/dark-theme.css';

// Lazy load components for better performance
const Login = lazy(() => import('./components/Auth/Login'));
const Layout = lazy(() => import('./components/Layout/Layout'));
const EmailVerificationHandler = lazy(() => import('./components/Email/EmailVerificationHandler'));

// Enhanced loading component with better UX
const Loading = () => (
  <div className="d-flex flex-column justify-content-center align-items-center" style={{ 
    height: '100vh', 
    backgroundColor: 'var(--primary-background)',
    color: 'var(--text-primary)'
  }}>
    <div className="text-center mb-4">
      <div className="mb-3">
        <i data-feather="activity" className="cube-loading" style={{ 
          fontSize: '4rem',
          color: '#2563eb',
          width: '64px',
          height: '64px'
        }}></i>
      </div>
      <h3 className="fw-bold mb-2" style={{ color: '#2563eb' }}>NetWatch</h3>
      <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>Loading Network Management System...</p>
    </div>
  </div>
);

// Main app content component
const AppContent = ({ isDarkTheme, setIsDarkTheme }) => {
  const { user, loading, refreshUser } = useAuth();
  const [showEmailVerification, setShowEmailVerification] = useState(false);

  useEffect(() => {
    // Check for email verification parameters on load
    const urlParams = new URLSearchParams(window.location.search);
    const hasVerificationParams = urlParams.has('token') && urlParams.has('email');
    
    if (hasVerificationParams) {
      setShowEmailVerification(true);
    }
  }, []);

  useEffect(() => {
    // Remove loading overlay when React is ready
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }
    
    // Initialize feather icons
    feather.replace();
    
    // Set up theme based on user preference
    if (user && user.isDarkTheme !== undefined) {
      setIsDarkTheme(user.isDarkTheme);
      localStorage.setItem('isDarkTheme', JSON.stringify(user.isDarkTheme));
    }
  }, [user, setIsDarkTheme]);

  useEffect(() => {
    // Apply theme to html and body elements only when user is authenticated
    if (user) {
      const html = document.documentElement;
      const body = document.body;
      
      if (isDarkTheme) {
        html.classList.remove('light-theme');
        html.classList.add('dark-theme');
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
      } else {
        html.classList.remove('dark-theme');
        html.classList.add('light-theme');
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
      }

      // Re-initialize feather icons after theme change
      setTimeout(() => feather.replace(), 100);
    } else {
      // For login page, always use dark theme
      const html = document.documentElement;
      const body = document.body;
      html.classList.remove('light-theme');
      html.classList.add('dark-theme');
      body.classList.remove('light-theme');
      body.classList.add('dark-theme');
    }
  }, [isDarkTheme, user]);

  if (loading) {
    return <Loading />;
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    );
  }

  // Show main dashboard if authenticated
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Layout isDarkTheme={isDarkTheme} setIsDarkTheme={setIsDarkTheme} />
      </Suspense>
      
      {/* Email Verification Handler */}
      {showEmailVerification && (
        <Suspense fallback={null}>
          <EmailVerificationHandler 
            onClose={() => {
              setShowEmailVerification(false);
              // Clear URL parameters
              window.history.replaceState(null, null, window.location.pathname);
            }}
            onVerificationSuccess={(newEmail) => {
              // Only refresh user data if we have a valid new email
              if (newEmail && typeof newEmail === 'string' && newEmail.includes('@')) {
                console.log('Email verification successful, refreshing user data with new email:', newEmail);
                refreshUser();
              } else {
                console.warn('Invalid email provided to verification success callback:', newEmail);
              }
            }}
          />
        </Suspense>
      )}
    </>
  );
};

function App() {
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('isDarkTheme');
    return savedTheme !== null ? JSON.parse(savedTheme) : true; // default to dark
  });

  useEffect(() => {
    // Clear stale authentication data on app startup to prevent 403 errors
    if (!hasValidToken()) {
      clearAuthData();
    }
    
    // Save theme preference whenever it changes
    localStorage.setItem('isDarkTheme', JSON.stringify(isDarkTheme));
  }, [isDarkTheme]);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <AppContent isDarkTheme={isDarkTheme} setIsDarkTheme={setIsDarkTheme} />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={isDarkTheme ? "dark" : "light"}
          />
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;