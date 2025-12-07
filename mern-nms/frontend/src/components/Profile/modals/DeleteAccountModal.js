import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as feather from 'feather-icons';

function DeleteAccountModal({ onClose, onSuccess }) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    feather.replace();
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting && !isCompleted) {
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.trim();
    setConfirmText(value);
    
    if (value.length > 0 && value !== 'DELETE') {
      setShowError(true);
    } else {
      setShowError(false);
    }
  };

  const handleDelete = () => {
    if (confirmText === 'DELETE') {
      setIsDeleting(true);
      
      // Simulate deletion process
      setTimeout(() => {
        setIsDeleting(false);
        setIsCompleted(true);
        
        // Show completion and then close
        setTimeout(() => {
          onSuccess('Account has been permanently deleted.', 'success');
          onClose();
        }, 2000);
      }, 2000);
    }
  };

  const isConfirmValid = confirmText === 'DELETE';

  if (isDeleting) {
    return createPortal(
      <div style={{
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
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{
          background: 'var(--primary-background)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '22px',
          maxWidth: '500px',
          width: '92%',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid var(--border-color)',
              borderTop: '3px solid #dc2626',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>
              Deleting Account...
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0', fontSize: '14px' }}>
              Please wait while we process your request.
            </p>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>,
      document.body
    );
  }

  if (isCompleted) {
    return createPortal(
      <div style={{
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
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{
          background: 'var(--primary-background)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '22px',
          maxWidth: '500px',
          width: '92%',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#22c55e',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <i data-feather="check" style={{ width: '24px', height: '24px', color: 'white' }}></i>
            </div>
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>
              Account Deleted
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0', fontSize: '14px' }}>
              Your account has been permanently deleted.
            </p>
            <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0', fontSize: '13px' }}>
              You will be redirected to the login page shortly.
            </p>
          </div>
        </div>
      </div>,
      document.body
    );
  }

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
        backdropFilter: 'blur(4px)'
      }}
    >
      <div style={{
        background: 'var(--primary-background)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '22px',
        maxWidth: '500px',
        width: '92%',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
        maxHeight: '86vh',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i data-feather="alert-triangle" style={{ width: '18px', height: '18px', color: 'white' }}></i>
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '18px' }}>Delete Account</div>
            </div>
          </div>
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

        <div style={{ padding: '6px 0 0 0' }}>
          <div style={{
            background: 'var(--card-background)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <p style={{ color: 'var(--text-primary)', margin: '0 0 12px', fontWeight: '600', fontSize: '14px' }}>
              This will permanently delete:
            </p>
            <ul style={{ color: 'var(--text-secondary)', margin: '0', paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
              <li>Your profile and account information</li>
              <li>All network configurations and settings</li>
              <li>Security preferences and 2FA setup</li>
              <li>Session history and activity logs</li>
              <li>Any connected devices and saved networks</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: 'var(--text-primary)', 
              fontWeight: '600', 
              marginBottom: '8px', 
              fontSize: '14px' 
            }}>
              Please type <strong style={{ color: '#dc2626' }}>DELETE</strong> to confirm:
            </label>
            <input 
              type="text" 
              value={confirmText}
              onChange={handleInputChange}
              placeholder="Type DELETE here..." 
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--card-background)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
            />
            {showError && (
              <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                Please type "DELETE" exactly as shown above.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '18px' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--text-light)';
              e.target.style.color = 'var(--text-light)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.color = 'var(--text-secondary)';
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleDelete}
            disabled={!isConfirmValid}
            style={{
              padding: '10px 20px',
              background: isConfirmValid ? '#dc2626' : '#6b7280',
              color: isConfirmValid ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              cursor: isConfirmValid ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default DeleteAccountModal;