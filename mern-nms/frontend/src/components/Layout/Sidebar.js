import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ activeItem, onItemClick, isCollapsed, onToggle }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie', path: '/dashboard' },
    { id: 'devices', label: 'Devices', icon: 'fas fa-microchip', path: '/devices' },
    { id: 'topology', label: 'Network Topology', icon: 'fas fa-sitemap', path: '/topology' },
    { id: 'discovery', label: 'Discovery', icon: 'fas fa-search-plus', path: '/discovery' },
    { id: 'metrics', label: 'Metrics', icon: 'fas fa-chart-bar', path: '/metrics' },
    { id: 'alerts', label: 'Alerts', icon: 'fas fa-bell', path: '/alerts' }
  ];

  const adminItems = [
    { id: 'users', label: 'User Management', icon: 'fas fa-users-cog', path: '/admin/users' },
    { id: 'network-config', label: 'Network Config', icon: 'fas fa-network-wired', path: '/admin/network' },
    { id: 'system', label: 'System Settings', icon: 'fas fa-cogs', path: '/admin/system' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'fas fa-chart-line', path: '/admin/reports' }
  ];

  return (
    <div 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      onMouseEnter={() => isCollapsed && onToggle && onToggle()}
      onMouseLeave={() => !isCollapsed && onToggle && onToggle()}
    >
      <div className="sidebar-header">
        <div className="logo-section">
          <div className="logo-container">
            <i className="fas fa-cube logo-icon"></i>
            {!isCollapsed && <span className="logo-text">NMS</span>}
          </div>
        </div>

      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <ul className="nav-list">
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
                  <div className="nav-icon">
                    <i className={item.icon}></i>
                  </div>
                  {!isCollapsed && <span className="nav-label">{item.label}</span>}
                  {activeItem === item.id && <div className="nav-indicator"></div>}
                </a>
              </li>
            ))}
          </ul>
          
          {user?.role === 'admin' && (
            <div className="admin-section">
              <div className="section-divider"></div>
              {!isCollapsed && <div className="section-header">ADMIN</div>}
              <ul className="nav-list">
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
                      <div className="nav-icon">
                        <i className={item.icon}></i>
                      </div>
                      {!isCollapsed && <span className="nav-label">{item.label}</span>}
                      {activeItem === item.id && <div className="nav-indicator"></div>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </nav>

        <div className="sidebar-footer">
          <div className="footer-section">
            <div className="profile-item">
              <a
                href="#"
                className="nav-link profile-link"
                title={isCollapsed ? 'Profile' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  onItemClick('profile', '/profile');
                }}
              >
                <div className="nav-icon">
                  <i className="fas fa-user-circle"></i>
                </div>
                {!isCollapsed && (
                  <div className="profile-info">
                    <span className="profile-name">{user?.username}</span>
                    <span className="profile-role">{user?.role}</span>
                  </div>
                )}
              </a>
            </div>
            <div className="logout-item">
              <button
                className="nav-link logout-btn"
                title={isCollapsed ? 'Logout' : ''}
                onClick={logout}
              >
                <div className="nav-icon">
                  <i className="fas fa-sign-out-alt"></i>
                </div>
                {!isCollapsed && <span className="nav-label">Logout</span>}
              </button>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Sidebar;
