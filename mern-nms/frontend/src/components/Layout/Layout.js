import React, { useState, Suspense } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import Header from './Header';

// Import dashboard components
import Dashboard from '../Dashboard/Dashboard';
import Topology from '../Dashboard/Topology';
import Devices from '../Dashboard/Devices';
import Alerts from '../Dashboard/Alerts';
import Discovery from '../Dashboard/Discovery';

// Lazy load admin and profile components
const ProfileSettings = React.lazy(() => import('../Profile/ProfileSettings'));
const UsersManagement = React.lazy(() => import('../Admin/UsersManagement'));
const SystemSettings = React.lazy(() => import('../Admin/SystemSettings'));
const NetworkConfiguration = React.lazy(() => import('../Admin/NetworkConfiguration'));
const Reports = React.lazy(() => import('../Reports/Reports'));

const Layout = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

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
      case 'users-management':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <UsersManagement />
          </Suspense>
        );
      case 'system-settings':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SystemSettings />
          </Suspense>
        );
      case 'profile-settings':
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
    <div className="min-vh-100" style={{ backgroundColor: '#0f1419' }}>
      <Header activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="flex-grow-1">
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
