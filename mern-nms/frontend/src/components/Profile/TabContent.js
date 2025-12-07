import React from 'react';
import ProfileTab from './tabs/ProfileTab';
import SecurityTab from './tabs/SecurityTab';
import PreferencesTab from './tabs/PreferencesTab';

const TabContent = ({ activeTab, isDarkTheme, setIsDarkTheme }) => {
  return (
    <div className="tab-content">
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'preferences' && <PreferencesTab isDarkTheme={isDarkTheme} setIsDarkTheme={setIsDarkTheme} />}
    </div>
  );
};

export default TabContent;
