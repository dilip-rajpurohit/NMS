import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { profileAPI } from '../../../services/api';

function ChangePasswordModal({ onClose, onSuccess, currentEmail }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [strengthText, setStrengthText] = useState('');
  const [matchText, setMatchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpExpires, setOtpExpires] = useState(null);
  const [otpTimer, setOtpTimer] = useState(null);



  const validatePassword = () => {
    let isValid = true;
    
    // Current password validation
    if (currentPassword.length < 6) {
      isValid = false;
    }
    
    // Password strength validation
    if (newPassword.length >= 8) {
      let strength = 0;
      if (newPassword.match(/[a-z]/)) strength++;
      if (newPassword.match(/[A-Z]/)) strength++;
      if (newPassword.match(/[0-9]/)) strength++;
      if (newPassword.match(/[^a-zA-Z0-9]/)) strength++;
      
      const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
      
      if (strength > 0) {
        const label = strengthLabels[Math.min(strength-1, 3)];
        setStrengthText(`Password strength: ${label}`);
        
        if (strength < 3) {
          isValid = false;
        }
      } else {
        setStrengthText('Password too weak');
        isValid = false;
      }
    } else if (newPassword.length > 0) {
      setStrengthText('Password too short (minimum 8 characters)');
      isValid = false;
    } else {
      setStrengthText('');
      isValid = false;
    }
    
    // Password match validation
    if (confirmPassword.length > 0) {
      if (newPassword === confirmPassword && newPassword.length >= 8) {
        setMatchText('✓ Passwords match');
      } else {
        setMatchText('✗ Passwords do not match');
        isValid = false;
      }
    } else if (newPassword.length > 0) {
      setMatchText('');
      isValid = false;
    } else {
      setMatchText('');
    }
    
    return isValid && currentPassword.length >= 6 && newPassword.length >= 8 && newPassword === confirmPassword;
  };

  useEffect(() => {
    validatePassword();
  }, [currentPassword, newPassword, confirmPassword]);

  // Add OTP timer effect
  useEffect(() => {
    if (showOtpSection && otpExpires) {
      const timer = setTimeout(() => {
        setShowOtpSection(false);
        setOtp('');
        setOtpExpires(null);
        onSuccess('OTP expired. Please request a new code.', 'warning');
      }, 2 * 60 * 1000); // 2 minutes
      
      setOtpTimer(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [showOtpSection, otpExpires]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (otpTimer) clearTimeout(otpTimer);
    };
  }, []);

  const handleSendOtp = async () => {
    if (!currentPassword || currentPassword.length < 6) {
      onSuccess('Current password must be at least 6 characters', 'error');
      return;
    }
    
    if (!newPassword || newPassword.length < 8) {
      onSuccess('New password must be at least 8 characters', 'error');
      return;
    }
    
    if (!newPassword.match(/[a-z]/)) {
      onSuccess('New password must contain at least one lowercase letter', 'error');
      return;
    }
    
    if (!newPassword.match(/[A-Z]/)) {
      onSuccess('New password must contain at least one uppercase letter', 'error');
      return;
    }
    
    if (!newPassword.match(/[0-9]/)) {
      onSuccess('New password must contain at least one number', 'error');
      return;
    }
    
    if (!newPassword.match(/[^a-zA-Z0-9]/)) {
      onSuccess('New password must contain at least one special character', 'error');
      return;
    }
    
    if (!confirmPassword || newPassword !== confirmPassword) {
      onSuccess('New passwords do not match', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Sending OTP request with:', { currentPassword: '***', newPassword: '***' });
      
      const response = await profileAPI.requestPasswordOTP({
        currentPassword,
        newPassword
      });

      console.log('OTP Response:', response);

      if (response.data.success) {
        console.log('OTP sent successfully, showing OTP section');
        setShowOtpSection(true);
        setOtpExpires(new Date(response.data.expiresAt));
        onSuccess(response.data.message || 'OTP sent to your email address', 'success');
        
        // Debug: Check if OTP session was actually created
        console.log('Debug - OTP session created:', {
          hasOtpSection: true,
          expiresAt: response.data.expiresAt,
          userId: response.data.userId || 'not provided'
        });
      } else {
        console.log('OTP request failed:', response.data);
        onSuccess(response.data.message || 'Failed to send OTP', 'error');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      const message = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      onSuccess(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!otp || otp.trim().length !== 6) {
      onSuccess('Please enter a valid 6-digit security code', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      // Small delay to ensure OTP session is fully persisted
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const otpPayload = { otp: otp.trim() };
      console.log('Verifying OTP with payload:', otpPayload);
      console.log('Current auth token:', localStorage.getItem('nms_token') ? 'Present' : 'Missing');
      
      const response = await profileAPI.verifyPasswordOTP(otpPayload);
      console.log('Verify OTP response:', response?.data);

      if (response.data && response.data.success) {
        // Clear timer
        if (otpTimer) {
          clearTimeout(otpTimer);
          setOtpTimer(null);
        }
        
        onSuccess(response.data.message || 'Password changed successfully!', 'success');
        // reset modal state and close
        setShowOtpSection(false);
        setOtp('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpExpires(null);
        onClose();
      } else {
        onSuccess(response.data?.message || 'Invalid security code', 'error');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      if (error.response) {
        console.error('Verify OTP server response data:', error.response.data);
        console.error('Verify OTP server response status:', error.response.status);
        console.error('Verify OTP server response headers:', error.response.headers);
      }
      const message = error.response?.data?.message || 'Invalid security code. Please try again.';
      onSuccess(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetOtp = () => {
    if (otpTimer) {
      clearTimeout(otpTimer);
      setOtpTimer(null);
    }
    setShowOtpSection(false);
    setOtp('');
    setOtpExpires(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Calculate form validity without calling validatePassword during render
  const isPasswordValid = currentPassword.length >= 6 && 
                         newPassword.length >= 8 && 
                         newPassword === confirmPassword &&
                         newPassword.match(/[a-z]/) &&
                         newPassword.match(/[A-Z]/) &&
                         newPassword.match(/[0-9]/) &&
                         newPassword.match(/[^a-zA-Z0-9]/);

  // For sending OTP, require full password validation
  const canSendOtp = currentPassword.length >= 6 && 
                    newPassword.length >= 8 && 
                    newPassword === confirmPassword &&
                    newPassword.match(/[a-z]/) &&
                    newPassword.match(/[A-Z]/) &&
                    newPassword.match(/[0-9]/) &&
                    newPassword.match(/[^a-zA-Z0-9]/);

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
        zIndex: 999999,
        backdropFilter: 'blur(5px)'
      }}
    >
      <div style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: 'var(--shadow-lg)',
        // Make compact: avoid internal scrolling, let the page scroll if necessary
        maxHeight: 'none',
        overflow: 'visible'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Change Password
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-light)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
            Current Password
          </label>
          <input 
            type="password"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
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
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
            New Password
          </label>
          <input 
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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
          
          {/* Password Requirements */}
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div>Password must contain:</div>
            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: newPassword.length >= 8 ? '#10b981' : '#6b7280' }}>
                  {newPassword.length >= 8 ? '✓' : '•'}
                </span>
                At least 8 characters
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: newPassword.match(/[a-z]/) ? '#10b981' : '#6b7280' }}>
                  {newPassword.match(/[a-z]/) ? '✓' : '•'}
                </span>
                One lowercase letter (a-z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: newPassword.match(/[A-Z]/) ? '#10b981' : '#6b7280' }}>
                  {newPassword.match(/[A-Z]/) ? '✓' : '•'}
                </span>
                One uppercase letter (A-Z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: newPassword.match(/[0-9]/) ? '#10b981' : '#6b7280' }}>
                  {newPassword.match(/[0-9]/) ? '✓' : '•'}
                </span>
                One number (0-9)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: newPassword.match(/[^a-zA-Z0-9]/) ? '#10b981' : '#6b7280' }}>
                  {newPassword.match(/[^a-zA-Z0-9]/) ? '✓' : '•'}
                </span>
                One special character (@$!%*?&)
              </div>
            </div>
          </div>
          
          {strengthText && (
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              {strengthText.includes('Strong') && <span style={{color: '#10b981'}}>Password strength: Strong</span>}
              {strengthText.includes('Good') && <span style={{color: '#3b82f6'}}>Password strength: Good</span>}
              {strengthText.includes('Fair') && <span style={{color: '#f59e0b'}}>Password strength: Fair</span>}
              {strengthText.includes('Weak') && <span style={{color: '#ef4444'}}>Password strength: Weak</span>}
              {strengthText.includes('too short') && <span style={{color: '#ef4444'}}>Password too short (minimum 8 characters)</span>}
              {strengthText.includes('too weak') && <span style={{color: '#ef4444'}}>Password too weak</span>}
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
            Confirm New Password
          </label>
          <input 
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {matchText && (
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              {matchText.includes('match') && matchText.includes('✓') && <span style={{color: '#10b981'}}>✓ Passwords match</span>}
              {matchText.includes('do not match') && <span style={{color: '#ef4444'}}>✗ Passwords do not match</span>}
            </div>
          )}
        </div>
        
        {showOtpSection && (
          <div style={{ 
            display: 'block', 
            marginBottom: '20px', 
            padding: '16px', 
            background: 'var(--tertiary-background)', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)' 
          }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
              Verification Code
            </label>
            <input 
              type="text"
              placeholder="Enter 6-digit code from email"
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--card-background)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              We've sent a verification code to {currentEmail || 'your registered email'}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleResetOtp}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Request New Code
              </button>
            </div>
          </div>
        )}
        
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
          {!showOtpSection ? (
            <button 
              onClick={handleSendOtp}
              disabled={!canSendOtp || isLoading}
              style={{
                padding: '12px 24px',
                background: isLoading ? '#6b7280' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                cursor: (canSendOtp && !isLoading) ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: (canSendOtp && !isLoading) ? 1 : 0.5
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff40',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Sending...
                </>
              ) : (
                <>
                  📨 Send Verification Code
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={handleVerifyPassword}
              disabled={isLoading || !otp || otp.length !== 6}
              style={{
                padding: '12px 24px',
                background: isLoading ? '#6b7280' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                cursor: (!isLoading && otp && otp.length === 6) ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: (!isLoading && otp && otp.length === 6) ? 1 : 0.5
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff40',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Updating...
                </>
              ) : (
                <>
                  ✓ Change Password
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ChangePasswordModal;
