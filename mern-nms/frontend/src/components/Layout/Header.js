import React, { useState } from 'react';
import { Navbar, Nav, Container, NavDropdown, Badge, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const Header = ({ activeSection, onSectionChange }) => {
  const { user, logout } = useAuth();
  const { connected, alerts, deviceCount } = useSocket();

  const handleLogout = () => {
    logout();
  };

  const isAdmin = user?.role === 'admin';

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm sticky-top" style={{ backgroundColor: '#1a1a1a !important' }}>
      <Container fluid>
        <Navbar.Brand 
          href="#" 
          className="fw-bold d-flex align-items-center"
          onClick={() => onSectionChange('dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <i className="fas fa-network-wired me-2 text-primary"></i>
          <span className="text-white">NMS</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/* Main Navigation Items */}
            <Nav.Link 
              className={`px-3 ${activeSection === 'dashboard' ? 'active bg-primary rounded' : ''}`}
              onClick={() => onSectionChange('dashboard')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-chart-line me-1"></i>
              Dashboard
            </Nav.Link>

            <Nav.Link 
              className={`px-3 ${activeSection === 'topology' ? 'active bg-primary rounded' : ''}`}
              onClick={() => onSectionChange('topology')}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-project-diagram me-1"></i>
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
            {/* Connection Status */}
            <Nav.Item className="me-3">
              <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
                <i className={`fas ${connected ? 'fa-wifi' : 'fa-wifi-slash'} me-1`}></i>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </Nav.Item>

            {/* User Dropdown */}
            <NavDropdown 
              title={
                <span className="text-white">
                  <i className="fas fa-user-circle me-1"></i>
                  {user?.username || 'User'}
                </span>
              } 
              id="user-nav-dropdown"
              align="end"
            >
              <NavDropdown.Item onClick={() => onSectionChange('profile-settings')}>
                <i className="fas fa-user me-2"></i>Profile
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>
                <i className="fas fa-sign-out-alt me-2"></i>Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;