import React, { useState } from 'react';
import TabNavigation from './TabNavigation';
import TabContent from './TabContent';

const SettingsCard = ({ isDarkTheme, setIsDarkTheme }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  return (
    <div className="settings-card">
      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <TabContent activeTab={activeTab} isDarkTheme={isDarkTheme} setIsDarkTheme={setIsDarkTheme} />
    </div>
  );
};

export default SettingsCard;
