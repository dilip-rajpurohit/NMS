import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as feather from 'feather-icons';

function TwoFactorModal({ onClose, onSuccess, isEnabled }) {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationSection, setShowVerificationSection] = useState(false);
  const [showSetupButton, setShowSetupButton] = useState(false);

  useEffect(() => {
    feather.replace();
  }, [selectedMethod, showVerificationSection]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleMethodChange = (method) => {
    setSelectedMethod(method);
    setShowVerificationSection(false);
    setShowSetupButton(true);
  };

  const handleSendCode = () => {
    if (selectedMethod) {
      setShowVerificationSection(true);
      setShowSetupButton(false);
      
      const methodText = {
        'sms': 'your phone',
        'email': 'alex.chen@netwatch.io',
        'app': 'your authenticator app'
      }[selectedMethod];
      
      onSuccess(`Verification code sent to ${methodText}`, 'success');
    }
  };

  const handleVerify2FA = () => {
    if (verificationCode.length === 6) {
      const methodNames = {
        'sms': 'SMS',
        'email': 'Email',
        'app': 'Authenticator App'
      };
      onSuccess(`Two-factor authentication ${isEnabled ? 'updated' : 'enabled'} successfully using ${methodNames[selectedMethod]}!`, 'success');
      onClose();
    } else {
      onSuccess('Please enter a valid 6-digit verification code', 'error');
    }
  };

  const handleDisable2FA = () => {
    onSuccess('Two-factor authentication disabled', 'success');
    onClose();
  };

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
        zIndex: 12000,
        backdropFilter: 'blur(5px)'
      }}
    >
      <div style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: 0,
            color: 'var(--text-primary)',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i data-feather="shield" style={{ width: '20px', height: '20px' }}></i>
            Two-Factor Authentication
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-light)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <i data-feather="x" style={{ width: '18px', height: '18px' }}></i>
          </button>
        </div>
        
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: 'var(--primary-background)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Add an extra layer of security to your account. When enabled, you'll need to enter a verification code from your chosen method in addition to your password.
          </p>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
            Choose Authentication Method
          </label>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--primary-background)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="twoFactorMethod" 
                value="sms" 
                onChange={() => handleMethodChange('sms')}
                style={{ accentColor: '#2563eb' }}
              />
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>SMS Text Message</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Get codes via text message</div>
              </div>
            </label>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--primary-background)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="twoFactorMethod" 
                value="email" 
                onChange={() => handleMethodChange('email')}
                style={{ accentColor: '#2563eb' }}
              />
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Email Verification</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Get codes via email (alex.chen@netwatch.io)</div>
              </div>
            </label>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--primary-background)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="twoFactorMethod" 
                value="app" 
                onChange={() => handleMethodChange('app')}
                style={{ accentColor: '#2563eb' }}
              />
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Authenticator App</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Use Google Authenticator, Authy, or similar apps</div>
              </div>
            </label>
          </div>
        </div>
        
        {selectedMethod === 'sms' && (
          <div style={{ display: 'block', marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
              Phone Number
            </label>
            <input 
              type="tel" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 123-4567" 
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--primary-background)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}
        
        {selectedMethod === 'app' && (
          <div style={{ display: 'block', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              display: 'inline-block',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '150px',
                height: '150px',
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666'
              }}>
                QR Code Here
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0' }}>
              Scan this QR code with your authenticator app, then enter the 6-digit code below.
            </p>
          </div>
        )}
        
        {showVerificationSection && (
          <div style={{ display: 'block', marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
              Verification Code
            </label>
            <input 
              type="text" 
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code" 
              maxLength="6" 
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--primary-background)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                boxSizing: 'border-box',
                textAlign: 'center',
                letterSpacing: '4px'
              }}
            />
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
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
          >
            Cancel
          </button>
          {isEnabled && (
            <button 
              onClick={handleDisable2FA}
              style={{
                padding: '12px 24px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
            >
              Disable 2FA
            </button>
          )}
          {showSetupButton && (
            <button 
              onClick={handleSendCode}
              style={{
                padding: '12px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'inline-block'
              }}
            >
              Send Code
            </button>
          )}
          {showVerificationSection && (
            <button 
              onClick={handleVerify2FA}
              style={{
                padding: '12px 24px',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'inline-block'
              }}
            >
              {isEnabled ? 'Update 2FA' : 'Enable 2FA'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default TwoFactorModal;