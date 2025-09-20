import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, Table, Badge } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatBytes, formatUptime } from '../../utils/common';

const SystemSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('general');

  const [generalSettings, setGeneralSettings] = useState({
    systemName: 'Network Management System',
    description: 'Enterprise Network Monitoring and Management',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    language: 'en',
    maintenanceMode: false,
    maintenanceMessage: 'System under maintenance. Please try again later.'
  });

  const [monitoringSettings, setMonitoringSettings] = useState({
    pollingInterval: 60,
    snmpTimeout: 5000,
    maxRetries: 3,
    alertThresholds: {
      cpu: 80,
      memory: 85,
      diskSpace: 90,
      responseTime: 1000
    },
    enableAutoDiscovery: true,
    discoveryInterval: 300,
    deviceTimeout: 30
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 3600,
    maxLoginAttempts: 5,
    lockoutDuration: 900,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90
    },
    twoFactorAuth: false,
    sslOnly: false,
    allowedIPs: '',
    auditLogging: true
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email: {
      enabled: true,
      smtpServer: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      useTLS: true,
      fromAddress: '',
      adminEmail: ''
    },
    sms: {
      enabled: false,
      provider: 'twilio',
      apiKey: '',
      apiSecret: '',
      fromNumber: ''
    },
    webhook: {
      enabled: false,
      url: '',
      secret: ''
    }
  });

  const [systemInfo, setSystemInfo] = useState({
    version: '2.0.0',
    uptime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    diskUsage: 0,
    activeUsers: 0,
    totalDevices: 0,
    activeAlerts: 0
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSystemSettings();
      fetchSystemInfo();
    }
  }, [user]);

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/settings');
      const settings = response.data;
      
      if (settings.general) setGeneralSettings(settings.general);
      if (settings.monitoring) setMonitoringSettings(settings.monitoring);
      if (settings.security) setSecuritySettings(settings.security);
      if (settings.notifications) setNotificationSettings(settings.notifications);
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to load system settings' 
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await api.get('/admin/system-info');
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  };

  const handleSaveSettings = async (category, settings) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      await api.put('/admin/settings', {
        category,
        settings
      });

      setMessage({ type: 'success', text: `${category} settings saved successfully!` });
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to save settings' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneralSubmit = (e) => {
    e.preventDefault();
    handleSaveSettings('general', generalSettings);
  };

  const handleMonitoringSubmit = (e) => {
    e.preventDefault();
    handleSaveSettings('monitoring', monitoringSettings);
  };

  const handleSecuritySubmit = (e) => {
    e.preventDefault();
    handleSaveSettings('security', securitySettings);
  };

  const handleNotificationSubmit = (e) => {
    e.preventDefault();
    handleSaveSettings('notifications', notificationSettings);
  };

  const handleRestart = async () => {
    if (window.confirm('Are you sure you want to restart the system? This will disconnect all users.')) {
      try {
        await api.post('/admin/restart');
        setMessage({ type: 'info', text: 'System restart initiated. Page will refresh automatically.' });
        setTimeout(() => window.location.reload(), 5000);
      } catch (error) {
        setMessage({ 
          type: 'danger', 
          text: error.response?.data?.error || 'Failed to restart system' 
        });
      }
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          You don't have permission to access this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-cogs me-2"></i>
                System Settings
              </h4>
            </Card.Header>

            <Card.Body>
              {message.text && (
                <Alert 
                  variant={message.type} 
                  dismissible 
                  onClose={() => setMessage({ type: '', text: '' })}
                >
                  {message.text}
                </Alert>
              )}

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
              >
                {/* System Information Tab */}
                <Tab eventKey="info" title={
                  <>
                    <i className="fas fa-info-circle me-1"></i>
                    System Info
                  </>
                }>
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">System Status</h6>
                        </Card.Header>
                        <Card.Body>
                          <Table borderless size="sm">
                            <tbody>
                              <tr>
                                <td><strong>Version:</strong></td>
                                <td><Badge bg="info">{systemInfo.version}</Badge></td>
                              </tr>
                              <tr>
                                <td><strong>Uptime:</strong></td>
                                <td>{formatUptime(systemInfo.uptime)}</td>
                              </tr>
                              <tr>
                                <td><strong>Active Users:</strong></td>
                                <td><Badge bg="success">{systemInfo.activeUsers}</Badge></td>
                              </tr>
                              <tr>
                                <td><strong>Total Devices:</strong></td>
                                <td><Badge bg="primary">{systemInfo.totalDevices}</Badge></td>
                              </tr>
                              <tr>
                                <td><strong>Active Alerts:</strong></td>
                                <td><Badge bg="danger">{systemInfo.activeAlerts}</Badge></td>
                              </tr>
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Resource Usage</h6>
                        </Card.Header>
                        <Card.Body>
                          <div className="mb-3">
                            <div className="d-flex justify-content-between">
                              <span>CPU Usage</span>
                              <span>{systemInfo.cpuUsage}%</span>
                            </div>
                            <div className="progress">
                              <div 
                                className="progress-bar" 
                                style={{ width: `${systemInfo.cpuUsage}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="d-flex justify-content-between">
                              <span>Memory Usage</span>
                              <span>{systemInfo.memoryUsage}%</span>
                            </div>
                            <div className="progress">
                              <div 
                                className="progress-bar bg-warning" 
                                style={{ width: `${systemInfo.memoryUsage}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="d-flex justify-content-between">
                              <span>Disk Usage</span>
                              <span>{systemInfo.diskUsage}%</span>
                            </div>
                            <div className="progress">
                              <div 
                                className="progress-bar bg-danger" 
                                style={{ width: `${systemInfo.diskUsage}%` }}
                              ></div>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>

                      <Card>
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">System Actions</h6>
                        </Card.Header>
                        <Card.Body>
                          <div className="d-grid gap-2">
                            <Button variant="warning" onClick={handleRestart}>
                              <i className="fas fa-redo me-1"></i>
                              Restart System
                            </Button>
                            <Button variant="info" onClick={fetchSystemInfo}>
                              <i className="fas fa-sync me-1"></i>
                              Refresh Status
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                {/* General Settings Tab */}
                <Tab eventKey="general" title={
                  <>
                    <i className="fas fa-sliders-h me-1"></i>
                    General
                  </>
                }>
                  <Form onSubmit={handleGeneralSubmit}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>System Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={generalSettings.systemName}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, systemName: e.target.value }))}
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Description</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={generalSettings.description}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Timezone</Form.Label>
                          <Form.Select
                            value={generalSettings.timezone}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                          >
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">Eastern Time</option>
                            <option value="America/Chicago">Central Time</option>
                            <option value="America/Denver">Mountain Time</option>
                            <option value="America/Los_Angeles">Pacific Time</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Date Format</Form.Label>
                          <Form.Select
                            value={generalSettings.dateFormat}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                          >
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Time Format</Form.Label>
                          <Form.Select
                            value={generalSettings.timeFormat}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, timeFormat: e.target.value }))}
                          >
                            <option value="24h">24 Hour</option>
                            <option value="12h">12 Hour</option>
                          </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Default Language</Form.Label>
                          <Form.Select
                            value={generalSettings.language}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, language: e.target.value }))}
                          >
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        id="maintenance-mode"
                        label="Maintenance Mode"
                        checked={generalSettings.maintenanceMode}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                      />
                      <Form.Text className="text-muted">
                        When enabled, only administrators can access the system
                      </Form.Text>
                    </Form.Group>

                    {generalSettings.maintenanceMode && (
                      <Form.Group className="mb-3">
                        <Form.Label>Maintenance Message</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={generalSettings.maintenanceMessage}
                          onChange={(e) => setGeneralSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                          placeholder="Message to display to users during maintenance"
                        />
                      </Form.Group>
                    )}

                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Save General Settings'}
                    </Button>
                  </Form>
                </Tab>

                {/* Monitoring Settings Tab */}
                <Tab eventKey="monitoring" title={
                  <>
                    <i className="fas fa-chart-line me-1"></i>
                    Monitoring
                  </>
                }>
                  <Form onSubmit={handleMonitoringSubmit}>
                    <Row>
                      <Col md={6}>
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Polling Settings</h6>
                          </Card.Header>
                          <Card.Body>
                            <Form.Group className="mb-3">
                              <Form.Label>Polling Interval (seconds)</Form.Label>
                              <Form.Control
                                type="number"
                                value={monitoringSettings.pollingInterval}
                                onChange={(e) => setMonitoringSettings(prev => ({ ...prev, pollingInterval: parseInt(e.target.value) }))}
                                min="10"
                                max="3600"
                              />
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label>SNMP Timeout (ms)</Form.Label>
                              <Form.Control
                                type="number"
                                value={monitoringSettings.snmpTimeout}
                                onChange={(e) => setMonitoringSettings(prev => ({ ...prev, snmpTimeout: parseInt(e.target.value) }))}
                                min="1000"
                                max="30000"
                              />
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label>Max Retries</Form.Label>
                              <Form.Control
                                type="number"
                                value={monitoringSettings.maxRetries}
                                onChange={(e) => setMonitoringSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                                min="1"
                                max="10"
                              />
                            </Form.Group>
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col md={6}>
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Alert Thresholds (%)</h6>
                          </Card.Header>
                          <Card.Body>
                            <Form.Group className="mb-3">
                              <Form.Label>CPU Usage</Form.Label>
                              <Form.Control
                                type="number"
                                value={monitoringSettings.alertThresholds.cpu}
                                onChange={(e) => setMonitoringSettings(prev => ({ 
                                  ...prev, 
                                  alertThresholds: { ...prev.alertThresholds, cpu: parseInt(e.target.value) }
                                }))}
                                min="1"
                                max="100"
                              />
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label>Memory Usage</Form.Label>
                              <Form.Control
                                type="number"
                                value={monitoringSettings.alertThresholds.memory}
                                onChange={(e) => setMonitoringSettings(prev => ({ 
                                  ...prev, 
                                  alertThresholds: { ...prev.alertThresholds, memory: parseInt(e.target.value) }
                                }))}
                                min="1"
                                max="100"
                              />
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label>Disk Space</Form.Label>
                              <Form.Control
                                type="number"
                                value={monitoringSettings.alertThresholds.diskSpace}
                                onChange={(e) => setMonitoringSettings(prev => ({ 
                                  ...prev, 
                                  alertThresholds: { ...prev.alertThresholds, diskSpace: parseInt(e.target.value) }
                                }))}
                                min="1"
                                max="100"
                              />
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label>Response Time (ms)</Form.Label>
                              <Form.Control
                                type="number"
                                value={monitoringSettings.alertThresholds.responseTime}
                                onChange={(e) => setMonitoringSettings(prev => ({ 
                                  ...prev, 
                                  alertThresholds: { ...prev.alertThresholds, responseTime: parseInt(e.target.value) }
                                }))}
                                min="100"
                                max="10000"
                              />
                            </Form.Group>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Card className="mb-3">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Auto Discovery</h6>
                      </Card.Header>
                      <Card.Body>
                        <Form.Check
                          type="switch"
                          id="auto-discovery"
                          label="Enable Auto Discovery"
                          checked={monitoringSettings.enableAutoDiscovery}
                          onChange={(e) => setMonitoringSettings(prev => ({ ...prev, enableAutoDiscovery: e.target.checked }))}
                          className="mb-3"
                        />

                        {monitoringSettings.enableAutoDiscovery && (
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Discovery Interval (seconds)</Form.Label>
                                <Form.Control
                                  type="number"
                                  value={monitoringSettings.discoveryInterval}
                                  onChange={(e) => setMonitoringSettings(prev => ({ ...prev, discoveryInterval: parseInt(e.target.value) }))}
                                  min="60"
                                  max="86400"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Device Timeout (seconds)</Form.Label>
                                <Form.Control
                                  type="number"
                                  value={monitoringSettings.deviceTimeout}
                                  onChange={(e) => setMonitoringSettings(prev => ({ ...prev, deviceTimeout: parseInt(e.target.value) }))}
                                  min="5"
                                  max="300"
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                        )}
                      </Card.Body>
                    </Card>

                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Monitoring Settings'}
                    </Button>
                  </Form>
                </Tab>

                {/* Security Settings Tab */}
                <Tab eventKey="security" title={
                  <>
                    <i className="fas fa-shield-alt me-1"></i>
                    Security
                  </>
                }>
                  <Form onSubmit={handleSecuritySubmit}>
                    <Row>
                      <Col md={6}>
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Session Management</h6>
                          </Card.Header>
                          <Card.Body>
                            <Form.Group className="mb-3">
                              <Form.Label>Session Timeout (seconds)</Form.Label>
                              <Form.Control
                                type="number"
                                value={securitySettings.sessionTimeout}
                                onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                                min="300"
                                max="86400"
                              />
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label>Max Login Attempts</Form.Label>
                              <Form.Control
                                type="number"
                                value={securitySettings.maxLoginAttempts}
                                onChange={(e) => setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))}
                                min="3"
                                max="10"
                              />
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label>Lockout Duration (seconds)</Form.Label>
                              <Form.Control
                                type="number"
                                value={securitySettings.lockoutDuration}
                                onChange={(e) => setSecuritySettings(prev => ({ ...prev, lockoutDuration: parseInt(e.target.value) }))}
                                min="60"
                                max="3600"
                              />
                            </Form.Group>
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col md={6}>
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Password Policy</h6>
                          </Card.Header>
                          <Card.Body>
                            <Form.Group className="mb-3">
                              <Form.Label>Minimum Length</Form.Label>
                              <Form.Control
                                type="number"
                                value={securitySettings.passwordPolicy.minLength}
                                onChange={(e) => setSecuritySettings(prev => ({ 
                                  ...prev, 
                                  passwordPolicy: { ...prev.passwordPolicy, minLength: parseInt(e.target.value) }
                                }))}
                                min="6"
                                max="20"
                              />
                            </Form.Group>

                            <Form.Check
                              type="switch"
                              id="require-uppercase"
                              label="Require Uppercase"
                              checked={securitySettings.passwordPolicy.requireUppercase}
                              onChange={(e) => setSecuritySettings(prev => ({ 
                                ...prev, 
                                passwordPolicy: { ...prev.passwordPolicy, requireUppercase: e.target.checked }
                              }))}
                              className="mb-2"
                            />

                            <Form.Check
                              type="switch"
                              id="require-lowercase"
                              label="Require Lowercase"
                              checked={securitySettings.passwordPolicy.requireLowercase}
                              onChange={(e) => setSecuritySettings(prev => ({ 
                                ...prev, 
                                passwordPolicy: { ...prev.passwordPolicy, requireLowercase: e.target.checked }
                              }))}
                              className="mb-2"
                            />

                            <Form.Check
                              type="switch"
                              id="require-numbers"
                              label="Require Numbers"
                              checked={securitySettings.passwordPolicy.requireNumbers}
                              onChange={(e) => setSecuritySettings(prev => ({ 
                                ...prev, 
                                passwordPolicy: { ...prev.passwordPolicy, requireNumbers: e.target.checked }
                              }))}
                              className="mb-2"
                            />

                            <Form.Check
                              type="switch"
                              id="require-special"
                              label="Require Special Characters"
                              checked={securitySettings.passwordPolicy.requireSpecialChars}
                              onChange={(e) => setSecuritySettings(prev => ({ 
                                ...prev, 
                                passwordPolicy: { ...prev.passwordPolicy, requireSpecialChars: e.target.checked }
                              }))}
                              className="mb-3"
                            />

                            <Form.Group className="mb-3">
                              <Form.Label>Password Expiry (days)</Form.Label>
                              <Form.Control
                                type="number"
                                value={securitySettings.passwordPolicy.expiryDays}
                                onChange={(e) => setSecuritySettings(prev => ({ 
                                  ...prev, 
                                  passwordPolicy: { ...prev.passwordPolicy, expiryDays: parseInt(e.target.value) }
                                }))}
                                min="0"
                                max="365"
                              />
                              <Form.Text className="text-muted">
                                Set to 0 to disable password expiry
                              </Form.Text>
                            </Form.Group>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Card className="mb-3">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Additional Security</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Check
                              type="switch"
                              id="two-factor-auth"
                              label="Two-Factor Authentication"
                              checked={securitySettings.twoFactorAuth}
                              onChange={(e) => setSecuritySettings(prev => ({ ...prev, twoFactorAuth: e.target.checked }))}
                              className="mb-3"
                            />

                            <Form.Check
                              type="switch"
                              id="ssl-only"
                              label="SSL/HTTPS Only"
                              checked={securitySettings.sslOnly}
                              onChange={(e) => setSecuritySettings(prev => ({ ...prev, sslOnly: e.target.checked }))}
                              className="mb-3"
                            />

                            <Form.Check
                              type="switch"
                              id="audit-logging"
                              label="Audit Logging"
                              checked={securitySettings.auditLogging}
                              onChange={(e) => setSecuritySettings(prev => ({ ...prev, auditLogging: e.target.checked }))}
                              className="mb-3"
                            />
                          </Col>
                          
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Allowed IP Addresses</Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={3}
                                value={securitySettings.allowedIPs}
                                onChange={(e) => setSecuritySettings(prev => ({ ...prev, allowedIPs: e.target.value }))}
                                placeholder="192.168.1.0/24&#10;10.0.0.0/8&#10;Leave empty to allow all IPs"
                              />
                              <Form.Text className="text-muted">
                                One IP/CIDR per line. Leave empty to allow all IPs.
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>

                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Security Settings'}
                    </Button>
                  </Form>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SystemSettings;