import React, { useState, useEffect } from 'react';
import ChangeEmailModal from '../modals/ChangeEmailModal';
import { showNotification } from '../notifications';
import { profileAPI, emailVerificationAPI } from '../../../services/api';
import * as feather from 'feather-icons';

const ProfileTab = () => {
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailVerification, setEmailVerification] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: '',
    department: '',
    phone: ''
  });

  // Load profile data on component mount
  useEffect(() => {
    loadProfileData();
  }, []);

  // Reload profile data when user context updates (e.g., after email verification)
  useEffect(() => {
    // Only reload if userProfile exists and email actually changed
    if (userProfile && userProfile.email && userProfile.email !== formData.email) {
      console.log('User email updated, reloading profile data. Old:', formData.email, 'New:', userProfile.email);
      loadProfileData();
    }
  }, [userProfile?.email]); // Watch specifically for email changes

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const response = await profileAPI.getProfile();
      const user = response.data;
      
      setUserProfile(user);
      
      // Check if user is admin
      const userRole = user.role || 'viewer';
      setIsAdmin(userRole === 'admin');
      
      // Set form data directly from backend without fallbacks
      setFormData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        role: user.role || '', // Use user.role directly, not profile.role
        department: user.profile?.department || '',
        phone: user.profile?.phone || ''
      });
      
      // Load email verification status
      await loadEmailVerificationStatus();
    } catch (error) {
      console.error('Failed to load profile data:', error);
      showNotification('Failed to load profile data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailVerificationStatus = async () => {
    try {
      const response = await emailVerificationAPI.getVerificationStatus();
      console.log('Email verification API response:', response.data);
      // Extract the actual verification data from the response
      setEmailVerification(response.data.data || response.data);
    } catch (error) {
      // Verification status endpoint might return 404 if no pending verification
      if (error.response?.status !== 404) {
        console.error('Failed to load email verification status:', error);
      }
      setEmailVerification(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Create update data - exclude role field (backend handles role permissions)
      const { role, ...updateData } = formData;
      
      // Only include role if user is admin and not editing their own admin role
      if (isAdmin && userProfile?.role !== 'admin') {
        updateData.role = role;
      }
      
      await profileAPI.updatePersonalInfo(updateData);
      setIsEditingPersonal(false);
      showNotification('Personal information updated successfully!', 'success');
      
      // Reload profile data
      await loadProfileData();
    } catch (error) {
      console.error('Failed to update personal info:', error);
      
      // Check if the error is about role permission
      if (error.response?.status === 403 && error.response?.data?.field === 'role') {
        showNotification('Access denied. Only administrators can change user roles.', 'error');
      } else {
        showNotification('Failed to update personal information', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditingPersonal(false);
    // Reset form data to original values directly from backend
    if (userProfile) {
      setFormData({
        firstName: userProfile.profile?.firstName || '',
        lastName: userProfile.profile?.lastName || '',
        role: userProfile.role || '', // Use user.role directly
        department: userProfile.profile?.department || '',
        phone: userProfile.profile?.phone || ''
      });
    }
  };

  const handleEmailChangeSuccess = (message) => {
    showNotification(message, 'success');
    // Reload email verification status and profile data
    loadEmailVerificationStatus();
    loadProfileData(); // Also reload profile to get updated email
  };

  useEffect(() => {
    feather.replace();
  }, [isEditingPersonal, showEmailModal]);

  if (isLoading && !userProfile) {
    return (
      <div className="tab-panel active" id="profile-panel">
        <div className="loading-container">
          <p>Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel active" id="profile-panel">
      <div className="settings-form">
        {/* Personal Information Section */}
        <div className={`edit-mode-container form-section ${isEditingPersonal ? 'edit-mode' : ''}`} id="personal-info-section">
          <div className="edit-toggle-header">
            <h3>Personal Information</h3>
            <div className="edit-controls">
              <button 
                type="button" 
                className="edit-btn"
                onClick={() => setIsEditingPersonal(true)}
                disabled={isLoading}
              >
                <i data-feather="edit-2"></i>
                Edit
              </button>
              <div className="edit-actions">
                <button type="button" className="cancel-btn" onClick={handleCancel} disabled={isLoading}>
                  <i data-feather="x"></i>
                  Cancel
                </button>
                <button type="button" className="save-btn" onClick={handleSave} disabled={isLoading}>
                  <i data-feather="save"></i>
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input 
                type="text" 
                id="firstName" 
                name="firstName" 
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder="Enter first name" 
                readOnly={!isEditingPersonal}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input 
                type="text" 
                id="lastName" 
                name="lastName" 
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                placeholder="Enter last name" 
                readOnly={!isEditingPersonal}
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">
                Role {(!isAdmin || (isAdmin && userProfile?.role === 'admin')) && 
                  <span className="admin-only-label">
                    {!isAdmin ? '(Admin Only)' : '(Unchangeable)'}
                  </span>}
              </label>
              {isEditingPersonal && isAdmin && userProfile?.role !== 'admin' ? (
                <select 
                  id="role" 
                  name="role" 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="">Select role</option>
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : (
                <input 
                  type="text" 
                  id="role" 
                  name="role" 
                  value={formData.role}
                  placeholder="Role not set" 
                  readOnly
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  title={
                    !isAdmin ? 'Only administrators can change user roles' : 
                    userProfile?.role === 'admin' ? 'Admin role cannot be changed for security' :
                    'Click Edit to modify'
                  }
                />
              )}
            </div>
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <input 
                type="text" 
                id="department" 
                name="department" 
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                placeholder="Enter department" 
                readOnly={!isEditingPersonal}
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Contact Number</label>
              <input 
                type="tel" 
                id="phone" 
                name="phone" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Enter contact number" 
                readOnly={!isEditingPersonal}
              />
            </div>
          </div>
        </div>

        {/* Email Address Display */}
        <div className="edit-mode-container form-section" id="email-display-section">
          <div className="edit-toggle-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Small email verification status indicator */}
              <div 
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: (() => {
                    console.log('Email verification state:', emailVerification);
                    console.log('User profile email verification:', userProfile?.security?.emailVerification);
                    
                    // If there's a pending email change - RED
                    if (emailVerification && emailVerification.hasPendingChange) {
                      console.log('Showing RED - pending verification');
                      return '#ef4444'; // Red - verification pending
                    }
                    // If email is verified - GREEN
                    if (userProfile?.security?.emailVerification?.isVerified) {
                      console.log('Showing GREEN - email verified');
                      return '#10b981'; // Green - verified
                    }
                    // Everything else is RED (not verified)
                    console.log('Showing RED - default unverified');
                    return '#ef4444'; // Red - not verified
                  })()
                }}
                title={(() => {
                  if (emailVerification && emailVerification.hasPendingChange) {
                    return `Email verification pending for ${emailVerification.pendingEmail}`;
                  }
                  if (userProfile?.security?.emailVerification?.isVerified) {
                    return 'Email verified';
                  }
                  return 'Email not verified';
                })()}
              ></div>
              {userProfile?.email || 'No email set'}
            </h3>
            <div className="edit-controls">
              <button type="button" className="edit-btn" onClick={() => setShowEmailModal(true)}>
                <i data-feather="edit-2"></i>
                Change Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEmailModal && (
        <ChangeEmailModal 
          currentEmail={userProfile?.email}
          onClose={() => setShowEmailModal(false)}
          onSuccess={handleEmailChangeSuccess}
        />
      )}
    </div>
  );
};

export default ProfileTab;
