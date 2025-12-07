import React, { useState, useEffect } from 'react';
import { emailVerificationAPI } from '../../services/api';
import * as feather from 'feather-icons';

const EmailVerificationHandler = ({ onClose, onVerificationSuccess }) => {
  const [status, setStatus] = useState('checking'); // 'checking', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    handleEmailVerification();
    feather.replace();
  }, []);

  const handleEmailVerification = async () => {
    try {
      // Get token and email from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const email = urlParams.get('email');

      if (!token || !email) {
        setStatus('error');
        setMessage('Invalid verification link. Missing token or email parameter.');
        return;
      }

      // Verify the email change
      const response = await emailVerificationAPI.verifyEmailChange({
        token: token,
        email: email
      });

      // Only proceed if verification was explicitly successful
      if (response.data && response.data.success === true && response.data.data && response.data.data.newEmail) {
        setStatus('success');
        setMessage(`Email successfully updated to ${response.data.data.newEmail}`);
        
        // Only notify parent component if verification actually succeeded
        if (onVerificationSuccess) {
          onVerificationSuccess(response.data.data.newEmail);
        }
        
        // Clear URL parameters after successful verification
        setTimeout(() => {
          window.history.replaceState(null, null, window.location.pathname);
        }, 3000);
      } else {
        setStatus('error');
        setMessage(response.data?.message || 'Email verification failed - no update made');
      }

    } catch (error) {
      console.error('Email verification error:', error);
      setStatus('error');
      
      // Ensure no success callback is triggered on error
      const errorMessage = error.response?.data?.message || 'Email verification failed. Please try again.';
      setMessage(`${errorMessage} - No changes were made to your email address.`);
      
      // Do NOT call onVerificationSuccess on error
    }
  };

  if (status === 'checking') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(5px)'
      }}>
        <div style={{
          background: 'var(--card-background)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '450px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <i data-feather="loader" 
               style={{ 
                 width: '48px', 
                 height: '48px', 
                 color: '#2563eb',
                 animation: 'spin 1s linear infinite' 
               }}></i>
          </div>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
            Verifying Email...
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Please wait while we verify your email address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '450px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <i data-feather={status === 'success' ? 'check-circle' : 'x-circle'} 
             style={{ 
               width: '48px', 
               height: '48px', 
               color: status === 'success' ? '#10b981' : '#ef4444' 
             }}></i>
        </div>
        <h3 style={{ 
          margin: '0 0 10px 0', 
          color: 'var(--text-primary)',
          fontSize: '20px'
        }}>
          {status === 'success' ? 'Email Verified!' : 'Verification Failed'}
        </h3>
        <p style={{ 
          margin: '0 0 30px 0', 
          color: 'var(--text-secondary)',
          lineHeight: '1.5'
        }}>
          {message}
        </p>
        <button
          onClick={onClose}
          style={{
            padding: '12px 24px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto'
          }}
        >
          <i data-feather="check" style={{ width: '16px', height: '16px' }}></i>
          Continue
        </button>
      </div>
    </div>
  );
};

export default EmailVerificationHandler;