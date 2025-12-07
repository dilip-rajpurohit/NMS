import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, NavDropdown, Badge, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import * as feather from 'feather-icons';

const Header = ({ activeSection, onSectionChange }) => {
  const { user, logout } = useAuth();
  const { connected, alerts, deviceCount } = useSocket();
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  useEffect(() => {
    // Initialize theme from user preference or localStorage
    if (user && user.isDarkTheme !== undefined) {
      setIsDarkTheme(user.isDarkTheme);
    } else {
      const savedTheme = localStorage.getItem('isDarkTheme');
      if (savedTheme !== null) {
        setIsDarkTheme(JSON.parse(savedTheme));
      }
    }
  }, [user]);

  useEffect(() => {
    // Apply theme changes
    const html = document.documentElement;
    const body = document.body;
    
    if (isDarkTheme) {
      html.classList.remove('light-theme');
      html.classList.add('dark-theme');
      body.classList.remove('light-theme');
      body.classList.add('dark-theme');
    } else {
      html.classList.remove('dark-theme');
      html.classList.add('light-theme');
      body.classList.remove('dark-theme');
      body.classList.add('light-theme');
    }

    // Re-initialize feather icons after theme change
    setTimeout(() => feather.replace(), 100);
    
    // Save theme preference
    localStorage.setItem('isDarkTheme', JSON.stringify(isDarkTheme));
  }, [isDarkTheme]);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const handleLogout = () => {
    logout();
  };

  const isAdmin = user?.role === 'admin';

  return (
    <Navbar expand="lg" className="shadow-sm sticky-top" style={{ 
      backgroundColor: 'var(--sidebar-background)',
      borderBottom: '1px solid var(--border-color)',
      color: 'var(--text-primary)'
    }}>
      <Container fluid>
        <Navbar.Brand 
          href="#" 
          className="fw-bold d-flex align-items-center"
          onClick={() => onSectionChange('dashboard')}
          style={{ cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          <i data-feather="activity" style={{ color: 'var(--primary-blue)', width: '20px', height: '20px', marginRight: '8px' }}></i>
          <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>NetWatch</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/* Main Navigation Items */}
            <Nav.Link 
              className={`px-3 ${activeSection === 'dashboard' ? 'active bg-primary rounded' : ''}`}
              onClick={() => onSectionChange('dashboard')}
              style={{ cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              <i data-feather="bar-chart-2" style={{ width: '16px', height: '16px', marginRight: '4px' }}></i>
              Dashboard
            </Nav.Link>

            <Nav.Link 
              className={`px-3 ${activeSection === 'topology' ? 'active bg-primary rounded' : ''}`}
              onClick={() => onSectionChange('topology')}
              style={{ cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              <i data-feather="share-2" style={{ width: '16px', height: '16px', marginRight: '4px' }}></i>
              Topology
            </Nav.Link>

            <Nav.Link 
              className={`px-3 ${activeSection === 'devices' ? 'active bg-primary rounded' : ''}`}
              onClick={() => onSectionChange('devices')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-server me-1"></i>
              Devices
              {deviceCount > 0 && (
                <Badge bg="success" className="ms-1">{deviceCount}</Badge>
              )}
            </Nav.Link>

            <Nav.Link 
              className={`px-3 ${activeSection === 'discovery' ? 'active bg-primary rounded' : ''}`}
              onClick={() => onSectionChange('discovery')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-search me-1"></i>
              Discovery
            </Nav.Link>

            <Nav.Link 
              className={`px-3 ${activeSection === 'alerts' ? 'active bg-primary rounded' : ''}`}
              onClick={() => onSectionChange('alerts')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-exclamation-triangle me-1"></i>
              Alerts
              {alerts?.length > 0 && (
                <Badge bg="danger" className="ms-1">{alerts.length}</Badge>
              )}
            </Nav.Link>

            {/* Admin Dropdown */}
            {isAdmin && (
              <NavDropdown 
                title={<><i className="fas fa-cogs me-1"></i>Admin</>} 
                id="admin-nav-dropdown"
                className="px-2"
              >
                <NavDropdown.Item onClick={() => onSectionChange('users-management')}>
                  <i className="fas fa-users me-2"></i>Users
                </NavDropdown.Item>
                <NavDropdown.Item onClick={() => onSectionChange('system-settings')}>
                  <i className="fas fa-cog me-2"></i>Settings
                </NavDropdown.Item>
                <NavDropdown.Item onClick={() => onSectionChange('network-config')}>
                  <i className="fas fa-network-wired me-2"></i>Network Config
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={() => onSectionChange('reports')}>
                  <i className="fas fa-chart-bar me-2"></i>Reports
                </NavDropdown.Item>
              </NavDropdown>
            )}
          </Nav>

          {/* Right side items */}
          <Nav className="ms-auto d-flex align-items-center">
            {/* Theme Toggle */}
            <Nav.Item className="me-3">
              <button
                className="btn btn-outline-light btn-sm d-flex align-items-center"
                onClick={toggleTheme}
                title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <i 
                  data-feather={isDarkTheme ? 'sun' : 'moon'} 
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    marginRight: '6px',
                    color: 'var(--primary-blue)'
                  }}
                ></i>
                {isDarkTheme ? 'Light' : 'Dark'}
              </button>
            </Nav.Item>

            {/* Connection Status */}
            <Nav.Item className="me-3">
              <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
                <i data-feather={connected ? 'wifi' : 'wifi-off'} style={{ width: '14px', height: '14px', marginRight: '4px' }}></i>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </Nav.Item>

            {/* User Dropdown */}
            <NavDropdown 
              title={
                <span style={{ color: 'var(--text-primary)' }}>
                  <i data-feather="user" style={{ width: '16px', height: '16px', marginRight: '4px' }}></i>
                  {user?.username || 'User'}
                </span>
              } 
              id="user-nav-dropdown"
              align="end"
            >
              <NavDropdown.Item onClick={() => onSectionChange('profile')}>
                <i data-feather="user" style={{ width: '16px', height: '16px', marginRight: '8px' }}></i>Profile
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>
                <i data-feather="log-out" style={{ width: '16px', height: '16px', marginRight: '8px' }}></i>Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;