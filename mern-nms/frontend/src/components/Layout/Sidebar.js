import React, { useState } from 'react';
import { Nav, Accordion, Badge } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ activeSection, onSectionChange }) => {
  const { connected, alerts } = useSocket();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(['0']); // Keep first section expanded by default

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'fas fa-chart-line',
      href: '#dashboard'
    },
    {
      id: 'monitoring',
      title: 'Monitoring',
      icon: 'fas fa-eye',
      children: [
        { id: 'topology', title: 'Network Topology', icon: 'fas fa-project-diagram' },
        { id: 'devices', title: 'Device Status', icon: 'fas fa-server' },
        { id: 'metrics', title: 'Performance', icon: 'fas fa-chart-bar' }
      ]
    },
    {
      id: 'management',
      title: 'Management',
      icon: 'fas fa-cogs',
      children: [
        { id: 'discovery', title: 'Auto Discovery', icon: 'fas fa-search' },
        { id: 'network-config', title: 'Network Config', icon: 'fas fa-network-wired' },
        { id: 'maintenance', title: 'Maintenance', icon: 'fas fa-tools' }
      ]
    },
    {
      id: 'alerts',
      title: 'Alerts & Events',
      icon: 'fas fa-exclamation-triangle',
      badge: alerts?.length || 0,
      href: '#alerts'
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      icon: 'fas fa-chart-bar',
      href: '#reports'
    },
    ...(user?.role === 'admin' ? [{
      id: 'admin',
      title: 'Administration',
      icon: 'fas fa-shield-alt',
      children: [
        { id: 'users-management', title: 'User Management', icon: 'fas fa-users' },
        { id: 'system-settings', title: 'System Settings', icon: 'fas fa-cogs' },
        { id: 'security-audit', title: 'Security Audit', icon: 'fas fa-security' },
        { id: 'backup-restore', title: 'Backup & Restore', icon: 'fas fa-database' }
      ]
    }] : []),
    {
      id: 'profile',
      title: 'User Profile',
      icon: 'fas fa-user-circle',
      children: [
        { id: 'profile-settings', title: 'Profile Settings', icon: 'fas fa-user-edit' },
        { id: 'preferences', title: 'Preferences', icon: 'fas fa-sliders-h' },
        { id: 'notifications', title: 'Notifications', icon: 'fas fa-bell' }
      ]
    }
  ];

  const handleAccordionSelect = (eventKey) => {
    if (expanded.includes(eventKey)) {
      setExpanded(expanded.filter(key => key !== eventKey));
    } else {
      setExpanded([...expanded, eventKey]);
    }
  };

  const handleItemClick = (itemId) => {
    onSectionChange(itemId);
  };

  return (
    <div className="sidebar bg-light border-end" style={{ width: '280px', minHeight: '100vh' }}>
      <div className="p-3 border-bottom">
        <div className="d-flex align-items-center">
          <div className={`me-2 ${connected ? 'text-success' : 'text-danger'}`}>
            <i className="fas fa-circle" style={{ fontSize: '8px' }}></i>
          </div>
          <small className="text-muted">
            {connected ? 'System Online' : 'System Offline'}
          </small>
        </div>
      </div>

      <div className="sidebar-content">
        <Accordion 
          activeKey={expanded} 
          onSelect={handleAccordionSelect}
          flush
        >
          {menuItems.map((item, index) => (
            <div key={item.id}>
              {item.children ? (
                <Accordion.Item eventKey={index.toString()}>
                  <Accordion.Header>
                    <div className="d-flex align-items-center w-100">
                      <i className={`${item.icon} me-2 text-primary`}></i>
                      <span className="fw-medium">{item.title}</span>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body className="p-0">
                    {item.children.map((child) => (
                      <Nav.Link
                        key={child.id}
                        className={`ps-4 py-2 border-0 ${activeSection === child.id ? 'bg-primary text-white' : 'text-dark'}`}
                        onClick={() => handleItemClick(child.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className={`${child.icon} me-2`}></i>
                        {child.title}
                      </Nav.Link>
                    ))}
                  </Accordion.Body>
                </Accordion.Item>
              ) : (
                <Nav.Link
                  className={`p-3 border-0 d-flex align-items-center justify-content-between ${activeSection === item.id ? 'bg-primary text-white' : 'text-dark'}`}
                  onClick={() => handleItemClick(item.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <i className={`${item.icon} me-2`}></i>
                    <span className="fw-medium">{item.title}</span>
                  </div>
                  {item.badge > 0 && (
                    <Badge bg="danger" className="ms-2">
                      {item.badge}
                    </Badge>
                  )}
                </Nav.Link>
              )}
            </div>
          ))}
        </Accordion>
      </div>

      <div className="mt-auto p-3 border-top">
        <div className="text-center">
          <small className="text-muted">
            <i className="fas fa-info-circle me-1"></i>
            NMS v2.0
          </small>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;