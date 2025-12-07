import React, { useState, useEffect } from 'react';
import { showNotification } from '../notifications';
import { profileAPI } from '../../../services/api';

const PreferencesTab = ({ isDarkTheme, setIsDarkTheme }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

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
      
      // Set preferences from user data
      const preferences = user.preferences || {};
      const notifications = preferences.notifications || {};
      
      setEmailNotifications(notifications.email ?? user.emailNotifications ?? true);
      setBrowserNotifications(notifications.browser ?? user.browserNotifications ?? true);
      setSmsNotifications(notifications.sms ?? user.smsNotifications ?? false);
    } catch (error) {
      console.error('Failed to load profile preferences:', error);
      showNotification('Failed to load preferences', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (type, value) => {
    try {
      setIsLoading(true);
      
      let updateData = {};
      
      if (type === 'theme') {
        updateData = { theme: { isDarkTheme: value } };
      } else if (type === 'notifications') {
        updateData = { 
          notifications: {
            email: type === 'email' ? value : emailNotifications,
            browser: type === 'browser' ? value : browserNotifications,
            sms: type === 'sms' ? value : smsNotifications,
          }
        };
        
        if (type === 'email') updateData.notifications.email = value;
        if (type === 'browser') updateData.notifications.browser = value;  
        if (type === 'sms') updateData.notifications.sms = value;
      }
      
      await profileAPI.updatePreferences(updateData);
      showNotification(`${type} preferences updated successfully`, 'success');
      
    } catch (error) {
      console.error(`Failed to update ${type} preference:`, error);
      showNotification(`Failed to update ${type} preference`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    console.log('Theme toggle clicked');
    const checkbox = document.getElementById('darkTheme');
    
    if (!checkbox) {
      console.error('Theme toggle elements not found!');
      return;
    }
    
    console.log('Checkbox checked state:', checkbox.checked);
    
    // Update parent state immediately after checkbox changes
    const newTheme = checkbox.checked;
    setIsDarkTheme(newTheme);
    
    console.log('Theme changed to:', newTheme ? 'Dark' : 'Light');
    
    // Update in database
    updatePreference('theme', newTheme);
    
    showNotification('Theme updated to ' + (newTheme ? 'Dark' : 'Light') + ' mode', 'success');
  };

  const toggleEmailNotifications = () => {
    console.log('Email toggle clicked');
    const checkbox = document.getElementById('emailNotifications');
    
    if (!checkbox) {
      console.error('Email toggle elements not found!');
      return;
    }
    
    console.log('Checkbox checked before:', checkbox.checked);
    
    // Update state based on checkbox state after it changes
    const newValue = checkbox.checked;
    setEmailNotifications(newValue);
    
    console.log('Email notifications changed to:', newValue ? 'ON' : 'OFF');
    
    // Update in database
    updatePreference('email', newValue);
    
    // Show success message
    showNotification('Email notification settings updated', 'success');
  };

  const toggleBrowserNotifications = () => {
    console.log('Browser toggle clicked');
    const checkbox = document.getElementById('browserNotifications');
    
    if (!checkbox) {
      console.error('Browser toggle elements not found!');
      return;
    }
    
    console.log('Checkbox checked before:', checkbox.checked);
    
    // Update state based on checkbox state after it changes
    const newValue = checkbox.checked;
    setBrowserNotifications(newValue);
    
    console.log('Browser notifications changed to:', newValue ? 'ON' : 'OFF');
    
    // Update in database
    updatePreference('browser', newValue);
    
    // Show success message
    showNotification('Browser notification settings updated', 'success');
  };

  const toggleSMSNotifications = () => {
    console.log('SMS toggle clicked');
    const checkbox = document.getElementById('smsNotifications');
    
    if (!checkbox) {
      console.error('SMS toggle elements not found!');
      return;
    }
    
    console.log('Checkbox checked before:', checkbox.checked);
    
    // Update state based on checkbox state after it changes
    const newValue = checkbox.checked;
    setSmsNotifications(newValue);
    
    console.log('SMS notifications changed to:', newValue ? 'ON' : 'OFF');
    
    // Update in database
    updatePreference('sms', newValue);
    
    // Show success message
    showNotification('SMS notification settings updated', 'success');
  };

  return (
    <div className="tab-panel active" id="preferences-panel">
      <form className="settings-form">
        {/* Theme Section */}
        <div className="edit-mode-container form-section" id="theme-section" style={{marginBottom: '20px'}}>
          <div className="edit-toggle-header">
            <h3>Theme</h3>
            <div className="edit-controls">
              <div className="toggle-switch-container">
                <span className="toggle-status" id="themeDisplay">{isDarkTheme ? 'Dark' : 'Light'}</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="darkTheme" 
                    checked={isDarkTheme}
                    onChange={toggleTheme}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Email Notifications Section */}
        <div className="edit-mode-container form-section" id="email-notifications-section" style={{marginBottom: '20px'}}>
          <div className="edit-toggle-header">
            <h3>Email Notifications</h3>
            <div className="edit-controls">
              <div className="toggle-switch-container">
                <span className="toggle-status" id="emailNotificationsDisplay">{emailNotifications ? 'ON' : 'OFF'}</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="emailNotifications" 
                    checked={emailNotifications}
                    onChange={toggleEmailNotifications}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Browser Notifications Section */}
        <div className="edit-mode-container form-section" id="browser-notifications-section" style={{marginBottom: '20px'}}>
          <div className="edit-toggle-header">
            <h3>Browser Notifications</h3>
            <div className="edit-controls">
              <div className="toggle-switch-container">
                <span className="toggle-status" id="browserNotificationsDisplay">{browserNotifications ? 'ON' : 'OFF'}</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="browserNotifications" 
                    checked={browserNotifications}
                    onChange={toggleBrowserNotifications}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SMS Notifications Section */}
        <div className="edit-mode-container form-section" id="sms-notifications-section">
          <div className="edit-toggle-header">
            <h3>SMS Notifications</h3>
            <div className="edit-controls">
              <div className="toggle-switch-container">
                <span className="toggle-status" id="smsNotificationsDisplay">{smsNotifications ? 'ON' : 'OFF'}</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="smsNotifications" 
                    checked={smsNotifications}
                    onChange={toggleSMSNotifications}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PreferencesTab;