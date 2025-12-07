import React, { useState, useEffect } from 'react';
import ChangePasswordModal from '../modals/ChangePasswordModal';
import TwoFactorModal from '../modals/TwoFactorModal';
import LoginActivityModal from '../modals/LoginActivityModal';
import DeleteAccountModal from '../modals/DeleteAccountModal';
import { showNotification } from '../notifications';
import { profileAPI } from '../../../services/api';
import * as feather from 'feather-icons';

const SecurityTab = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showLoginActivityModal, setShowLoginActivityModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const response = await profileAPI.getProfile();
      setUserProfile(response.data);
    } catch (error) {
      console.error('Failed to load profile data:', error);
    }
  };

  const handlePasswordChangeSuccess = (message, type = 'success') => {
    showNotification(message, type);
  };

  const handle2FASuccess = (message, type = 'success') => {
    showNotification(message, type);
    if (message.includes('enabled')) {
      setTwoFactorEnabled(true);
    } else if (message.includes('disabled')) {
      setTwoFactorEnabled(false);
    }
  };

  const handleLoginActivitySuccess = (message, type = 'success') => {
    showNotification(message, type);
  };

  const handleDeleteAccountSuccess = (message, type = 'success') => {
    showNotification(message, type);
  };

  useEffect(() => {
    feather.replace();
  }, []);

  useEffect(() => {
    // Re-initialize feather icons when modals change
    feather.replace();
  }, [showPasswordModal, show2FAModal, showLoginActivityModal, showDeleteAccountModal]);

  return (
    <div className="tab-panel active" id="security-panel">
      <div className="settings-form">
        {/* Password Display Section */}
        <div className="edit-mode-container form-section" id="password-display-section" style={{marginBottom: '20px'}}>
          <div className="edit-toggle-header">
            <h3>Password</h3>
            <div className="edit-controls">
              <button type="button" className="edit-btn" onClick={() => setShowPasswordModal(true)}>
                <i data-feather="lock"></i>
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Two-Factor Authentication Section */}
        <div className="edit-mode-container form-section" id="two-factor-section" style={{marginBottom: '20px'}}>
          <div className="edit-toggle-header">
            <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span 
                style={{
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: twoFactorEnabled ? '#10b981' : '#ef4444',
                  display: 'inline-block'
                }}
              ></span>
              Two-Factor Authentication
            </h3>
            <div className="edit-controls">
              <button type="button" className="edit-btn" onClick={() => setShow2FAModal(true)}>
                <i data-feather="shield"></i>
                Configure 2FA
              </button>
            </div>
          </div>
          {twoFactorEnabled && (
            <div className="form-grid compact-grid">
              <div className="form-group full-width">
                <div className="display-value">
                  Two-Factor Authentication is enabled
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Login Activity Section */}
        <div className="edit-mode-container form-section" id="login-activity-section">
          <div className="edit-toggle-header">
            <h3>Login Activity</h3>
            <div className="edit-controls">
              <button type="button" className="edit-btn" onClick={() => setShowLoginActivityModal(true)}>
                <i data-feather="activity"></i>
                Manage Sessions
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone Section */}
        <div style={{marginTop: '30px'}}>
          <h3 className="danger-zone-title">Danger Zone</h3>
          <div className="danger-zone-box">
            <p className="danger-zone-warning">Once you delete your account, there is no going back. Please be certain.</p>
            <button 
              type="button" 
              className="btn-danger" 
              onClick={() => setShowDeleteAccountModal(true)}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPasswordModal && (
        <ChangePasswordModal 
          currentEmail={userProfile?.email}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={handlePasswordChangeSuccess}
        />
      )}
      
      {show2FAModal && (
        <TwoFactorModal 
          onClose={() => setShow2FAModal(false)}
          onSuccess={handle2FASuccess}
          isEnabled={twoFactorEnabled}
        />
      )}
      
      {showLoginActivityModal && (
        <LoginActivityModal 
          onClose={() => setShowLoginActivityModal(false)}
          onSuccess={handleLoginActivitySuccess}
        />
      )}
      
      {showDeleteAccountModal && (
        <DeleteAccountModal 
          onClose={() => setShowDeleteAccountModal(false)}
          onSuccess={handleDeleteAccountSuccess}
        />
      )}
    </div>
  );
};

export default SecurityTab;
