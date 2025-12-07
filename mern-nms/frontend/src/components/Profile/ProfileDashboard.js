import React, { useState, useEffect, useRef } from 'react';
import * as feather from 'feather-icons';
import ProfileCard from './ProfileCard';
import SettingsCard from './SettingsCard';
import ChangeCoverModal from './modals/ChangeCoverModal';
import { showNotification } from './notifications';
import { profileAPI } from '../../services/api';
import './ProfileDashboard.css';

function Dashboard({ isDarkTheme, setIsDarkTheme }) {
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [coverBackground, setCoverBackground] = useState(() => {
    return localStorage.getItem('coverBackground') || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  });
  const gradientHeaderRef = useRef(null);

  useEffect(() => {
    // Replace icons when component mounts
    feather.replace();
    
    // Load user profile data including cover
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const response = await profileAPI.getProfile();
      const user = response.data;
      
      // Update cover background from database or keep localStorage fallback
      const savedCover = user.profile?.coverImage || localStorage.getItem('coverBackground') || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      setCoverBackground(savedCover);
      
      if (gradientHeaderRef.current && savedCover) {
        updateBackground(savedCover);
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      // Use fallback cover on error
      const fallbackCover = localStorage.getItem('coverBackground') || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      setCoverBackground(fallbackCover);
      if (gradientHeaderRef.current && fallbackCover) {
        updateBackground(fallbackCover);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Apply cover background when it changes
  useEffect(() => {
    if (gradientHeaderRef.current && coverBackground) {
      updateBackground(coverBackground);
    }
  }, [coverBackground]);

  const updateBackground = async (background) => {
    const gradientHeader = gradientHeaderRef.current;
    if (!gradientHeader) return;

    // Remove existing overlay and pattern
    const existingOverlay = gradientHeader.querySelector('.cover-overlay');
    const existingPattern = gradientHeader.querySelector('.pattern-overlay');
    if (existingOverlay) existingOverlay.remove();
    if (existingPattern) existingPattern.remove();

    if (background.startsWith('url(')) {
      // It's an image
      gradientHeader.style.background = background;
      gradientHeader.style.backgroundSize = 'cover';
      gradientHeader.style.backgroundPosition = 'center';
      gradientHeader.style.backgroundRepeat = 'no-repeat';
      
      // Add subtle overlay for readability
      const overlay = document.createElement('div');
      overlay.className = 'cover-overlay';
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%);
        z-index: 1;
      `;
      gradientHeader.appendChild(overlay);
    } else {
      // It's a gradient - apply with animation and pattern overlay
      gradientHeader.style.background = background;
      gradientHeader.style.backgroundSize = '400% 400%';
      gradientHeader.style.backgroundPosition = '';
      gradientHeader.style.backgroundRepeat = '';
      gradientHeader.style.animation = 'gradientShift 15s ease infinite';
      
      // Add geometric shapes
      const shapes = [
        { top: '20px', left: '10%', width: '40px', height: '40px', transform: 'rotate(45deg)', opacity: '0.3' },
        { top: '60px', right: '15%', width: '30px', height: '30px', transform: 'rotate(45deg)', opacity: '0.25' },
        { top: '100px', left: '20%', width: '35px', height: '35px', transform: 'rotate(45deg)', opacity: '0.2' },
        { top: '140px', right: '25%', width: '25px', height: '25px', transform: 'rotate(45deg)', opacity: '0.3' },
        { top: '40px', left: '50%', width: '20px', height: '20px', transform: 'rotate(45deg)', opacity: '0.25' },
        { top: '80px', right: '40%', width: '45px', height: '45px', transform: 'rotate(45deg)', opacity: '0.15' },
        { top: '160px', left: '60%', width: '28px', height: '28px', transform: 'rotate(45deg)', opacity: '0.2' },
        { top: '30px', right: '5%', width: '32px', height: '32px', transform: 'rotate(45deg)', opacity: '0.25' }
      ];

      const patternOverlay = document.createElement('div');
      patternOverlay.className = 'pattern-overlay';
      patternOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
      `;

      shapes.forEach(shape => {
        const shapeElement = document.createElement('div');
        shapeElement.style.cssText = `
          position: absolute;
          top: ${shape.top};
          ${shape.left ? `left: ${shape.left};` : `right: ${shape.right};`}
          width: ${shape.width};
          height: ${shape.height};
          background: rgba(255, 255, 255, ${shape.opacity});
          transform: ${shape.transform};
        `;
        patternOverlay.appendChild(shapeElement);
      });

      gradientHeader.appendChild(patternOverlay);
    }
    
    setCoverBackground(background);
    localStorage.setItem('coverBackground', background);
    
    // Update in database
    try {
      await profileAPI.updateCover(background);
    } catch (error) {
      console.error('Failed to save cover to database:', error);
      // Still works locally even if database update fails
    }
  };

  const handleChangeCover = () => {
    setShowCoverModal(true);
  };

  const handleUpdateCover = (background) => {
    updateBackground(background);
    showNotification('Cover background updated successfully!', 'success');
  };

  return (
    <div className="profile-dashboard-container dark-theme">
      {/* Gradient Header Background */}
      <div className="gradient-header" ref={gradientHeaderRef}>
        <button className="change-cover-btn" onClick={handleChangeCover}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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
          Change Cover
        </button>
      </div>

      {/* Main Dashboard Container */}
      <div className="dashboard-container">
        <div className="dashboard-layout">
          {/* Left Panel - Profile Card */}
          <div className="profile-panel">
            <ProfileCard />
          </div>

          {/* Right Panel - Settings Card */}
          <div className="settings-panel">
            <SettingsCard isDarkTheme={isDarkTheme} setIsDarkTheme={setIsDarkTheme} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCoverModal && (
        <ChangeCoverModal 
          onClose={() => setShowCoverModal(false)}
          onUpdateCover={handleUpdateCover}
        />
      )}
    </div>
  );
}

export default Dashboard;
