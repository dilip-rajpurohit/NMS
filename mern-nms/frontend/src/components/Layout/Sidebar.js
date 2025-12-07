import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as feather from 'feather-icons';

const Sidebar = ({ activeItem, onItemClick, isCollapsed, onToggle }) => {
  const { user, logout } = useAuth();

  useEffect(() => {
    // Initialize feather icons
    feather.replace();
  }, [isCollapsed]); // Re-run when sidebar collapses/expands

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'pie-chart', path: '/dashboard' },
    { id: 'devices', label: 'Devices', icon: 'cpu', path: '/devices' },
    { id: 'topology', label: 'Network Topology', icon: 'share-2', path: '/topology' },
    { id: 'discovery', label: 'Discovery', icon: 'search', path: '/discovery' },
    { id: 'metrics', label: 'Metrics', icon: 'bar-chart', path: '/metrics' },
    { id: 'alerts', label: 'Alerts', icon: 'bell', path: '/alerts' }
  ];

  const adminNavItems = [
    { id: 'users', label: 'User Management', icon: 'users', path: '/admin/users' },
    { id: 'network-config', label: 'Network Config', icon: 'wifi', path: '/admin/network' },
    { id: 'system', label: 'System Settings', icon: 'settings', path: '/admin/system' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'trending-up', path: '/admin/reports' }
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
            <i data-feather="activity" className="logo-icon"></i>
            {!isCollapsed && <span className="logo-text" style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>NetWatch</span>}
          </div>
        </div>

      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <ul className="nav-list">
            {mainNavItems.map(item => (
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
                    <i data-feather={item.icon}></i>
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
                {adminNavItems.map(item => (
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
                        <i data-feather={item.icon}></i>
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
                  {user?.profile?.avatar ? (
                    <img 
                      src={user.profile.avatar} 
                      alt="User Avatar" 
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <i data-feather="user"></i>
                  )}
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
                  <i data-feather="log-out"></i>
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
