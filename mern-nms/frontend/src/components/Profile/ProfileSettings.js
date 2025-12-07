import React, { useEffect } from 'react';
import ProfileCard from './ProfileCard';
import SettingsCard from './SettingsCard';
import './ProfileSettings.css';

const ProfileSettings = () => {
  useEffect(() => {
    // Apply original test theme styling to body
    document.body.classList.add('theme-loaded');
    document.body.style.backgroundColor = 'var(--primary-background)';
    document.body.style.color = 'var(--text-primary)';
    document.body.style.fontFamily = 'var(--font-family)';
    
    return () => {
      // Cleanup when component unmounts
      document.body.classList.remove('theme-loaded');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      document.body.style.fontFamily = '';
    };
  }, []);

  return (
    <>
      {/* Original test gradient background */}
      <div className="gradient-header"></div>
      
      {/* Original test dashboard container structure */}
      <div className="dashboard-container">
        <div className="dashboard-layout">
          <div className="profile-panel">
            <ProfileCard />
          </div>
          <div className="settings-panel">
            <SettingsCard />
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileSettings;