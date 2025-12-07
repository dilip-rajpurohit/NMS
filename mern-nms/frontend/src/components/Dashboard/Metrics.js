import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Alert, Spinner, Badge, Table, ProgressBar, Button } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const Metrics = () => {
  const [metrics, setMetrics] = useState({});
  const [selectedDevice, setSelectedDevice] = useState('');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [performanceData, setPerformanceData] = useState({
    cpu: [],
    memory: [],
    network: [],
    disk: []
  });
  const [networkOverview, setNetworkOverview] = useState({
    totalBandwidth: 0,
    usedBandwidth: 0,
    topTalkers: [],
    protocolStats: {}
  });

  const { socket, connected, realTimeData, subscribe } = useSocket();
  const { user } = useAuth();

  // Real-time data updates
  useEffect(() => {
    if (realTimeData) {
      if (realTimeData.devices) {
        setDevices(realTimeData.devices);
      }
      if (realTimeData.metrics) {
        setMetrics(realTimeData.metrics);
        setPerformanceData(realTimeData.performanceData || performanceData);
      }
      setLastUpdated(new Date());
    }
  }, [realTimeData]);

  // Subscribe to real-time events
  useEffect(() => {
    if (socket && connected) {
      const unsubscribe = subscribe([
        'metricsUpdated',
        'deviceMetricsUpdated',
        'performanceDataUpdated',
        'networkStatsUpdated'
      ], (data) => {
        fetchMetrics();
        setLastUpdated(new Date());
      });

      return unsubscribe;
    }
  }, [socket, connected, subscribe]);

  const fetchDevices = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const response = await api.get('/discovery/devices', { headers });
      const devicesList = response.data.devices || [];
      setDevices(devicesList);
      
      if (devicesList.length > 0 && !selectedDevice) {
        setSelectedDevice(devicesList[0]._id || devicesList[0].ip);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  }, [selectedDevice]);

  // Lightweight function for background metrics updates
  const fetchLiveMetrics = useCallback(async () => {
    try {
      // Fetch comprehensive device status data for background updates
      const liveResponse = await api.get('/metrics/live');
      const liveData = liveResponse.data;
      
      if (liveData) {
        // Update network overview with all live data
        setNetworkOverview(prev => ({
          ...prev,
          onlineDevices: liveData.onlineDevices ?? prev.onlineDevices,
          offlineDevices: liveData.offlineDevices ?? prev.offlineDevices,
          totalDevices: liveData.totalDevices ?? prev.totalDevices,
          networkHealth: liveData.networkHealth ?? prev.networkHealth,
          recentActivity: liveData.recentActivity ?? prev.recentActivity,
          deviceTypes: liveData.deviceTypes ?? prev.deviceTypes
        }));
        setLastUpdated(new Date());
      }
    } catch (error) {
      // Silent fail for background updates to avoid disrupting UX
      console.debug('Live metrics update failed:', error.message);
    }
  }, []);

  // Full metrics fetch (for initial load and manual refresh)
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch overview metrics
      const overviewResponse = await api.get(`/metrics/overview?timeRange=${timeRange}`, { headers });
      setMetrics(overviewResponse.data || {});
      
      // Fetch network overview
      const networkResponse = await api.get('/metrics/network', { headers }).catch(() => ({ data: {} }));
      setNetworkOverview(networkResponse.data || {});
      
      // Fetch device-specific metrics if device is selected
      if (selectedDevice) {
        const deviceResponse = await api.get(`/metrics/devices/${selectedDevice}?timeRange=${timeRange}`, { headers });
        const deviceData = deviceResponse.data || {};
        
        // Use real performance data from device or empty arrays if no data
        setPerformanceData({
          cpu: deviceData.performanceData?.cpu || [],
          memory: deviceData.performanceData?.memory || [],
          network: deviceData.performanceData?.network || [],
          disk: deviceData.performanceData?.disk || []
        });
      } else {
        // Clear performance data when no device selected
        setPerformanceData({
          cpu: [],
          memory: [],
          network: [],
          disk: []
        });
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load metrics data');
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, timeRange]);

  // Initial load and background updates
  useEffect(() => {
    fetchDevices();
    fetchMetrics();
    
    // Use lightweight metrics for background updates
    const interval = setInterval(fetchLiveMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchDevices, fetchMetrics, fetchLiveMetrics]);

  // Fetch device-specific metrics when device changes
  useEffect(() => {
    if (selectedDevice) {
      fetchMetrics();
    }
  }, [selectedDevice, fetchMetrics]);

  const renderMetricCard = (title, value, unit, icon, color = 'primary', trend = null) => (
    <Card className="bg-dark border-secondary h-100">
      <Card.Body>
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0">
            <div className={`bg-${color} bg-opacity-20 rounded-circle p-3`}>
              <i className={`${icon} text-${color} fs-4`}></i>
            </div>
          </div>
          <div className="flex-grow-1 ms-3">
            <h4 className="text-white mb-1">{value}{unit}</h4>
            <p className="text-muted mb-0">{title}</p>
            {trend && (
              <small className={`text-${trend > 0 ? 'success' : trend < 0 ? 'danger' : 'muted'}`}>
                <i className={`fas fa-arrow-${trend > 0 ? 'up' : trend < 0 ? 'down' : 'right'} me-1`}></i>
                {Math.abs(trend)}%
              </small>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  const renderPerformanceChart = (title, data, color, unit) => (
    <Card className="bg-dark border-secondary h-100">
      <Card.Header className="bg-dark border-secondary">
        <h6 className="mb-0 text-white">
          <i className="fas fa-chart-line me-2 text-primary"></i>
          {title}
        </h6>
      </Card.Header>
      <Card.Body>
        {data.length > 0 ? (
          <div className="performance-chart">
            <div className="d-flex justify-content-between mb-2">
              <small className="text-muted">Last 24 hours</small>
              <small className="text-white">
                Current: {data[data.length - 1]?.value || 0}{unit}
              </small>
            </div>
            <div className="chart-container">
              {/* Simple bar chart representation */}
              <div className="d-flex align-items-end" style={{ height: '100px' }}>
                {data.slice(-12).map((point, index) => (
                  <div
                    key={index}
                    className={`bg-${color} me-1 flex-grow-1`}
                    style={{
                      height: `${(point.value / 100) * 80}px`,
                      minHeight: '2px',
                      opacity: 0.7 + (index / 12) * 0.3
                    }}
                    title={`${point.value}${unit} at ${new Date(point.time).toLocaleTimeString()}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted py-3">
            <i className="fas fa-chart-line fs-2 mb-2"></i>
            <p>No data available</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );

  if (loading && devices.length === 0) {
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
                <i className="fas fa-chart-bar me-2 text-primary"></i>
                Performance Metrics
              </h2>
            </div>
            <div className="d-flex align-items-center">
              {connected ? (
                <Badge bg="success" className="me-3">
                  <i className="fas fa-circle me-1"></i>
                  Live Data
                </Badge>
              ) : (
                <Badge bg="danger" className="me-3">
                  <i className="fas fa-circle me-1"></i>
                  No Connection
                </Badge>
              )}
              {lastUpdated && (
                <small className="text-muted me-3">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </small>
              )}
              <Button variant="outline-light" size="sm" onClick={fetchMetrics} disabled={loading}>
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger" className="bg-danger bg-opacity-20 border-danger text-white">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Controls */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="bg-dark border-secondary">
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label className="text-white">Select Device</Form.Label>
                <Form.Select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="bg-dark text-white border-secondary"
                >
                  <option value="">All Devices Overview</option>
                  {devices.map((device, index) => (
                    <option key={device._id || index} value={device._id || device.ip}>
                      {device.name || device.hostname || device.ip} ({device.ip})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="bg-dark border-secondary">
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label className="text-white">Time Range</Form.Label>
                <Form.Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-dark text-white border-secondary"
                >
                  <option value="1h">Last Hour</option>
                  <option value="6h">Last 6 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Network Overview Metrics */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard(
            'Total Devices',
            devices.length,
            '',
            'fas fa-server',
            'primary'
          )}
        </Col>
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard(
            'Active Devices',
            devices.filter(d => d.status === 'online' || d.status === 'up').length,
            '',
            'fas fa-check-circle',
            'success'
          )}
        </Col>
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard(
            'Avg Response Time',
            metrics.averageResponseTime || 0,
            'ms',
            'fas fa-clock',
            'info'
          )}
        </Col>
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard(
            'Network Utilization',
            Math.round((networkOverview.usedBandwidth / networkOverview.totalBandwidth) * 100) || 0,
            '%',
            'fas fa-network-wired',
            'warning'
          )}
        </Col>
      </Row>

      {/* Performance Charts */}
      <Row className="mb-4">
        <Col lg={6} className="mb-3">
          {renderPerformanceChart('CPU Usage', performanceData.cpu, 'danger', '%')}
        </Col>
        <Col lg={6} className="mb-3">
          {renderPerformanceChart('Memory Usage', performanceData.memory, 'warning', '%')}
        </Col>
      </Row>

      <Row className="mb-4">
        <Col lg={6} className="mb-3">
          {renderPerformanceChart('Network Traffic', performanceData.network, 'info', 'Mbps')}
        </Col>
        <Col lg={6} className="mb-3">
          {renderPerformanceChart('Disk Usage', performanceData.disk, 'success', '%')}
        </Col>
      </Row>

      {/* Device Details Table */}
      {devices.length > 0 && (
        <Row>
          <Col>
            <Card className="bg-dark border-secondary">
              <Card.Header className="bg-dark border-secondary">
                <h5 className="mb-0 text-white">
                  <i className="fas fa-table me-2 text-primary"></i>
                  Device Performance Summary
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Table variant="dark" hover responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>IP Address</th>
                      <th>Status</th>
                      <th>Response Time</th>
                      <th>CPU Usage</th>
                      <th>Memory Usage</th>
                      <th>Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device, index) => (
                      <tr key={device._id || index}>
                        <td>
                          <div className="d-flex align-items-center">
                            <i className="fas fa-server me-2 text-primary"></i>
                            <div>
                              <div className="text-white fw-medium">
                                {device.name || device.hostname || 'Unknown Device'}
                              </div>
                              <small className="text-muted">{device.type || 'Unknown'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code className="text-info">{device.ipAddress || device.ip}</code>
                        </td>
                        <td>
                          <Badge bg={device.status === 'online' || device.status === 'up' ? 'success' : 'danger'}>
                            {device.status || 'unknown'}
                          </Badge>
                        </td>
                        <td>
                          <span className="text-white">
                            {device.metrics?.responseTime || 0}ms
                          </span>
                        </td>
                        <td>
                          <div style={{ width: '80px' }}>
                            <ProgressBar 
                              variant={device.metrics?.cpuUsage > 80 ? 'danger' : device.metrics?.cpuUsage > 60 ? 'warning' : 'success'}
                              now={device.metrics?.cpuUsage || 0}
                              size="sm"
                              label={`${device.metrics?.cpuUsage || 0}%`}
                            />
                          </div>
                        </td>
                        <td>
                          <div style={{ width: '80px' }}>
                            <ProgressBar 
                              variant={device.metrics?.memoryUsage > 85 ? 'danger' : device.metrics?.memoryUsage > 70 ? 'warning' : 'info'}
                              now={device.metrics?.memoryUsage || 0}
                              size="sm"
                              label={`${device.metrics?.memoryUsage || 0}%`}
                            />
                          </div>
                        </td>
                        <td>
                          <small className="text-muted">
                            {device.metrics?.lastSeen 
                              ? new Date(device.metrics.lastSeen).toLocaleString()
                              : 'Never'
                            }
                          </small>
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
    </Container>
  );
};

export default Metrics;