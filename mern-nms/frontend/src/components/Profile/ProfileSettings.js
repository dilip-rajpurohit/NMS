import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, Badge, Modal } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ProfileSettings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('profile');
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    department: '',
    phone: '',
    avatar: ''
  });

  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      browser: true,
      sms: false
    },
    dashboard: {
      refreshInterval: 30,
      defaultView: 'dashboard',
      showNotifications: true
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/profile');
      const userData = response.data.user;
      
      setProfileData({
        username: userData.username || '',
        email: userData.email || '',
        firstName: userData.profile?.firstName || '',
        lastName: userData.profile?.lastName || '',
        department: userData.profile?.department || '',
        phone: userData.profile?.phone || '',
        avatar: userData.profile?.avatar || ''
      });

      setPreferences({
        theme: userData.preferences?.theme || 'light',
        language: userData.preferences?.language || 'en',
        notifications: {
          email: userData.preferences?.notifications?.email ?? true,
          browser: userData.preferences?.notifications?.browser ?? true,
          sms: userData.preferences?.notifications?.sms ?? false
        },
        dashboard: {
          refreshInterval: userData.preferences?.dashboard?.refreshInterval || 30,
          defaultView: userData.preferences?.dashboard?.defaultView || 'dashboard',
          showNotifications: userData.preferences?.dashboard?.showNotifications ?? true
        }
      });
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const response = await api.put('/auth/profile', {
        profile: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          department: profileData.department,
          phone: profileData.phone,
          avatar: profileData.avatar
        }
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Update user context if needed
      if (setUser) {
        setUser(prevUser => ({
          ...prevUser,
          profile: response.data.user.profile
        }));
      }
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to update profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      await api.put('/auth/preferences', { preferences });
      setMessage({ type: 'success', text: 'Preferences updated successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to update preferences' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'danger', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'danger', text: 'Password must be at least 6 characters long' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowChangePassword(false);
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to change password' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    if (section === 'profile') {
      setProfileData(prev => ({ ...prev, [field]: value }));
    } else if (section === 'preferences') {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        setPreferences(prev => ({
          ...prev,
          [parent]: { ...prev[parent], [child]: value }
        }));
      } else {
        setPreferences(prev => ({ ...prev, [field]: value }));
      }
    } else if (section === 'password') {
      setPasswordData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Container className="py-4">
      <Row>
        <Col md={8} className="mx-auto">
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-user-cog me-2"></i>
                Profile & Settings
              </h4>
            </Card.Header>

            <Card.Body>
              {message.text && (
                <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
                  {message.text}
                </Alert>
              )}

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
              >
                {/* Profile Information Tab */}
                <Tab eventKey="profile" title={
                  <>
                    <i className="fas fa-user me-1"></i>
                    Profile
                  </>
                }>
                  <Form onSubmit={handleProfileUpdate}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Username</Form.Label>
                          <Form.Control
                            type="text"
                            value={profileData.username}
                            disabled
                            className="bg-light"
                          />
                          <Form.Text className="text-muted">
                            Username cannot be changed
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Email Address</Form.Label>
                          <Form.Control
                            type="email"
                            value={profileData.email}
                            disabled
                            className="bg-light"
                          />
                          <Form.Text className="text-muted">
                            Contact admin to change email
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>First Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={profileData.firstName}
                            onChange={(e) => handleInputChange('profile', 'firstName', e.target.value)}
                            placeholder="Enter first name"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Last Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={profileData.lastName}
                            onChange={(e) => handleInputChange('profile', 'lastName', e.target.value)}
                            placeholder="Enter last name"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Department</Form.Label>
                          <Form.Control
                            type="text"
                            value={profileData.department}
                            onChange={(e) => handleInputChange('profile', 'department', e.target.value)}
                            placeholder="IT Department"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Phone</Form.Label>
                          <Form.Control
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => handleInputChange('profile', 'phone', e.target.value)}
                            placeholder="+1 (555) 123-4567"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2">
                      <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Updating...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save me-1"></i>
                            Update Profile
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        variant="outline-secondary"
                        onClick={() => setShowChangePassword(true)}
                      >
                        <i className="fas fa-key me-1"></i>
                        Change Password
                      </Button>
                    </div>
                  </Form>
                </Tab>

                {/* Preferences Tab */}
                <Tab eventKey="preferences" title={
                  <>
                    <i className="fas fa-cog me-1"></i>
                    Preferences
                  </>
                }>
                  <Form onSubmit={handlePreferencesUpdate}>
                    <Row>
                      <Col md={6}>
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Appearance</h6>
                          </Card.Header>
                          <Card.Body>
                            <Form.Group className="mb-3">
                              <Form.Label>Theme</Form.Label>
                              <Form.Select
                                value={preferences.theme}
                                onChange={(e) => handleInputChange('preferences', 'theme', e.target.value)}
                              >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                              </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label>Language</Form.Label>
                              <Form.Select
                                value={preferences.language}
                                onChange={(e) => handleInputChange('preferences', 'language', e.target.value)}
                              >
                                <option value="en">English</option>
                                <option value="es">Español</option>
                                <option value="fr">Français</option>
                              </Form.Select>
                            </Form.Group>
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col md={6}>
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Notifications</h6>
                          </Card.Header>
                          <Card.Body>
                            <Form.Check
                              type="switch"
                              id="email-notifications"
                              label="Email Notifications"
                              checked={preferences.notifications.email}
                              onChange={(e) => handleInputChange('preferences', 'notifications.email', e.target.checked)}
                              className="mb-2"
                            />
                            
                            <Form.Check
                              type="switch"
                              id="browser-notifications"
                              label="Browser Notifications"
                              checked={preferences.notifications.browser}
                              onChange={(e) => handleInputChange('preferences', 'notifications.browser', e.target.checked)}
                              className="mb-2"
                            />
                            
                            <Form.Check
                              type="switch"
                              id="sms-notifications"
                              label="SMS Notifications"
                              checked={preferences.notifications.sms}
                              onChange={(e) => handleInputChange('preferences', 'notifications.sms', e.target.checked)}
                            />
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Card className="mb-3">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Dashboard Settings</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={4}>
                            <Form.Group className="mb-3">
                              <Form.Label>Refresh Interval (seconds)</Form.Label>
                              <Form.Select
                                value={preferences.dashboard.refreshInterval}
                                onChange={(e) => handleInputChange('preferences', 'dashboard.refreshInterval', parseInt(e.target.value))}
                              >
                                <option value={10}>10 seconds</option>
                                <option value={30}>30 seconds</option>
                                <option value={60}>1 minute</option>
                                <option value={300}>5 minutes</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          
                          <Col md={4}>
                            <Form.Group className="mb-3">
                              <Form.Label>Default View</Form.Label>
                              <Form.Select
                                value={preferences.dashboard.defaultView}
                                onChange={(e) => handleInputChange('preferences', 'dashboard.defaultView', e.target.value)}
                              >
                                <option value="dashboard">Dashboard</option>
                                <option value="topology">Network Topology</option>
                                <option value="devices">Device Status</option>
                                <option value="alerts">Alerts</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          
                          <Col md={4}>
                            <Form.Group className="mb-3">
                              <Form.Label>Settings</Form.Label>
                              <div>
                                <Form.Check
                                  type="switch"
                                  id="show-notifications"
                                  label="Show Notifications"
                                  checked={preferences.dashboard.showNotifications}
                                  onChange={(e) => handleInputChange('preferences', 'dashboard.showNotifications', e.target.checked)}
                                />
                              </div>
                            </Form.Group>
                          </Col>
                        </Row>
                    </Card.Body>
                    </Card>

                    <Button 
                      type="submit" 
                      variant="success" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-1"></i>
                          Save Preferences
                        </>
                      )}
                    </Button>
                  </Form>
                </Tab>

                {/* Account Info Tab */}
                <Tab eventKey="account" title={
                  <>
                    <i className="fas fa-info-circle me-1"></i>
                    Account
                  </>
                }>
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Account Information</h6>
                        </Card.Header>
                        <Card.Body>
                          <div className="mb-2">
                            <strong>Role:</strong> 
                            <Badge bg="primary" className="ms-2">{user?.role}</Badge>
                          </div>
                          <div className="mb-2">
                            <strong>Account Status:</strong> 
                            <Badge bg="success" className="ms-2">Active</Badge>
                          </div>
                          <div className="mb-2">
                            <strong>Last Login:</strong> {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                          </div>
                          <div className="mb-2">
                            <strong>Member Since:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Security</h6>
                        </Card.Header>
                        <Card.Body>
                          <div className="mb-3">
                            <strong>Two-Factor Authentication:</strong>
                            <Badge bg="warning" className="ms-2">Not Enabled</Badge>
                            <div className="mt-2">
                              <Button variant="outline-primary" size="sm">
                                Enable 2FA
                              </Button>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <strong>Session Management:</strong>
                            <div className="mt-2">
                              <Button variant="outline-danger" size="sm">
                                <i className="fas fa-sign-out-alt me-1"></i>
                                End All Sessions
                              </Button>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Change Password Modal */}
      <Modal show={showChangePassword} onHide={() => setShowChangePassword(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePasswordChange}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => handleInputChange('password', 'currentPassword', e.target.value)}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => handleInputChange('password', 'newPassword', e.target.value)}
                minLength={6}
                required
              />
              <Form.Text className="text-muted">
                Password must be at least 6 characters long
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => handleInputChange('password', 'confirmPassword', e.target.value)}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowChangePassword(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProfileSettings;