import React, { useState, Suspense } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import Sidebar from './Sidebar';

// Import dashboard components
import Dashboard from '../Dashboard/Dashboard';
import Topology from '../Dashboard/Topology';
import Devices from '../Dashboard/Devices';
import Alerts from '../Alerts';
import Discovery from '../Dashboard/Discovery';

// Lazy load admin and profile components
const ProfileSettings = React.lazy(() => import('../Profile/ProfileSettings'));
const UsersManagement = React.lazy(() => import('../Admin/UsersManagement'));
const SystemSettings = React.lazy(() => import('../Admin/SystemSettings'));
const NetworkConfiguration = React.lazy(() => import('../Admin/NetworkConfiguration'));
const Reports = React.lazy(() => import('../Reports/Reports'));

const Layout = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSectionChange = (sectionId, path) => {
    setActiveSection(sectionId);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const LoadingSpinner = () => (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
      <Spinner animation="border" role="status" variant="primary">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'topology':
        return <Topology />;
      case 'devices':
        return <Devices />;
      case 'alerts':
        return <Alerts />;
      case 'discovery':
        return <Discovery />;
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
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ProfileSettings />
          </Suspense>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="d-flex min-vh-100" style={{ backgroundColor: '#0f1419' }}>
      <Sidebar 
        activeItem={activeSection}
        onItemClick={handleSectionChange}
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      
      <main className={`flex-grow-1 ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Container fluid className="p-4">
          <div className="content-wrapper">
            {renderContent()}
          </div>
        </Container>
      </main>
    </div>
  );
};

export default Layout;
