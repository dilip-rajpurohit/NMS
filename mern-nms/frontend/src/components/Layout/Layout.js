import React, { useState, Suspense, useEffect } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import Sidebar from './Sidebar';

// Import dashboard components
import Dashboard from '../Dashboard/Dashboard';
import AdvancedTopology from '../Dashboard/AdvancedTopology';
import Devices from '../Dashboard/Devices';
import Alerts from '../Alerts';
import Discovery from '../Dashboard/Discovery';
import Metrics from '../Dashboard/Metrics';

// Lazy load admin and profile components
const ProfileDashboard = React.lazy(() => import('../Profile/ProfileDashboard'));
const UsersManagement = React.lazy(() => import('../Admin/UsersManagement'));
const SystemSettings = React.lazy(() => import('../Admin/SystemSettings'));
const NetworkConfiguration = React.lazy(() => import('../Admin/NetworkConfiguration'));
const Reports = React.lazy(() => import('../Reports/Reports'));

const Layout = ({ isDarkTheme, setIsDarkTheme }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const handleSectionChange = (sectionId, path) => {
    setActiveSection(sectionId);
  };

  // Listen for global navigation events (from other components)
  useEffect(() => {
    const onNavigate = (e) => {
      if (e && e.detail && e.detail.section) {
        setActiveSection(e.detail.section);
      }
    };

    window.addEventListener('nms:navigate', onNavigate);
    return () => window.removeEventListener('nms:navigate', onNavigate);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const LoadingSpinner = () => (
    <div className="d-flex justify-content-center align-items-center" style={{ 
      minHeight: '200px',
      color: 'var(--primary-blue)'
    }}>
      <Spinner animation="border" role="status" style={{ 
        color: 'var(--primary-blue)',
        borderColor: 'var(--primary-blue)'
      }}>
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'topology':
        return <AdvancedTopology />;
      case 'devices':
        return <Devices />;
      case 'alerts':
        return <Alerts />;
      case 'discovery':
        return <Discovery />;
      case 'metrics':
        return <Metrics />;
      case 'network-config':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <NetworkConfiguration />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Reports />
          </Suspense>
        );
      case 'users':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <UsersManagement />
          </Suspense>
        );
      case 'system':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SystemSettings />
          </Suspense>
        );
      case 'profile':
      case 'profile-settings':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ProfileDashboard isDarkTheme={isDarkTheme} setIsDarkTheme={setIsDarkTheme} />
          </Suspense>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeItem={activeSection}
        onItemClick={handleSectionChange}
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-wrapper">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Layout;
