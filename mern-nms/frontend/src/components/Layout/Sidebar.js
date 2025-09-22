import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ activeItem, onItemClick, isCollapsed, onToggle }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt', path: '/dashboard' },
    { id: 'devices', label: 'Devices', icon: 'fas fa-server', path: '/devices' },
    { id: 'topology', label: 'Network Topology', icon: 'fas fa-project-diagram', path: '/topology' },
    { id: 'discovery', label: 'Discovery', icon: 'fas fa-search', path: '/discovery' },
    { id: 'metrics', label: 'Metrics', icon: 'fas fa-chart-line', path: '/metrics' },
    { id: 'alerts', label: 'Alerts', icon: 'fas fa-exclamation-triangle', path: '/alerts' }
  ];

  const adminItems = [
    { id: 'users', label: 'User Management', icon: 'fas fa-users', path: '/admin/users' },
    { id: 'network-config', label: 'Network Config', icon: 'fas fa-network-wired', path: '/admin/network' },
    { id: 'system', label: 'System Settings', icon: 'fas fa-sliders-h', path: '/admin/system' }
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="d-flex align-items-center justify-content-between">
          <h4><i className="fas fa-network-wired"></i> {!isCollapsed && 'NMS'}</h4>
          {onToggle && (
            <button
              className="btn btn-link text-light p-1"
              onClick={onToggle}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <i className={`fas fa-${isCollapsed ? 'chevron-right' : 'chevron-left'}`}></i>
            </button>
          )}
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav flex-column">
          {menuItems.map(item => (
            <li key={item.id} className="nav-item">
              <a
                href="#"
                className={`nav-link ${activeItem === item.id ? 'active' : ''}`}
                title={isCollapsed ? item.label : ''}
                onClick={(e) => {
                  e.preventDefault();
                  onItemClick(item.id, item.path);
                }}
              >
                <i className={item.icon}></i>
                {!isCollapsed && <span className="ms-2">{item.label}</span>}
              </a>
            </li>
          ))}
          
          {user?.role === 'admin' && (
            <>
              <li className="nav-item">
                <hr className="sidebar-divider" />
              </li>
              {!isCollapsed && (
                <li className="nav-item">
                  <span className="nav-header">Administration</span>
                </li>
              )}
              {adminItems.map(item => (
                <li key={item.id} className="nav-item">
                  <a
                    href="#"
                    className={`nav-link ${activeItem === item.id ? 'active' : ''}`}
                    title={isCollapsed ? item.label : ''}
                    onClick={(e) => {
                      e.preventDefault();
                      onItemClick(item.id, item.path);
                    }}
                  >
                    <i className={item.icon}></i>
                    {!isCollapsed && <span className="ms-2">{item.label}</span>}
                  </a>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="d-flex align-items-center">
            <i className="fas fa-user-circle fs-4"></i>
            {!isCollapsed && (
              <div className="ms-2">
                <div className="fw-bold">{user?.username}</div>
                <small className="text-muted">{user?.role}</small>
              </div>
            )}
          </div>
          <button
            className="btn btn-outline-light btn-sm mt-2"
            title={isCollapsed ? 'Logout' : ''}
            onClick={logout}
          >
            <i className="fas fa-sign-out-alt"></i>
            {!isCollapsed && <span className="ms-1">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
