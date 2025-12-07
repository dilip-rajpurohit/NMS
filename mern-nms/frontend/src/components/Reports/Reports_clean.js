import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, Table, Badge, Modal, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatBytes, formatPercentage, getSeverityBadge, LoadingSpinner } from '../../utils/common';

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('dashboard');

  const [dashboardData, setDashboardData] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    totalAlerts: 0,
    criticalAlerts: 0,
    networkHealth: 95,
    averageUptime: 99.5,
    totalTraffic: 0,
    peakTraffic: 0
  });

  const [performanceData, setPerformanceData] = useState([]);
  const [securityData, setSecurityData] = useState([]);
  const [uptimeData, setUptimeData] = useState([]);
  const [trafficData, setTrafficData] = useState([]);
  const [alertsData, setAlertsData] = useState([]);
  const [auditData, setAuditData] = useState([]);

  const [reportFilters, setReportFilters] = useState({
    dateRange: '7days',
    startDate: '',
    endDate: '',
    deviceType: 'all',
    severity: 'all',
    category: 'all'
  });

  const [scheduledReports, setScheduledReports] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    description: '',
    type: 'performance',
    frequency: 'daily',
    time: '09:00',
    recipients: '',
    format: 'pdf',
    enabled: true
  });

  // Define all callback functions first to avoid lexical declaration issues
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to load dashboard data'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReportData = useCallback(async (reportType) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        dateRange: reportFilters.dateRange,
        deviceType: reportFilters.deviceType,
        severity: reportFilters.severity,
        category: reportFilters.category
      });

      if (reportFilters.startDate) params.append('startDate', reportFilters.startDate);
      if (reportFilters.endDate) params.append('endDate', reportFilters.endDate);

      const response = await api.get(`/reports/${reportType}?${params}`);
      
      switch (reportType) {
        case 'performance':
          setPerformanceData(response.data?.performanceData || []);
          break;
        case 'security':
          setSecurityData(response.data?.securityData || []);
          break;
        case 'uptime':
          setUptimeData(response.data?.uptimeData || []);
          break;
        case 'traffic':
          setTrafficData(response.data?.trafficData || []);
          break;
        case 'alerts':
          setAlertsData(response.data?.alertsData || []);
          break;
        case 'audit':
          setAuditData(response.data?.auditData || []);
          break;
        default:
          break;
      }
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || `Failed to load ${reportType} data`
      });
    } finally {
      setLoading(false);
    }
  }, [reportFilters]);

  const fetchScheduledReports = useCallback(async () => {
    try {
      const response = await api.get('/reports/scheduled');
      setScheduledReports(response.data?.scheduledReports || []);
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
      setMessage({
        type: 'danger',
        text: 'Failed to load scheduled reports'
      });
    }
  }, []);

  // Effects that use the callback functions
  useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchDashboardData();
        await fetchScheduledReports();
      } catch (error) {
        console.error('Failed to initialize Reports component:', error);
        setMessage({
          type: 'danger',
          text: 'Failed to initialize reports. Please try refreshing the page.'
        });
      }
    };
    
    initializeData();
  }, [fetchDashboardData, fetchScheduledReports]);

  useEffect(() => {
    if (activeTab !== 'dashboard') {
      try {
        fetchReportData(activeTab);
      } catch (error) {
        console.error('Failed to fetch report data for tab:', activeTab, error);
        setMessage({
          type: 'danger',
          text: `Failed to load ${activeTab} data`
        });
      }
    }
  }, [activeTab, fetchReportData]);

  // Other handler functions
  const handleExportReport = async (reportType, format = 'csv') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(reportFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      params.append('format', format);

      const response = await api.get(`/reports/${reportType}/export?${params}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Report exported successfully!' });
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to export report'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleReport = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/reports/schedule', scheduleForm);
      setMessage({ type: 'success', text: 'Report scheduled successfully!' });
      setShowScheduleModal(false);
      fetchScheduledReports();
      setScheduleForm({
        name: '',
        description: '',
        type: 'performance',
        frequency: 'daily',
        time: '09:00',
        recipients: '',
        format: 'pdf',
        enabled: true
      });
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to schedule report'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScheduledReport = async (id) => {
    if (window.confirm('Are you sure you want to delete this scheduled report?')) {
      try {
        await api.delete(`/reports/scheduled/${id}`);
        setMessage({ type: 'success', text: 'Scheduled report deleted successfully!' });
        fetchScheduledReports();
      } catch (error) {
        setMessage({
          type: 'danger',
          text: error.response?.data?.error || 'Failed to delete scheduled report'
        });
      }
    }
  };

  // Authentication and loading checks
  if (!user) {
    return (
      <Container fluid className="p-4">
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Authentication required. Please log in to view reports.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container fluid className="p-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading reports...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="mb-1">
                  <i className="fas fa-chart-line me-2 text-primary"></i>
                  Reports & Analytics
                </h2>
                <div>
                  <Button 
                    variant="light" 
                    size="sm" 
                    className="me-2"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    <i className="fas fa-clock me-1"></i>
                    Schedule Report
                  </Button>
                  <Button 
                    variant="light" 
                    size="sm"
                    onClick={() => fetchDashboardData()}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-1"></i>
                    Refresh
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {message.text && (
                <Alert 
                  variant={message.type} 
                  dismissible 
                  onClose={() => setMessage({ type: '', text: '' })}
                  className="mb-3"
                >
                  {message.text}
                </Alert>
              )}

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                <Tab eventKey="dashboard" title="Dashboard Overview">
                  <Row>
                    <Col md={3}>
                      <Card className="text-center mb-3">
                        <Card.Body>
                          <h4 className="text-primary">{dashboardData.totalDevices}</h4>
                          <small className="text-muted">Total Devices</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-center mb-3">
                        <Card.Body>
                          <h4 className="text-success">{dashboardData.onlineDevices}</h4>
                          <small className="text-muted">Online Devices</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-center mb-3">
                        <Card.Body>
                          <h4 className="text-warning">{dashboardData.totalAlerts}</h4>
                          <small className="text-muted">Total Alerts</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-center mb-3">
                        <Card.Body>
                          <h4 className="text-danger">{dashboardData.criticalAlerts}</h4>
                          <small className="text-muted">Critical Alerts</small>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header>Network Health</Card.Header>
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-center">
                            <span>Overall Health</span>
                            <Badge bg={dashboardData.networkHealth > 80 ? 'success' : dashboardData.networkHealth > 60 ? 'warning' : 'danger'}>
                              {dashboardData.networkHealth}%
                            </Badge>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header>Average Uptime</Card.Header>
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-center">
                            <span>Uptime</span>
                            <Badge bg="info">
                              {dashboardData.averageUptime}%
                            </Badge>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                <Tab eventKey="performance" title="Performance">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Performance Reports</h5>
                    <Button 
                      size="sm" 
                      variant="outline-primary"
                      onClick={() => handleExportReport('performance')}
                    >
                      <i className="fas fa-download me-1"></i>
                      Export
                    </Button>
                  </div>
                  
                  {performanceData.length > 0 ? (
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Device</th>
                          <th>CPU Usage</th>
                          <th>Memory Usage</th>
                          <th>Network Usage</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceData.map((device, index) => (
                          <tr key={index}>
                            <td>{device.name}</td>
                            <td>{formatPercentage(device.cpuUsage)}</td>
                            <td>{formatPercentage(device.memoryUsage)}</td>
                            <td>{formatBytes(device.networkUsage)}</td>
                            <td>
                              <Badge bg={device.status === 'online' ? 'success' : 'danger'}>
                                {device.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Alert variant="info">
                      No performance data available. Data will appear here once devices are monitored.
                    </Alert>
                  )}
                </Tab>

                <Tab eventKey="alerts" title="Alerts">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Alert Reports</h5>
                    <Button 
                      size="sm" 
                      variant="outline-primary"
                      onClick={() => handleExportReport('alerts')}
                    >
                      <i className="fas fa-download me-1"></i>
                      Export
                    </Button>
                  </div>
                  
                  {alertsData.length > 0 ? (
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Device</th>
                          <th>Type</th>
                          <th>Severity</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alertsData.map((alert, index) => (
                          <tr key={index}>
                            <td>{new Date(alert.timestamp).toLocaleString()}</td>
                            <td>{alert.deviceName}</td>
                            <td>{alert.type}</td>
                            <td>
                              {getSeverityBadge(alert.severity)}
                            </td>
                            <td>{alert.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Alert variant="info">
                      No alert data available. Alerts will appear here as they are generated.
                    </Alert>
                  )}
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Schedule Report Modal */}
      <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Schedule Report</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleScheduleReport}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Report Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={scheduleForm.name}
                    onChange={(e) => setScheduleForm({...scheduleForm, name: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Report Type</Form.Label>
                  <Form.Select
                    value={scheduleForm.type}
                    onChange={(e) => setScheduleForm({...scheduleForm, type: e.target.value})}
                  >
                    <option value="performance">Performance</option>
                    <option value="security">Security</option>
                    <option value="uptime">Uptime</option>
                    <option value="alerts">Alerts</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Frequency</Form.Label>
                  <Form.Select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({...scheduleForm, frequency: e.target.value})}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Recipients (comma-separated emails)</Form.Label>
              <Form.Control
                type="text"
                value={scheduleForm.recipients}
                onChange={(e) => setScheduleForm({...scheduleForm, recipients: e.target.value})}
                placeholder="email1@example.com, email2@example.com"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm({...scheduleForm, description: e.target.value})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule Report'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Reports;