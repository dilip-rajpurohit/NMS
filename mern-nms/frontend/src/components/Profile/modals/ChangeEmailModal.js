import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as feather from 'feather-icons';
import { emailVerificationAPI } from '../../../services/api';

function ChangeEmailModal({ onClose, onSuccess, currentEmail }) {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    feather.replace();
  }, []);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (newEmail && password) {
      if (isValidEmail(newEmail)) {
        setEmailStatus('<span style="color: #10b981;">✓ Email format valid</span>');
        return true;
      } else {
        setEmailStatus('<span style="color: #ef4444;">✗ Invalid email format</span>');
        return false;
      }
    } else {
      setEmailStatus('');
      return false;
    }
  };

  useEffect(() => {
    validateForm();
  }, [newEmail, password]);

  const handleSendVerification = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setEmailStatus('Sending verification email...');
    
    try {
      const response = await emailVerificationAPI.requestEmailChange({
        newEmail: newEmail,
        password: password
      });
      
      setEmailStatus('<span style="color: #10b981;">✓ Verification email sent successfully!</span>');
      setTimeout(() => {
        onSuccess(`Verification email sent to ${newEmail}. Please check your inbox and click the verification link to complete the email change.`);
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Email verification request failed:', error);
      console.log('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code
      });
      
      // Handle specific error types
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        setEmailStatus(`<span style="color: #ef4444;">✗ Network error: Unable to connect to server</span>`);
      } else if (error.response?.status === 500) {
        const errorMsg = error.response?.data?.message || 'Email service temporarily unavailable';
        setEmailStatus(`<span style="color: #ef4444;">✗ Server error: ${errorMsg}</span>`);
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || 'Invalid request';
        setEmailStatus(`<span style="color: #ef4444;">✗ ${errorMsg}</span>`);
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to send verification email';
        setEmailStatus(`<span style="color: #ef4444;">✗ ${errorMessage}</span>`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isFormValid = newEmail && password && isValidEmail(newEmail);

  return createPortal(
    <div 
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(5px)'
      }}
    >
      <div style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '450px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i data-feather="mail" style={{ width: '20px', height: '20px' }}></i>
          Change Email Address
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
            Current Email
          </label>
          <div style={{ 
            padding: '12px', 
            background: 'var(--primary-background)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px', 
            color: 'var(--text-primary)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <i data-feather="user" style={{ width: '16px', height: '16px', color: 'var(--text-light)' }}></i>
            {currentEmail || 'No email set'}
          </div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
            New Email Address
          </label>
          <input 
            type="email"
            placeholder="Enter new email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--primary-background)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
            }}
          />
          <div 
            style={{ marginTop: '8px', fontSize: '12px' }}
            dangerouslySetInnerHTML={{ __html: emailStatus }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
            Confirm Password
          </label>
          <input 
            type="password"
            placeholder="Enter current password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--primary-background)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'var(--border-color)',
              color: 'var(--text-primary)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSendVerification}
            disabled={!isFormValid || isLoading}
            style={{
              padding: '12px 24px',
              background: isLoading ? '#6b7280' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: (isFormValid && !isLoading) ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: (isFormValid && !isLoading) ? 1 : 0.5
            }}
          >
            <i data-feather={isLoading ? "clock" : "send"} style={{ width: '16px', height: '16px' }}></i>
            {isLoading ? 'Sending...' : 'Send Verification'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ChangeEmailModal;
