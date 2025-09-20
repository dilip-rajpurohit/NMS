import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchDashboardData();
    fetchScheduledReports();
  }, []);

  useEffect(() => {
    if (activeTab !== 'dashboard') {
      fetchReportData(activeTab);
    }
  }, [activeTab, reportFilters]);

  const fetchDashboardData = async () => {
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
  };

  const fetchReportData = async (reportType) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(reportFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await api.get(`/reports/${reportType}?${params}`);
      
      switch (reportType) {
        case 'performance':
          setPerformanceData(response.data);
          break;
        case 'security':
          setSecurityData(response.data);
          break;
        case 'uptime':
          setUptimeData(response.data);
          break;
        case 'traffic':
          setTrafficData(response.data);
          break;
        case 'alerts':
          setAlertsData(response.data);
          break;
        case 'audit':
          setAuditData(response.data);
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
  };

  const fetchScheduledReports = async () => {
    try {
      const response = await api.get('/reports/scheduled');
      setScheduledReports(response.data || []);
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
    }
  };

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

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  <i className="fas fa-chart-bar me-2"></i>
                  Reports & Analytics
                </h4>
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
                    onClick={() => window.location.reload()}
                  >
                    <i className="fas fa-sync me-1"></i>
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
                >
                  {message.text}
                </Alert>
              )}

              {/* Report Filters */}
              <Card className="mb-4">
                <Card.Header className="bg-light">
                  <h6 className="mb-0">Report Filters</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Date Range</Form.Label>
                        <Form.Select
                          value={reportFilters.dateRange}
                          onChange={(e) => setReportFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                        >
                          <option value="1day">Last 24 Hours</option>
                          <option value="7days">Last 7 Days</option>
                          <option value="30days">Last 30 Days</option>
                          <option value="90days">Last 90 Days</option>
                          <option value="custom">Custom Range</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    {reportFilters.dateRange === 'custom' && (
                      <>
                        <Col md={2}>
                          <Form.Group className="mb-3">
                            <Form.Label>Start Date</Form.Label>
                            <Form.Control
                              type="date"
                              value={reportFilters.startDate}
                              onChange={(e) => setReportFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group className="mb-3">
                            <Form.Label>End Date</Form.Label>
                            <Form.Control
                              type="date"
                              value={reportFilters.endDate}
                              onChange={(e) => setReportFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                          </Form.Group>
                        </Col>
                      </>
                    )}

                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Device Type</Form.Label>
                        <Form.Select
                          value={reportFilters.deviceType}
                          onChange={(e) => setReportFilters(prev => ({ ...prev, deviceType: e.target.value }))}
                        >
                          <option value="all">All Devices</option>
                          <option value="router">Routers</option>
                          <option value="switch">Switches</option>
                          <option value="firewall">Firewalls</option>
                          <option value="server">Servers</option>
                          <option value="accesspoint">Access Points</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>Severity</Form.Label>
                        <Form.Select
                          value={reportFilters.severity}
                          onChange={(e) => setReportFilters(prev => ({ ...prev, severity: e.target.value }))}
                        >
                          <option value="all">All Levels</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
              >
                {/* Dashboard Overview Tab */}
                <Tab eventKey="dashboard" title={
                  <>
                    <i className="fas fa-tachometer-alt me-1"></i>
                    Dashboard
                  </>
                }>
                  {loading ? (
                    <LoadingSpinner message="Loading dashboard data..." />
                  ) : (
                    <Row>
                      <Col md={3}>
                        <Card className="text-center mb-3">
                          <Card.Body>
                            <h2 className="text-primary">{dashboardData.totalDevices}</h2>
                            <p className="text-muted mb-1">Total Devices</p>
                            <small className="text-success">
                              {dashboardData.onlineDevices} Online
                            </small>
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col md={3}>
                        <Card className="text-center mb-3">
                          <Card.Body>
                            <h2 className="text-danger">{dashboardData.totalAlerts}</h2>
                            <p className="text-muted mb-1">Active Alerts</p>
                            <small className="text-danger">
                              {dashboardData.criticalAlerts} Critical
                            </small>
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col md={3}>
                        <Card className="text-center mb-3">
                          <Card.Body>
                            <h2 className="text-success">{formatPercentage(dashboardData.networkHealth)}</h2>
                            <p className="text-muted mb-1">Network Health</p>
                            <small className="text-muted">Overall Score</small>
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col md={3}>
                        <Card className="text-center mb-3">
                          <Card.Body>
                            <h2 className="text-info">{formatPercentage(dashboardData.averageUptime)}</h2>
                            <p className="text-muted mb-1">Average Uptime</p>
                            <small className="text-muted">Last 30 Days</small>
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col md={6}>
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Traffic Overview</h6>
                          </Card.Header>
                          <Card.Body>
                            <Table borderless size="sm">
                              <tbody>
                                <tr>
                                  <td><strong>Total Traffic:</strong></td>
                                  <td>{formatBytes(dashboardData.totalTraffic)}</td>
                                </tr>
                                <tr>
                                  <td><strong>Peak Traffic:</strong></td>
                                  <td>{formatBytes(dashboardData.peakTraffic)}</td>
                                </tr>
                                <tr>
                                  <td><strong>Average Utilization:</strong></td>
                                  <td>65%</td>
                                </tr>
                                <tr>
                                  <td><strong>Peak Utilization:</strong></td>
                                  <td>89%</td>
                                </tr>
                              </tbody>
                            </Table>
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col md={6}>
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Quick Actions</h6>
                          </Card.Header>
                          <Card.Body>
                            <div className="d-grid gap-2">
                              <Button 
                                variant="outline-primary" 
                                onClick={() => handleExportReport('dashboard', 'pdf')}
                                disabled={loading}
                              >
                                <i className="fas fa-file-pdf me-1"></i>
                                Export Dashboard Report
                              </Button>
                              <Button 
                                variant="outline-success" 
                                onClick={() => handleExportReport('performance', 'csv')}
                                disabled={loading}
                              >
                                <i className="fas fa-file-csv me-1"></i>
                                Export Performance Data
                              </Button>
                              <Button 
                                variant="outline-info" 
                                onClick={() => setActiveTab('scheduled')}
                              >
                                <i className="fas fa-calendar-alt me-1"></i>
                                Manage Scheduled Reports
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  )}
                </Tab>

                {/* Performance Reports Tab */}
                <Tab eventKey="performance" title={
                  <>
                    <i className="fas fa-chart-line me-1"></i>
                    Performance
                  </>
                }>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>Performance Reports</h5>
                    <div>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2"
                        onClick={() => handleExportReport('performance', 'csv')}
                        disabled={loading}
                      >
                        <i className="fas fa-file-csv me-1"></i>
                        Export CSV
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleExportReport('performance', 'pdf')}
                        disabled={loading}
                      >
                        <i className="fas fa-file-pdf me-1"></i>
                        Export PDF
                      </Button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </Spinner>
                    </div>
                  ) : (
                    <Table responsive striped>
                      <thead>
                        <tr>
                          <th>Device</th>
                          <th>Type</th>
                          <th>CPU Usage</th>
                          <th>Memory Usage</th>
                          <th>Response Time</th>
                          <th>Uptime</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceData.map((device) => (
                          <tr key={device.id}>
                            <td><strong>{device.name}</strong></td>
                            <td><Badge bg="info">{device.type}</Badge></td>
                            <td>{formatPercentage(device.cpuUsage)}</td>
                            <td>{formatPercentage(device.memoryUsage)}</td>
                            <td>{device.responseTime}ms</td>
                            <td>{formatPercentage(device.uptime)}</td>
                            <td>
                              <Badge bg={device.status === 'online' ? 'success' : 'danger'}>
                                {device.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {performanceData.length === 0 && (
                          <tr>
                            <td colSpan="7" className="text-center text-muted">
                              No performance data available for the selected filters
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  )}
                </Tab>

                {/* Security Reports Tab */}
                <Tab eventKey="security" title={
                  <>
                    <i className="fas fa-shield-alt me-1"></i>
                    Security
                  </>
                }>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>Security Reports</h5>
                    <div>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2"
                        onClick={() => handleExportReport('security', 'csv')}
                        disabled={loading}
                      >
                        <i className="fas fa-file-csv me-1"></i>
                        Export CSV
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleExportReport('security', 'pdf')}
                        disabled={loading}
                      >
                        <i className="fas fa-file-pdf me-1"></i>
                        Export PDF
                      </Button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </Spinner>
                    </div>
                  ) : (
                    <Table responsive striped>
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Event Type</th>
                          <th>Source</th>
                          <th>Severity</th>
                          <th>Description</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {securityData.map((event) => (
                          <tr key={event.id}>
                            <td>{new Date(event.timestamp).toLocaleString()}</td>
                            <td><Badge bg="warning">{event.type}</Badge></td>
                            <td>{event.source}</td>
                            <td>{getSeverityBadge(event.severity)}</td>
                            <td>{event.description}</td>
                            <td>
                              <Badge bg={event.status === 'resolved' ? 'success' : 'danger'}>
                                {event.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {securityData.length === 0 && (
                          <tr>
                            <td colSpan="6" className="text-center text-muted">
                              No security events for the selected filters
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  )}
                </Tab>

                {/* Scheduled Reports Tab */}
                <Tab eventKey="scheduled" title={
                  <>
                    <i className="fas fa-calendar-alt me-1"></i>
                    Scheduled
                  </>
                }>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>Scheduled Reports</h5>
                    <Button 
                      variant="primary" 
                      onClick={() => setShowScheduleModal(true)}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Schedule New Report
                    </Button>
                  </div>

                  <Table responsive striped>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Frequency</th>
                        <th>Next Run</th>
                        <th>Recipients</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledReports.map((report) => (
                        <tr key={report.id}>
                          <td><strong>{report.name}</strong></td>
                          <td><Badge bg="info">{report.type}</Badge></td>
                          <td>{report.frequency}</td>
                          <td>{new Date(report.nextRun).toLocaleDateString()}</td>
                          <td>{report.recipients}</td>
                          <td>
                            <Badge bg={report.enabled ? 'success' : 'secondary'}>
                              {report.enabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteScheduledReport(report.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {scheduledReports.length === 0 && (
                        <tr>
                          <td colSpan="7" className="text-center text-muted">
                            No scheduled reports configured
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Schedule Report Modal */}
      <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Schedule New Report</Modal.Title>
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
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Report Type</Form.Label>
                  <Form.Select
                    value={scheduleForm.type}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, type: e.target.value }))}
                    required
                  >
                    <option value="performance">Performance</option>
                    <option value="security">Security</option>
                    <option value="uptime">Uptime</option>
                    <option value="traffic">Traffic</option>
                    <option value="alerts">Alerts</option>
                    <option value="audit">Audit</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Frequency</Form.Label>
                  <Form.Select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, frequency: e.target.value }))}
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Format</Form.Label>
                  <Form.Select
                    value={scheduleForm.format}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, format: e.target.value }))}
                    required
                  >
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="enabled"
                    label="Enable Report"
                    checked={scheduleForm.enabled}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Recipients (comma-separated emails)</Form.Label>
              <Form.Control
                type="text"
                value={scheduleForm.recipients}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, recipients: e.target.value }))}
                placeholder="admin@company.com, manager@company.com"
                required
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