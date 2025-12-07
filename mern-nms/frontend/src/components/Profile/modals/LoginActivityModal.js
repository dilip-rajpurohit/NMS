import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as feather from 'feather-icons';

function LoginActivityModal({ onClose, onSuccess }) {
  const [expandedView, setExpandedView] = useState(false);
  
  const [sessions] = useState([
    {
      id: 'current',
      name: 'Current Session',
      location: 'San Francisco, CA • Chrome on Windows',
      time: 'Active now',
      status: 'current',
      canRevoke: false
    },
    {
      id: 'mobile',
      name: 'Mobile App',
      location: 'San Francisco, CA • iOS App',
      time: '2 hours ago',
      status: 'active',
      canRevoke: true
    },
    {
      id: 'office',
      name: 'Office Computer',
      location: 'San Francisco, CA • Firefox on Mac',
      time: 'Yesterday 5:30 PM',
      status: 'active',
      canRevoke: true
    },
    {
      id: 'laptop',
      name: 'Home Laptop',
      location: 'San Francisco, CA • Edge on Windows',
      time: '2 days ago',
      status: 'active',
      canRevoke: true
    },
    {
      id: 'iphone',
      name: 'Work iPhone',
      location: 'San Francisco, CA • Safari on iOS',
      time: '3 days ago',
      status: 'active',
      canRevoke: true
    },
    {
      id: 'coffee',
      name: 'Coffee Shop Session',
      location: 'San Francisco, CA • Chrome on Mac',
      time: '1 week ago',
      status: 'active',
      canRevoke: true
    },
    {
      id: 'library',
      name: 'Library Computer',
      location: 'Oakland, CA • Firefox on Linux',
      time: '2 weeks ago',
      status: 'active',
      canRevoke: true
    },
    {
      id: 'hotel',
      name: 'Hotel WiFi',
      location: 'Los Angeles, CA • Chrome on Android',
      time: '3 weeks ago',
      status: 'active',
      canRevoke: true
    }
  ]);

  const [activeSessions, setActiveSessions] = useState(sessions);

  useEffect(() => {
    feather.replace();
  }, []);

  useEffect(() => {
    feather.replace();
  }, [expandedView]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleRevokeSession = (sessionId) => {
    if (window.confirm('Are you sure you want to revoke this session? The user will be logged out immediately.')) {
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
      onSuccess(`Session revoked successfully`, 'success');
    }
  };

  const displayedSessions = expandedView ? activeSessions : activeSessions.slice(0, 3);

  return createPortal(
    <div 
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 11000,
        backdropFilter: 'blur(4px)'
      }}
    >
      <div style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        padding: '22px',
        maxWidth: '760px',
        width: '92%',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-blue-light) 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i data-feather="activity" style={{ width: '18px', height: '18px', color: 'white' }}></i>
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '18px' }}>Session Management</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-light)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <i data-feather="x" style={{ width: '18px', height: '18px' }}></i>
          </button>
        </div>

        <div style={{ padding: '6px 0 0 0' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>Active Sessions</div>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              padding: '6px 10px',
              borderRadius: '999px',
              border: '1px solid var(--border-color)'
            }}>
              {activeSessions.length} sessions
            </div>
          </div>

          <div style={{
            maxHeight: expandedView ? '480px' : '300px',
            overflow: expandedView && activeSessions.length > 3 ? 'auto' : 'hidden',
            paddingRight: '6px',
            transition: 'max-height 0.3s ease',
            scrollbarWidth: 'thin',
            scrollbarColor: '#4b5563 var(--border-color)'
          }}>
            {displayedSessions.map((session) => (
              <div key={session.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                marginBottom: '8px',
                background: 'var(--tertiary-background)'
              }}>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {session.name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '2px' }}>
                    {session.location}
                  </div>
                  <div style={{ 
                    color: session.status === 'current' ? '#22c55e' : 'var(--text-secondary)', 
                    fontSize: '12px' 
                  }}>
                    {session.time}
                  </div>
                </div>
                <div>
                  {session.status === 'current' ? (
                    <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: '600' }}>
                      This device
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleRevokeSession(session.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#b91c1c'}
                      onMouseOut={(e) => e.target.style.background = '#dc2626'}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {activeSessions.length > 3 && (
            <div style={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(0deg, var(--card-background) 60%, transparent 100%)',
              padding: '12px 0 0 0',
              textAlign: 'center'
            }}>
              <button 
                onClick={() => setExpandedView(!expandedView)}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: '0 auto',
                  transition: 'background-color 0.2s ease'
                }}
              >
                <span>{expandedView ? 'Show fewer sessions' : 'Show more sessions'}</span>
                <i 
                  data-feather={expandedView ? 'chevron-up' : 'chevron-down'} 
                  style={{ 
                    width: '14px', 
                    height: '14px', 
                    color: 'white',
                    transform: expandedView ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                ></i>
              </button>
            </div>
          )}



          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'var(--tertiary-background)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}>
                  Security Actions
                </div>
              </div>
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to revoke all other sessions? All other devices will be logged out.')) {
                    setActiveSessions(prev => prev.filter(session => session.status === 'current'));
                    onSuccess('All other sessions revoked successfully', 'success');
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                onMouseOver={(e) => e.target.style.background = '#b91c1c'}
                onMouseOut={(e) => e.target.style.background = '#dc2626'}
              >
                Revoke All Others
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LoginActivityModal;