import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, Table, Badge, Modal, Spinner, ProgressBar } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Color schemes for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
const SEVERITY_COLORS = { critical: '#DC3545', warning: '#FFC107', info: '#0DCAF0', normal: '#198754' };

// Utility functions
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatPercentage = (value, decimals = 1) => {
  return isNaN(value) ? '0%' : `${Number(value).toFixed(decimals)}%`;
};

const formatDuration = (minutes) => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
};

const getSeverityBadge = (severity) => {
  const variant = severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'info';
  return <Badge bg={variant}>{severity.toUpperCase()}</Badge>;
};

const ProductionReports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('executive');

  // Executive Dashboard Data
  const [executiveDashboard, setExecutiveDashboard] = useState({
    networkHealth: 95,
    totalDevices: 0,
    onlineDevices: 0,
    criticalAlerts: 0,
    averageUptime: 99.5,
    averageResponseTime: 25,
    topPerformers: [],
    deviceIssues: [],
    deviceTypes: {},
    monthlyTrends: []
  });

  // Detailed Reports Data
  const [performanceReport, setPerformanceReport] = useState({ devices: [], summary: {} });
  const [availabilityReport, setAvailabilityReport] = useState({ devices: [], summary: {} });
  const [capacityReport, setCapacityReport] = useState({ devices: [], alerts: [], summary: {} });
  const [trafficReport, setTrafficReport] = useState({ topTalkers: [], trends: [], summary: {} });
  const [securityReport, setSecurityReport] = useState({ threats: [], compliance: {}, incidents: [] });

  // Report Parameters
  const [reportParameters, setReportParameters] = useState({
    timeRange: '24hours',
    customStartDate: '',
    customEndDate: '',
    deviceTypes: [],
    locations: [],
    includeOffline: true,
    groupBy: 'device'
  });

  // Scheduled Reports
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
    enabled: true,
    includeCharts: true
  });

  // Data fetching functions
  const fetchExecutiveDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/dashboard?timeRange=${reportParameters.timeRange}`);
      setExecutiveDashboard(response.data);
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to load executive dashboard'
      });
    } finally {
      setLoading(false);
    }
  }, [reportParameters.timeRange]);

  const fetchPerformanceReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        timeRange: reportParameters.timeRange,
        includeInterfaces: 'true'
      });
      
      const response = await api.get(`/reports/performance?${params}`);
      setPerformanceReport(response.data);
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to load performance report'
      });
    } finally {
      setLoading(false);
    }
  }, [reportParameters.timeRange]);

  const fetchAvailabilityReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/availability?timeRange=${reportParameters.timeRange}`);
      setAvailabilityReport(response.data);
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to load availability report'
      });
    } finally {
      setLoading(false);
    }
  }, [reportParameters.timeRange]);

  const fetchCapacityReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/capacity?timeRange=${reportParameters.timeRange}&forecastDays=30`);
      setCapacityReport(response.data);
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to load capacity report'
      });
    } finally {
      setLoading(false);
    }
  }, [reportParameters.timeRange]);

  const fetchScheduledReports = useCallback(async () => {
    try {
      const response = await api.get('/reports/scheduled');
      setScheduledReports(response.data?.scheduledReports || []);
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
    }
  }, []);

  // Effects
  useEffect(() => {
    const initializeReports = async () => {
      try {
        await fetchExecutiveDashboard();
        await fetchScheduledReports();
      } catch (error) {
        console.error('Failed to initialize reports:', error);
        setMessage({
          type: 'danger',
          text: 'Failed to initialize reports. Please try refreshing the page.'
        });
      }
    };
    
    initializeReports();
  }, [fetchExecutiveDashboard, fetchScheduledReports]);

  useEffect(() => {
    const fetchTabData = () => {
      switch (activeTab) {
        case 'performance':
          fetchPerformanceReport();
          break;
        case 'availability':
          fetchAvailabilityReport();
          break;
        case 'capacity':
          fetchCapacityReport();
          break;
        default:
          break;
      }
    };
    
    if (activeTab !== 'executive') {
      fetchTabData();
    }
  }, [activeTab, fetchPerformanceReport, fetchAvailabilityReport, fetchCapacityReport]);

  // Event handlers
  const handleExportReport = async (reportType, format = 'csv') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        timeRange: reportParameters.timeRange,
        format: format
      });

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
      await api.post('/reports/schedule', {
        ...scheduleForm,
        recipients: scheduleForm.recipients.split(',').map(email => email.trim())
      });
      
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
        enabled: true,
        includeCharts: true
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

  // Authentication check
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

  return (
    <Container fluid className="p-4">
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-gradient-primary text-white">
              <Row className="align-items-center">
                <Col>
                  <h2 className="mb-0">
                    <i className="fas fa-chart-line me-2"></i>
                    Network Management Reports & Analytics
                  </h2>
                  <small className="text-light">Comprehensive network monitoring and performance insights</small>
                </Col>
                <Col xs="auto">
                  <div className="d-flex gap-2">
                    <Form.Select 
                      size="sm"
                      value={reportParameters.timeRange}
                      onChange={(e) => setReportParameters(prev => ({
                        ...prev,
                        timeRange: e.target.value
                      }))}
                      style={{ minWidth: '120px' }}
                    >
                      <option value="1hour">Last Hour</option>
                      <option value="6hours">Last 6 Hours</option>
                      <option value="24hours">Last 24 Hours</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="90days">Last 90 Days</option>
                    </Form.Select>
                    <Button 
                      variant="light" 
                      size="sm"
                      onClick={() => setShowScheduleModal(true)}
                    >
                      <i className="fas fa-clock me-1"></i>
                      Schedule
                    </Button>
                    <Button 
                      variant="light" 
                      size="sm"
                      onClick={fetchExecutiveDashboard}
                      disabled={loading}
                    >
                      <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`}></i>
                      Refresh
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body className="p-0">
              {message.text && (
                <Alert 
                  variant={message.type} 
                  dismissible 
                  onClose={() => setMessage({ type: '', text: '' })}
                  className="m-3 mb-0"
                >
                  {message.text}
                </Alert>
              )}

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="nav-pills-custom"
                fill
              >
                {/* Executive Dashboard Tab */}
                <Tab eventKey="executive" title={
                  <span><i className="fas fa-tachometer-alt me-2"></i>Executive Dashboard</span>
                }>
                  <div className="p-4">
                    {/* Key Performance Indicators */}
                    <Row className="mb-4">
                      <Col md={3}>
                        <Card className="border-0 bg-primary text-white h-100">
                          <Card.Body className="text-center">
                            <div className="display-4 fw-bold">{executiveDashboard.networkHealth}%</div>
                            <div className="small">Network Health Score</div>
                            <div className={`small mt-1 ${executiveDashboard.networkHealth >= 95 ? 'text-success' : executiveDashboard.networkHealth >= 80 ? 'text-warning' : 'text-danger'}`}>
                              <i className={`fas fa-${executiveDashboard.networkHealth >= 95 ? 'check-circle' : executiveDashboard.networkHealth >= 80 ? 'exclamation-triangle' : 'times-circle'} me-1`}></i>
                              {executiveDashboard.networkHealth >= 95 ? 'Excellent' : executiveDashboard.networkHealth >= 80 ? 'Good' : 'Needs Attention'}
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-0 bg-success text-white h-100">
                          <Card.Body className="text-center">
                            <div className="display-4 fw-bold">{executiveDashboard.onlineDevices}</div>
                            <div className="small">Online Devices</div>
                            <div className="small mt-1">
                              of {executiveDashboard.totalDevices} total devices
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-0 bg-warning text-dark h-100">
                          <Card.Body className="text-center">
                            <div className="display-4 fw-bold">{executiveDashboard.criticalAlerts}</div>
                            <div className="small">Critical Alerts</div>
                            <div className="small mt-1">
                              Require immediate attention
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-0 bg-info text-white h-100">
                          <Card.Body className="text-center">
                            <div className="display-4 fw-bold">{formatPercentage(executiveDashboard.averageUptime, 2)}</div>
                            <div className="small">Average Uptime</div>
                            <div className="small mt-1">
                              {executiveDashboard.averageResponseTime}ms avg response
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* Device Distribution Chart */}
                    <Row className="mb-4">
                      <Col md={6}>
                        <Card className="h-100">
                          <Card.Header>Device Type Distribution</Card.Header>
                          <Card.Body>
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={Object.entries(executiveDashboard.deviceTypes || {}).map(([type, count]) => ({
                                    name: type.charAt(0).toUpperCase() + type.slice(1),
                                    value: count
                                  }))}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {Object.entries(executiveDashboard.deviceTypes || {}).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card className="h-100">
                          <Card.Header>Top Performing Devices</Card.Header>
                          <Card.Body>
                            <Table striped size="sm">
                              <thead>
                                <tr>
                                  <th>Device</th>
                                  <th>Availability</th>
                                  <th>Response</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(executiveDashboard.topPerformers || []).map((device, index) => (
                                  <tr key={index}>
                                    <td>
                                      <div className="fw-semibold">{device.name}</div>
                                      <small className="text-muted">{device.ipAddress}</small>
                                    </td>
                                    <td>
                                      <Badge bg="success">{formatPercentage(device.availability)}</Badge>
                                    </td>
                                    <td>
                                      <Badge bg={device.responseTime < 50 ? 'success' : device.responseTime < 100 ? 'warning' : 'danger'}>
                                        {device.responseTime}ms
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                                {(executiveDashboard.topPerformers || []).length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="text-center text-muted">No performance data available</td>
                                  </tr>
                                )}
                              </tbody>
                            </Table>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* Device Issues */}
                    {(executiveDashboard.deviceIssues || []).length > 0 && (
                      <Row>
                        <Col>
                          <Card>
                            <Card.Header className="bg-warning text-dark">
                              <i className="fas fa-exclamation-triangle me-2"></i>
                              Devices Requiring Attention
                            </Card.Header>
                            <Card.Body>
                              <Table striped hover responsive>
                                <thead>
                                  <tr>
                                    <th>Device</th>
                                    <th>Status</th>
                                    <th>Issues</th>
                                    <th>Critical Alerts</th>
                                    <th>Last Seen</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {executiveDashboard.deviceIssues.map((device, index) => (
                                    <tr key={index}>
                                      <td>
                                        <div className="fw-semibold">{device.name}</div>
                                        <small className="text-muted">{device.ipAddress}</small>
                                      </td>
                                      <td>
                                        <Badge bg={device.status === 'online' ? 'success' : device.status === 'offline' ? 'danger' : 'warning'}>
                                          {device.status}
                                        </Badge>
                                      </td>
                                      <td>{device.issueCount}</td>
                                      <td>
                                        {device.criticalAlerts > 0 ? (
                                          <Badge bg="danger">{device.criticalAlerts}</Badge>
                                        ) : (
                                          <span className="text-muted">0</span>
                                        )}
                                      </td>
                                      <td>{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    )}
                  </div>
                </Tab>

                {/* Performance Analysis Tab */}
                <Tab eventKey="performance" title={
                  <span><i className="fas fa-chart-area me-2"></i>Performance Analysis</span>
                }>
                  <div className="p-4">
                    {loading ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">Loading performance data...</span>
                        </Spinner>
                        <p className="mt-3">Analyzing network performance metrics...</p>
                      </div>
                    ) : (
                      <>
                        {/* Performance Summary */}
                        <Row className="mb-4">
                          <Col md={3}>
                            <Card className="border-info">
                              <Card.Body className="text-center">
                                <h4 className="text-info">{formatPercentage(performanceReport.summary?.avgCpuUsage)}</h4>
                                <small>Average CPU Usage</small>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="border-info">
                              <Card.Body className="text-center">
                                <h4 className="text-info">{formatPercentage(performanceReport.summary?.avgMemoryUsage)}</h4>
                                <small>Average Memory Usage</small>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="border-info">
                              <Card.Body className="text-center">
                                <h4 className="text-info">{Math.round(performanceReport.summary?.avgResponseTime || 0)}ms</h4>
                                <small>Average Response Time</small>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="border-info">
                              <Card.Body className="text-center">
                                <h4 className="text-info">{formatPercentage(performanceReport.summary?.avgAvailability)}</h4>
                                <small>Average Availability</small>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>

                        {/* Export Options */}
                        <Row className="mb-3">
                          <Col>
                            <div className="d-flex justify-content-between align-items-center">
                              <h5>Performance Details</h5>
                              <div>
                                <Button 
                                  size="sm" 
                                  variant="outline-primary" 
                                  className="me-2"
                                  onClick={() => handleExportReport('performance', 'csv')}
                                >
                                  <i className="fas fa-file-csv me-1"></i>Export CSV
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline-primary"
                                  onClick={() => handleExportReport('performance', 'pdf')}
                                >
                                  <i className="fas fa-file-pdf me-1"></i>Export PDF
                                </Button>
                              </div>
                            </div>
                          </Col>
                        </Row>

                        {/* Performance Table */}
                        {(performanceReport.devices || []).length > 0 ? (
                          <Card>
                            <Card.Body>
                              <Table striped bordered hover responsive>
                                <thead className="table-dark">
                                  <tr>
                                    <th>Device</th>
                                    <th>Type</th>
                                    <th>CPU Usage</th>
                                    <th>Memory Usage</th>
                                    <th>Response Time</th>
                                    <th>Availability</th>
                                    <th>Interfaces</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {performanceReport.devices.map((deviceData, index) => (
                                    <tr key={index}>
                                      <td>
                                        <div className="fw-semibold">{deviceData.device.name}</div>
                                        <small className="text-muted">{deviceData.device.ipAddress}</small>
                                      </td>
                                      <td>
                                        <Badge bg="secondary">{deviceData.device.deviceType}</Badge>
                                      </td>
                                      <td>
                                        <div className="d-flex align-items-center">
                                          <ProgressBar 
                                            now={deviceData.performance.cpu.avg || 0} 
                                            variant={deviceData.performance.cpu.avg > 80 ? 'danger' : deviceData.performance.cpu.avg > 60 ? 'warning' : 'success'}
                                            style={{ width: '60px', height: '8px' }}
                                            className="me-2"
                                          />
                                          <small>{formatPercentage(deviceData.performance.cpu.avg)}</small>
                                        </div>
                                        <small className="text-muted">
                                          Peak: {formatPercentage(deviceData.performance.cpu.max)}
                                        </small>
                                      </td>
                                      <td>
                                        <div className="d-flex align-items-center">
                                          <ProgressBar 
                                            now={deviceData.performance.memory.avg || 0} 
                                            variant={deviceData.performance.memory.avg > 80 ? 'danger' : deviceData.performance.memory.avg > 60 ? 'warning' : 'success'}
                                            style={{ width: '60px', height: '8px' }}
                                            className="me-2"
                                          />
                                          <small>{formatPercentage(deviceData.performance.memory.avg)}</small>
                                        </div>
                                        <small className="text-muted">
                                          Peak: {formatPercentage(deviceData.performance.memory.max)}
                                        </small>
                                      </td>
                                      <td>
                                        <Badge bg={deviceData.performance.responseTime.avg < 50 ? 'success' : deviceData.performance.responseTime.avg < 100 ? 'warning' : 'danger'}>
                                          {Math.round(deviceData.performance.responseTime.avg || 0)}ms
                                        </Badge>
                                      </td>
                                      <td>
                                        <Badge bg={deviceData.performance.availability.avg >= 99 ? 'success' : deviceData.performance.availability.avg >= 95 ? 'warning' : 'danger'}>
                                          {formatPercentage(deviceData.performance.availability.avg)}
                                        </Badge>
                                      </td>
                                      <td>
                                        <small>{deviceData.interfaces.length} interfaces</small>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </Card.Body>
                          </Card>
                        ) : (
                          <Alert variant="info">
                            <i className="fas fa-info-circle me-2"></i>
                            No performance data available for the selected time range. Performance metrics will appear here once monitoring data is collected.
                          </Alert>
                        )}
                      </>
                    )}
                  </div>
                </Tab>

                {/* Availability & SLA Tab */}
                <Tab eventKey="availability" title={
                  <span><i className="fas fa-clock me-2"></i>Availability & SLA</span>
                }>
                  <div className="p-4">
                    {loading ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">Loading availability data...</span>
                        </Spinner>
                        <p className="mt-3">Calculating availability metrics...</p>
                      </div>
                    ) : (
                      <>
                        {/* SLA Summary */}
                        <Row className="mb-4">
                          <Col md={3}>
                            <Card className="border-success">
                              <Card.Body className="text-center">
                                <h4 className="text-success">{formatPercentage(availabilityReport.summary?.averageAvailability)}</h4>
                                <small>Overall Availability</small>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="border-primary">
                              <Card.Body className="text-center">
                                <h4 className="text-primary">{availabilityReport.summary?.devicesOnline || 0}</h4>
                                <small>Devices Online</small>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="border-warning">
                              <Card.Body className="text-center">
                                <h4 className="text-warning">{availabilityReport.summary?.totalOutages || 0}</h4>
                                <small>Total Outages</small>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="border-info">
                              <Card.Body className="text-center">
                                <h4 className="text-info">{formatPercentage(availabilityReport.summary?.slaCompliance)}</h4>
                                <small>SLA Compliance</small>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>

                        {/* Availability Details */}
                        <Row className="mb-3">
                          <Col>
                            <div className="d-flex justify-content-between align-items-center">
                              <h5>Device Availability Details</h5>
                              <Button 
                                size="sm" 
                                variant="outline-primary"
                                onClick={() => handleExportReport('availability', 'csv')}
                              >
                                <i className="fas fa-download me-1"></i>Export Report
                              </Button>
                            </div>
                          </Col>
                        </Row>

                        {(availabilityReport.devices || []).length > 0 ? (
                          <Card>
                            <Card.Body>
                              <Table striped bordered hover responsive>
                                <thead className="table-dark">
                                  <tr>
                                    <th>Device</th>
                                    <th>Current Status</th>
                                    <th>Availability %</th>
                                    <th>Uptime</th>
                                    <th>Downtime</th>
                                    <th>Outages</th>
                                    <th>MTBF</th>
                                    <th>SLA Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {availabilityReport.devices.map((deviceData, index) => (
                                    <tr key={index}>
                                      <td>
                                        <div className="fw-semibold">{deviceData.device.name}</div>
                                        <small className="text-muted">{deviceData.device.ipAddress}</small>
                                      </td>
                                      <td>
                                        <Badge bg={deviceData.device.currentStatus === 'online' ? 'success' : 'danger'}>
                                          {deviceData.device.currentStatus}
                                        </Badge>
                                      </td>
                                      <td>
                                        <div className="d-flex align-items-center">
                                          <ProgressBar 
                                            now={deviceData.availability.percentage} 
                                            variant={deviceData.availability.percentage >= 99 ? 'success' : deviceData.availability.percentage >= 95 ? 'warning' : 'danger'}
                                            style={{ width: '60px', height: '8px' }}
                                            className="me-2"
                                          />
                                          <small>{formatPercentage(deviceData.availability.percentage, 2)}</small>
                                        </div>
                                      </td>
                                      <td>{formatDuration(deviceData.availability.uptime)}</td>
                                      <td>{formatDuration(deviceData.availability.downtime)}</td>
                                      <td>{deviceData.availability.outageCount}</td>
                                      <td>{deviceData.availability.mtbf ? formatDuration(deviceData.availability.mtbf) : 'N/A'}</td>
                                      <td>
                                        <Badge bg={deviceData.slaStatus === 'met' ? 'success' : deviceData.slaStatus === 'at_risk' ? 'warning' : 'danger'}>
                                          {deviceData.slaStatus.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </Card.Body>
                          </Card>
                        ) : (
                          <Alert variant="info">
                            <i className="fas fa-info-circle me-2"></i>
                            No availability data available for the selected time range.
                          </Alert>
                        )}
                      </>
                    )}
                  </div>
                </Tab>

                {/* Capacity Planning Tab */}
                <Tab eventKey="capacity" title={
                  <span><i className="fas fa-chart-bar me-2"></i>Capacity Planning</span>
                }>
                  <div className="p-4">
                    {loading ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">Loading capacity data...</span>
                        </Spinner>
                        <p className="mt-3">Analyzing capacity trends and forecasts...</p>
                      </div>
                    ) : (
                      <>
                        {/* Capacity Summary */}
                        <Row className="mb-4">
                          <Col md={3}>
                            <Card className="border-primary">
                              <Card.Body className="text-center">
                                <h4 className="text-primary">{capacityReport.summary?.totalDevices || 0}</h4>
                                <small>Total Monitored Devices</small>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="border-warning">
                              <Card.Body className="text-center">
                                <h4 className="text-warning">{capacityReport.summary?.devicesAtRisk || 0}</h4>
                                <small>Devices At Risk</small>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="border-danger">
                              <Card.Body className="text-center">
                                <h4 className="text-danger">{capacityReport.summary?.criticalDevices || 0}</h4>
                                <small>Critical Capacity Issues</small>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="border-info">
                              <Card.Body className="text-center">
                                <h4 className="text-info">{capacityReport.summary?.capacityAlerts || 0}</h4>
                                <small>Capacity Alerts</small>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>

                        {/* Capacity Alerts */}
                        {(capacityReport.alerts || []).length > 0 && (
                          <Row className="mb-4">
                            <Col>
                              <Card className="border-warning">
                                <Card.Header className="bg-warning text-dark">
                                  <i className="fas fa-exclamation-triangle me-2"></i>
                                  Capacity Alerts - Immediate Attention Required
                                </Card.Header>
                                <Card.Body>
                                  <Table striped size="sm">
                                    <thead>
                                      <tr>
                                        <th>Device</th>
                                        <th>Resource</th>
                                        <th>Current</th>
                                        <th>Forecast</th>
                                        <th>Days to Capacity</th>
                                        <th>Severity</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {capacityReport.alerts.map((alert, index) => (
                                        <tr key={index}>
                                          <td>{alert.device}</td>
                                          <td>
                                            <Badge bg="secondary">{alert.resource}</Badge>
                                          </td>
                                          <td>{formatPercentage(alert.currentUtilization)}</td>
                                          <td>{formatPercentage(alert.forecastUtilization)}</td>
                                          <td>
                                            <Badge bg={alert.daysToCapacity <= 7 ? 'danger' : 'warning'}>
                                              {alert.daysToCapacity} days
                                            </Badge>
                                          </td>
                                          <td>
                                            <Badge bg={alert.severity === 'critical' ? 'danger' : 'warning'}>
                                              {alert.severity.toUpperCase()}
                                            </Badge>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Table>
                                </Card.Body>
                              </Card>
                            </Col>
                          </Row>
                        )}

                        {/* Capacity Details */}
                        <Row className="mb-3">
                          <Col>
                            <div className="d-flex justify-content-between align-items-center">
                              <h5>Capacity Planning Details</h5>
                              <Button 
                                size="sm" 
                                variant="outline-primary"
                                onClick={() => handleExportReport('capacity', 'csv')}
                              >
                                <i className="fas fa-download me-1"></i>Export Report
                              </Button>
                            </div>
                          </Col>
                        </Row>

                        {(capacityReport.devices || []).length > 0 ? (
                          <Card>
                            <Card.Body>
                              <Table striped bordered hover responsive>
                                <thead className="table-dark">
                                  <tr>
                                    <th>Device</th>
                                    <th>Type</th>
                                    <th>CPU</th>
                                    <th>Memory</th>
                                    <th>Storage</th>
                                    <th>Bandwidth</th>
                                    <th>Risk Level</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {capacityReport.devices.map((deviceData, index) => (
                                    <tr key={index}>
                                      <td>
                                        <div className="fw-semibold">{deviceData.device.name}</div>
                                        <small className="text-muted">{deviceData.device.ipAddress}</small>
                                      </td>
                                      <td>
                                        <Badge bg="secondary">{deviceData.device.deviceType}</Badge>
                                      </td>
                                      <td>
                                        <div className="mb-1">
                                          <small>Current: {formatPercentage(deviceData.capacity.cpu.current)}</small>
                                        </div>
                                        <div className="mb-1">
                                          <small>Forecast: {formatPercentage(deviceData.capacity.cpu.forecast)}</small>
                                        </div>
                                        <div>
                                          <Badge bg={deviceData.capacity.cpu.trend === 'increasing' ? 'warning' : deviceData.capacity.cpu.trend === 'decreasing' ? 'success' : 'secondary'}>
                                            {deviceData.capacity.cpu.trend}
                                          </Badge>
                                        </div>
                                      </td>
                                      <td>
                                        <div className="mb-1">
                                          <small>Current: {formatPercentage(deviceData.capacity.memory.current)}</small>
                                        </div>
                                        <div className="mb-1">
                                          <small>Forecast: {formatPercentage(deviceData.capacity.memory.forecast)}</small>
                                        </div>
                                        <div>
                                          <Badge bg={deviceData.capacity.memory.trend === 'increasing' ? 'warning' : deviceData.capacity.memory.trend === 'decreasing' ? 'success' : 'secondary'}>
                                            {deviceData.capacity.memory.trend}
                                          </Badge>
                                        </div>
                                      </td>
                                      <td>
                                        <div className="mb-1">
                                          <small>Current: {formatPercentage(deviceData.capacity.storage.current)}</small>
                                        </div>
                                        <div className="mb-1">
                                          <small>Forecast: {formatPercentage(deviceData.capacity.storage.forecast)}</small>
                                        </div>
                                        <div>
                                          <Badge bg={deviceData.capacity.storage.trend === 'increasing' ? 'warning' : deviceData.capacity.storage.trend === 'decreasing' ? 'success' : 'secondary'}>
                                            {deviceData.capacity.storage.trend}
                                          </Badge>
                                        </div>
                                      </td>
                                      <td>
                                        <div className="mb-1">
                                          <small>Current: {formatPercentage(deviceData.capacity.bandwidth.current)}</small>
                                        </div>
                                        <div className="mb-1">
                                          <small>Forecast: {formatPercentage(deviceData.capacity.bandwidth.forecast)}</small>
                                        </div>
                                        <div>
                                          <Badge bg={deviceData.capacity.bandwidth.trend === 'increasing' ? 'warning' : deviceData.capacity.bandwidth.trend === 'decreasing' ? 'success' : 'secondary'}>
                                            {deviceData.capacity.bandwidth.trend}
                                          </Badge>
                                        </div>
                                      </td>
                                      <td>
                                        <Badge bg={deviceData.riskLevel === 'critical' ? 'danger' : deviceData.riskLevel === 'warning' ? 'warning' : 'success'}>
                                          {deviceData.riskLevel.toUpperCase()}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </Card.Body>
                          </Card>
                        ) : (
                          <Alert variant="info">
                            <i className="fas fa-info-circle me-2"></i>
                            No capacity data available for the selected time range.
                          </Alert>
                        )}
                      </>
                    )}
                  </div>
                </Tab>

                {/* Scheduled Reports Tab */}
                <Tab eventKey="scheduled" title={
                  <span><i className="fas fa-calendar-alt me-2"></i>Scheduled Reports</span>
                }>
                  <div className="p-4">
                    <Row className="mb-3">
                      <Col>
                        <div className="d-flex justify-content-between align-items-center">
                          <h5>Scheduled Reports Management</h5>
                          <Button 
                            variant="primary"
                            onClick={() => setShowScheduleModal(true)}
                          >
                            <i className="fas fa-plus me-1"></i>Schedule New Report
                          </Button>
                        </div>
                      </Col>
                    </Row>

                    {scheduledReports.length > 0 ? (
                      <Card>
                        <Card.Body>
                          <Table striped bordered hover responsive>
                            <thead className="table-dark">
                              <tr>
                                <th>Report Name</th>
                                <th>Type</th>
                                <th>Frequency</th>
                                <th>Recipients</th>
                                <th>Next Run</th>
                                <th>Status</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scheduledReports.map((report, index) => (
                                <tr key={index}>
                                  <td className="fw-semibold">{report.name || report.title}</td>
                                  <td>
                                    <Badge bg="info">{report.type}</Badge>
                                  </td>
                                  <td>{report.frequency || report.metadata?.schedule?.frequency}</td>
                                  <td>
                                    <small>
                                      {Array.isArray(report.recipients) 
                                        ? report.recipients.map(r => r.email || r).join(', ')
                                        : report.metadata?.schedule?.recipients?.join(', ') || 'No recipients'
                                      }
                                    </small>
                                  </td>
                                  <td>
                                    <small>
                                      {report.nextRun || report.metadata?.schedule?.nextRun 
                                        ? new Date(report.nextRun || report.metadata.schedule.nextRun).toLocaleString()
                                        : 'Not scheduled'
                                      }
                                    </small>
                                  </td>
                                  <td>
                                    <Badge bg={(report.enabled || report.metadata?.schedule?.enabled) ? 'success' : 'secondary'}>
                                      {(report.enabled || report.metadata?.schedule?.enabled) ? 'Active' : 'Disabled'}
                                    </Badge>
                                  </td>
                                  <td>
                                    <Button
                                      size="sm"
                                      variant="outline-danger"
                                      onClick={() => handleDeleteScheduledReport(report._id)}
                                    >
                                      <i className="fas fa-trash"></i>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    ) : (
                      <Alert variant="info">
                        <i className="fas fa-info-circle me-2"></i>
                        No scheduled reports found. Click "Schedule New Report" to create automated reports.
                      </Alert>
                    )}
                  </div>
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
                    onChange={(e) => setScheduleForm({...scheduleForm, name: e.target.value})}
                    required
                    placeholder="e.g., Daily Network Health Report"
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
                    <option value="performance">Performance Analysis</option>
                    <option value="availability">Availability & SLA</option>
                    <option value="capacity">Capacity Planning</option>
                    <option value="security">Security Report</option>
                    <option value="executive">Executive Summary</option>
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

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Format</Form.Label>
                  <Form.Select
                    value={scheduleForm.format}
                    onChange={(e) => setScheduleForm({...scheduleForm, format: e.target.value})}
                  >
                    <option value="pdf">PDF Report</option>
                    <option value="csv">CSV Data</option>
                    <option value="xlsx">Excel Spreadsheet</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check 
                    type="checkbox" 
                    id="includeCharts"
                    label="Include Charts and Graphs" 
                    checked={scheduleForm.includeCharts}
                    onChange={(e) => setScheduleForm({...scheduleForm, includeCharts: e.target.checked})}
                  />
                  <Form.Check 
                    type="checkbox" 
                    id="enabled"
                    label="Enable Report" 
                    checked={scheduleForm.enabled}
                    onChange={(e) => setScheduleForm({...scheduleForm, enabled: e.target.checked})}
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
                placeholder="admin@company.com, manager@company.com"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm({...scheduleForm, description: e.target.value})}
                placeholder="Brief description of what this report includes..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-1"
                  />
                  Scheduling...
                </>
              ) : (
                'Schedule Report'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProductionReports;