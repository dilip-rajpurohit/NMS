import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, Table, Badge, Modal, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const SystemSettings = () => {
  const { user } = useAuth();
  const { connected } = useSocket();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('general');
  const [showRestartModal, setShowRestartModal] = useState(false);

  const [generalSettings, setGeneralSettings] = useState({
    systemName: 'Network Management System',
    description: 'Enterprise Network Monitoring and Management',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    language: 'en',
    maintenanceMode: false,
    maintenanceMessage: 'System under maintenance. Please try again later.',
    autoBackup: true,
    backupInterval: 24
  });

  const [monitoringSettings, setMonitoringSettings] = useState({
    pollingInterval: 60,
    snmpTimeout: 5000,
    maxRetries: 3,
    alertThresholds: {
      cpu: 80,
      memory: 85,
      diskSpace: 90,
      responseTime: 1000,
      packetLoss: 5
    },
    enableAutoDiscovery: true,
    discoveryInterval: 300,
    deviceTimeout: 30,
    enableSNMP: true,
    snmpVersion: '2c',
    defaultCommunity: 'public'
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
    enableTwoFactor: false,
    enableSyslog: true,
    syslogServer: '',
    enableAuditLog: true
  });

  const [networkSettings, setNetworkSettings] = useState({
    defaultSubnet: '192.168.1.0/24',
    dnsServers: ['8.8.8.8', '8.8.4.4'],
    ntpServers: ['pool.ntp.org'],
    enableIPv6: false,
    maxConcurrentScans: 50,
    scanRateLimit: 100,
    interfaceMonitoring: true,
    bandwidthMonitoring: true
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpServer: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpSecurity: 'TLS',
    fromEmail: 'nms@company.com',
    fromName: 'Network Management System',
    enableEmailAlerts: true,
    testEmailSent: false
  });

  const [systemInfo, setSystemInfo] = useState({
    version: '1.0.0',
    uptime: '0d 0h 0m',
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    activeConnections: 0,
    totalDevices: 0,
    lastBackup: null
  });

  // Load settings on component mount
  useEffect(() => {
    loadAllSettings();
    loadSystemInfo();
    
    // Refresh system info every 30 seconds
    const interval = setInterval(loadSystemInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Load all settings in parallel
      const [generalRes, monitoringRes, securityRes, networkRes, emailRes] = await Promise.all([
        api.get('/admin/settings/general', { headers }).catch(() => ({ data: generalSettings })),
        api.get('/admin/settings/monitoring', { headers }).catch(() => ({ data: monitoringSettings })),
        api.get('/admin/settings/security', { headers }).catch(() => ({ data: securitySettings })),
        api.get('/admin/settings/network', { headers }).catch(() => ({ data: networkSettings })),
        api.get('/admin/settings/email', { headers }).catch(() => ({ data: emailSettings }))
      ]);

      setGeneralSettings({ ...generalSettings, ...generalRes.data });
      setMonitoringSettings({ ...monitoringSettings, ...monitoringRes.data });
      setSecuritySettings({ ...securitySettings, ...securityRes.data });
      setNetworkSettings({ ...networkSettings, ...networkRes.data });
      setEmailSettings({ ...emailSettings, ...emailRes.data });
      
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'danger', text: 'Failed to load system settings' });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const response = await api.get('/admin/system/info', { headers });
      setSystemInfo(response.data || systemInfo);
    } catch (error) {
      console.error('Error loading system info:', error);
    }
  };

  const saveSettings = async (settingsType, settings) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      await api.put(`/admin/settings/${settingsType}`, settings, { headers });
      
      setMessage({ 
        type: 'success', 
        text: `${settingsType.charAt(0).toUpperCase() + settingsType.slice(1)} settings saved successfully` 
      });
      
      // Auto-clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.message || 'Failed to save settings' 
      });
    } finally {
      setLoading(false);
    }
  };

  const testEmailSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      await api.post('/admin/settings/email/test', emailSettings, { headers });
      
      setEmailSettings(prev => ({ ...prev, testEmailSent: true }));
      setMessage({ type: 'success', text: 'Test email sent successfully' });
      
      setTimeout(() => {
        setEmailSettings(prev => ({ ...prev, testEmailSent: false }));
        setMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({ type: 'danger', text: 'Failed to send test email' });
    } finally {
      setLoading(false);
    }
  };

  const restartSystem = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      await api.post('/admin/system/restart', {}, { headers });
      setMessage({ type: 'info', text: 'System restart initiated. Please wait...' });
      setShowRestartModal(false);
      
    } catch (error) {
      console.error('Error restarting system:', error);
      setMessage({ type: 'danger', text: 'Failed to restart system' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && activeTab === 'general' && !generalSettings.systemName) {
    return (
      <Container fluid className="p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-white mb-1">
                <i className="fas fa-cogs me-2 text-warning"></i>
                System Settings
              </h2>
              <p className="text-muted mb-0">Configure system parameters and preferences</p>
            </div>
            <div className="d-flex align-items-center">
              <Badge bg={connected ? 'success' : 'danger'} className="me-3">
                <i className="fas fa-circle me-1"></i>
                {connected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Button 
                variant="outline-danger" 
                size="sm" 
                onClick={() => setShowRestartModal(true)}
                disabled={loading}
              >
                <i className="fas fa-redo me-1"></i>
                Restart System
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {message.text && (
        <Row className="mb-4">
          <Col>
            <Alert variant={message.type} className={`bg-${message.type} bg-opacity-20 border-${message.type} text-white`}>
              <i className={`fas fa-${message.type === 'success' ? 'check-circle' : message.type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2`}></i>
              {message.text}
            </Alert>
          </Col>
        </Row>
      )}

      {/* System Status Overview */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Header className="bg-dark border-secondary">
              <h5 className="mb-0 text-white">
                <i className="fas fa-server me-2 text-primary"></i>
                System Status
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} className="mb-3">
                  <div className="text-center">
                    <div className="text-info h4">{systemInfo.version}</div>
                    <small className="text-muted">Version</small>
                  </div>
                </Col>
                <Col md={3} className="mb-3">
                  <div className="text-center">
                    <div className="text-success h4">{systemInfo.uptime}</div>
                    <small className="text-muted">Uptime</small>
                  </div>
                </Col>
                <Col md={3} className="mb-3">
                  <div className="text-center">
                    <div className="text-warning h4">{systemInfo.totalDevices}</div>
                    <small className="text-muted">Monitored Devices</small>
                  </div>
                </Col>
                <Col md={3} className="mb-3">
                  <div className="text-center">
                    <div className="text-primary h4">{systemInfo.activeConnections}</div>
                    <small className="text-muted">Active Connections</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Settings Tabs */}
      <Row>
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Body>
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4 nav-pills-dark"
              >
                {/* General Settings Tab */}
                <Tab eventKey="general" title={<><i className="fas fa-cog me-2"></i>General</>}>
                  <Form>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">System Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={generalSettings.systemName}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, systemName: e.target.value }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">Timezone</Form.Label>
                          <Form.Select
                            value={generalSettings.timezone}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                            className="bg-dark text-white border-secondary"
                          >
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">Eastern Time</option>
                            <option value="America/Chicago">Central Time</option>
                            <option value="America/Denver">Mountain Time</option>
                            <option value="America/Los_Angeles">Pacific Time</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label className="text-white">Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={generalSettings.description}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-dark text-white border-secondary"
                      />
                    </Form.Group>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="switch"
                            id="maintenance-mode"
                            label="Maintenance Mode"
                            checked={generalSettings.maintenanceMode}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                            className="text-white"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="switch"
                            id="auto-backup"
                            label="Enable Auto Backup"
                            checked={generalSettings.autoBackup}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, autoBackup: e.target.checked }))}
                            className="text-white"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Button 
                      variant="primary" 
                      onClick={() => saveSettings('general', generalSettings)}
                      disabled={loading}
                    >
                      <i className="fas fa-save me-2"></i>
                      Save General Settings
                    </Button>
                  </Form>
                </Tab>

                {/* Monitoring Settings Tab */}
                <Tab eventKey="monitoring" title={<><i className="fas fa-chart-line me-2"></i>Monitoring</>}>
                  <Form>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">Polling Interval (seconds)</Form.Label>
                          <Form.Control
                            type="number"
                            value={monitoringSettings.pollingInterval}
                            onChange={(e) => setMonitoringSettings(prev => ({ ...prev, pollingInterval: parseInt(e.target.value) }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">SNMP Timeout (ms)</Form.Label>
                          <Form.Control
                            type="number"
                            value={monitoringSettings.snmpTimeout}
                            onChange={(e) => setMonitoringSettings(prev => ({ ...prev, snmpTimeout: parseInt(e.target.value) }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <h6 className="text-white mt-4 mb-3">Alert Thresholds</h6>
                    <Row>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">CPU Usage (%)</Form.Label>
                          <Form.Control
                            type="number"
                            value={monitoringSettings.alertThresholds.cpu}
                            onChange={(e) => setMonitoringSettings(prev => ({ 
                              ...prev, 
                              alertThresholds: { ...prev.alertThresholds, cpu: parseInt(e.target.value) }
                            }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">Memory Usage (%)</Form.Label>
                          <Form.Control
                            type="number"
                            value={monitoringSettings.alertThresholds.memory}
                            onChange={(e) => setMonitoringSettings(prev => ({ 
                              ...prev, 
                              alertThresholds: { ...prev.alertThresholds, memory: parseInt(e.target.value) }
                            }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">Disk Usage (%)</Form.Label>
                          <Form.Control
                            type="number"
                            value={monitoringSettings.alertThresholds.diskSpace}
                            onChange={(e) => setMonitoringSettings(prev => ({ 
                              ...prev, 
                              alertThresholds: { ...prev.alertThresholds, diskSpace: parseInt(e.target.value) }
                            }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">Response Time (ms)</Form.Label>
                          <Form.Control
                            type="number"
                            value={monitoringSettings.alertThresholds.responseTime}
                            onChange={(e) => setMonitoringSettings(prev => ({ 
                              ...prev, 
                              alertThresholds: { ...prev.alertThresholds, responseTime: parseInt(e.target.value) }
                            }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        id="auto-discovery"
                        label="Enable Auto Discovery"
                        checked={monitoringSettings.enableAutoDiscovery}
                        onChange={(e) => setMonitoringSettings(prev => ({ ...prev, enableAutoDiscovery: e.target.checked }))}
                        className="text-white"
                      />
                    </Form.Group>

                    <Button 
                      variant="primary" 
                      onClick={() => saveSettings('monitoring', monitoringSettings)}
                      disabled={loading}
                    >
                      <i className="fas fa-save me-2"></i>
                      Save Monitoring Settings
                    </Button>
                  </Form>
                </Tab>

                {/* Security Settings Tab */}
                <Tab eventKey="security" title={<><i className="fas fa-shield-alt me-2"></i>Security</>}>
                  <Form>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">Session Timeout (seconds)</Form.Label>
                          <Form.Control
                            type="number"
                            value={securitySettings.sessionTimeout}
                            onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">Max Login Attempts</Form.Label>
                          <Form.Control
                            type="number"
                            value={securitySettings.maxLoginAttempts}
                            onChange={(e) => setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <h6 className="text-white mt-4 mb-3">Password Policy</h6>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="switch"
                            id="require-uppercase"
                            label="Require Uppercase Letters"
                            checked={securitySettings.passwordPolicy.requireUppercase}
                            onChange={(e) => setSecuritySettings(prev => ({ 
                              ...prev, 
                              passwordPolicy: { ...prev.passwordPolicy, requireUppercase: e.target.checked }
                            }))}
                            className="text-white"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="switch"
                            id="require-numbers"
                            label="Require Numbers"
                            checked={securitySettings.passwordPolicy.requireNumbers}
                            onChange={(e) => setSecuritySettings(prev => ({ 
                              ...prev, 
                              passwordPolicy: { ...prev.passwordPolicy, requireNumbers: e.target.checked }
                            }))}
                            className="text-white"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Button 
                      variant="primary" 
                      onClick={() => saveSettings('security', securitySettings)}
                      disabled={loading}
                    >
                      <i className="fas fa-save me-2"></i>
                      Save Security Settings
                    </Button>
                  </Form>
                </Tab>

                {/* Email Settings Tab */}
                <Tab eventKey="email" title={<><i className="fas fa-envelope me-2"></i>Email</>}>
                  <Form>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">SMTP Server</Form.Label>
                          <Form.Control
                            type="text"
                            value={emailSettings.smtpServer}
                            onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpServer: e.target.value }))}
                            className="bg-dark text-white border-secondary"
                            placeholder="smtp.gmail.com"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">SMTP Port</Form.Label>
                          <Form.Control
                            type="number"
                            value={emailSettings.smtpPort}
                            onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">Username</Form.Label>
                          <Form.Control
                            type="text"
                            value={emailSettings.smtpUsername}
                            onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpUsername: e.target.value }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-white">Password</Form.Label>
                          <Form.Control
                            type="password"
                            value={emailSettings.smtpPassword}
                            onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                            className="bg-dark text-white border-secondary"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2">
                      <Button 
                        variant="primary" 
                        onClick={() => saveSettings('email', emailSettings)}
                        disabled={loading}
                      >
                        <i className="fas fa-save me-2"></i>
                        Save Email Settings
                      </Button>
                      <Button 
                        variant="outline-info" 
                        onClick={testEmailSettings}
                        disabled={loading || !emailSettings.smtpServer}
                      >
                        <i className="fas fa-paper-plane me-2"></i>
                        Send Test Email
                      </Button>
                    </div>
                  </Form>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Restart Confirmation Modal */}
      <Modal show={showRestartModal} onHide={() => setShowRestartModal(false)} centered>
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title className="text-white">Confirm System Restart</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <p>Are you sure you want to restart the system? This will temporarily interrupt monitoring services.</p>
          <p className="text-warning">
            <i className="fas fa-exclamation-triangle me-2"></i>
            All active connections will be terminated.
          </p>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowRestartModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={restartSystem} disabled={loading}>
            <i className="fas fa-redo me-2"></i>
            Restart System
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SystemSettings;