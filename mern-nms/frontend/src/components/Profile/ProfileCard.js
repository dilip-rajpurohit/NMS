import React, { useState, useEffect } from 'react';
import { showNotification } from './notifications';
import { profileAPI } from '../../services/api';

const ProfileCard = () => {
  const defaultProfileImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiNGM0Y0RjYiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSIzMiIgcj0iMTIiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTY0IDY0QzY0IDUyIDUyIDQ4IDQwIDQ4QzI4IDQ4IDE2IDUyIDE2IDY0IiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
  
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileImage, setProfileImage] = useState(defaultProfileImage);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [stats, setStats] = useState({
    activeMonitors: 0,
    alertsResolved: 0,
    criticalIncidents: 0
  });

  // Load profile data on component mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const response = await profileAPI.getProfile();
      const user = response.data;
      
      setUserProfile(user);
      
      // Update profile image
      const avatar = user.profile?.avatar || defaultProfileImage;
      setProfileImage(avatar);
      
      // Update user info directly from backend (no dummy fallbacks)
      const firstName = user.profile?.firstName || '';
      const lastName = user.profile?.lastName || '';
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : 
                      firstName ? firstName : 
                      lastName ? lastName : 
                      user.username || 'User';
      setUserName(fullName);
      
      const role = user.role || '';
      setUserRole(role);
      
      // Update stats directly from backend (no dummy fallbacks)
      const profileStats = user.profile?.stats || {};
      setStats({
        activeMonitors: profileStats.activeMonitors || 0,
        alertsResolved: profileStats.alertsResolved || 0,
        criticalIncidents: profileStats.criticalIncidents || 0
      });
    } catch (error) {
      console.error('Failed to load profile data:', error);
      // Use default values on error - don't show notification for initial load
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeAvatar = () => {
    // Create file input for avatar - exactly matching original script.js
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const newAvatar = e.target.result;
          setProfileImage(newAvatar);
          
          try {
            // Update avatar in database
            await profileAPI.updateAvatar(newAvatar);
            showNotification('Profile picture updated successfully!', 'success');
          } catch (error) {
            console.error('Failed to update avatar:', error);
            showNotification('Failed to update profile picture', 'error');
            // Revert to previous image on error
            setProfileImage(userProfile?.profile?.avatar || userProfile?.avatar || defaultProfileImage);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  return (
    <div className="profile-card">
      {/* Profile Image with Verification */}
      <div className="profile-image-container">
        <div className="profile-image-wrapper">
          <div className="profile-image">
            <img src={profileImage} alt="Profile" />
          </div>
          <button className="change-avatar-btn" title="Change Avatar" onClick={handleChangeAvatar}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </button>
        </div>
        <div className="verification-badge">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>

      {/* User Info */}
      <div className="user-info">
        <h2 className="user-name">{userName}</h2>
        <p className="company-name">{userRole}</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Active monitors</span>
          <span className="stat-number">{stats.activeMonitors}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Alerts resolved</span>
          <span className="stat-number">{stats.alertsResolved.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Critical incidents</span>
          <span className="stat-number">{stats.criticalIncidents}</span>
        </div>
      </div>

      {/* Public Profile Section */}
      <div className="public-profile-section">
        <button className="view-profile-btn">View Dashboard</button>
      </div>
    </div>
  );
};

export default ProfileCard;
