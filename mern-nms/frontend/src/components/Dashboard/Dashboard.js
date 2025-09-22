import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatTimestamp, getSeverityBadge } from '../../utils/common';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalDevices: 0,
    activeDevices: 0,
    inactiveDevices: 0,
    criticalAlerts: 0,
    warningAlerts: 0,
    infoAlerts: 0,
    networkHealth: 95,
    totalBandwidth: 0,
    dataTransferred: 0,
    avgResponseTime: 0,
    uptime: 99.8
  });
  
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topDevices, setTopDevices] = useState([]);
  const [systemInfo, setSystemInfo] = useState({
    serverUptime: '2d 14h 32m',
    memoryUsage: 67,
    cpuUsage: 23,
    diskUsage: 45,
    activeSessions: 3
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const { socket, connected, realTimeData, subscribe } = useSocket();
  const { user } = useAuth();

  // Real-time data updates
  useEffect(() => {
    if (realTimeData) {
      setStats(prev => ({
        ...prev,
        totalDevices: realTimeData.deviceCount || prev.totalDevices,
        activeDevices: realTimeData.onlineDevices || prev.activeDevices,
        inactiveDevices: (realTimeData.deviceCount || prev.totalDevices) - (realTimeData.onlineDevices || prev.activeDevices),
        criticalAlerts: realTimeData.criticalAlerts || prev.criticalAlerts,
        warningAlerts: realTimeData.warningAlerts || prev.warningAlerts,
        networkHealth: realTimeData.networkHealth || prev.networkHealth
      }));
      
      if (realTimeData.alerts) {
        setRecentAlerts(realTimeData.alerts.slice(0, 5));
      }
      
      if (realTimeData.activity) {
        setRecentActivity(realTimeData.activity.slice(0, 5));
      }
      
      setLastUpdated(new Date());
    }
  }, [realTimeData]);

  // Subscribe to real-time events
  useEffect(() => {
    if (socket && connected) {
      const unsubscribe = subscribe([
        'deviceFound',
        'deviceUpdated', 
        'deviceStatusChanged',
        'newAlert',
        'alertUpdated',
        'scanStarted',
        'scanCompleted',
        'systemMetricsUpdated'
      ], (data) => {
        fetchDashboardData();
        setLastUpdated(new Date());
      });

      return unsubscribe;
    }
  }, [socket, connected, subscribe]);

  // Fetch comprehensive dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch multiple endpoints in parallel
      const [devicesRes, alertsRes, metricsRes, activityRes] = await Promise.all([
        api.get('/discovery/devices', { headers }),
        api.get('/alerts', { headers }),
        api.get('/metrics/overview', { headers }),
        api.get('/dashboard/activity/recent', { headers }).catch(() => ({ data: { activities: [] } }))
      ]);
      
      const devices = devicesRes.data.devices || [];
      const alerts = alertsRes.data.alerts || [];
      const metrics = metricsRes.data || {};
      const activities = activityRes.data.activities || [];
      
      // Calculate comprehensive stats
      const activeDevs = devices.filter(d => d.status === 'online' || d.status === 'up');
      const inactiveDevs = devices.filter(d => d.status === 'offline' || d.status === 'down');
      
      const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged);
      const warningAlerts = alerts.filter(a => a.severity === 'warning' && !a.acknowledged);
      const infoAlerts = alerts.filter(a => a.severity === 'info' && !a.acknowledged);
      
      // Calculate network health
      const healthScore = devices.length > 0 ? Math.round((activeDevs.length / devices.length) * 100) : 100;
      
      // Calculate average response time
      const avgResponse = devices.reduce((sum, d) => sum + (d.metrics?.responseTime || 0), 0) / (devices.length || 1);
      
      setStats({
        totalDevices: devices.length,
        activeDevices: activeDevs.length,
        inactiveDevices: inactiveDevs.length,
        criticalAlerts: criticalAlerts.length,
        warningAlerts: warningAlerts.length,
        infoAlerts: infoAlerts.length,
        networkHealth: healthScore,
        totalBandwidth: metrics.totalBandwidth || 0,
        dataTransferred: metrics.dataTransferred || 0,
        avgResponseTime: Math.round(avgResponse),
        uptime: metrics.uptime || 99.8
      });
      
      setRecentAlerts(alerts.slice(0, 5));
      setRecentActivity(activities.slice(0, 5));
      
      // Set top devices by utilization
      const sortedDevices = devices
        .filter(d => d.metrics?.networkUtilization)
        .sort((a, b) => (b.metrics.networkUtilization || 0) - (a.metrics.networkUtilization || 0))
        .slice(0, 5);
      setTopDevices(sortedDevices);
      
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const getHealthColor = (percentage) => {
    if (percentage >= 95) return 'success';
    if (percentage >= 80) return 'warning';
    return 'danger';
  };

  const renderMetricCard = (title, value, unit, icon, color = 'primary', subtitle = null) => (
    <Card className="bg-dark border-secondary h-100 metric-card">
      <Card.Body>
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0">
            <div className={`bg-${color} bg-opacity-20 rounded-circle p-3`}>
              <i className={`${icon} text-${color} fs-4`}></i>
            </div>
          </div>
          <div className="flex-grow-1 ms-3">
            <h3 className="text-white mb-1">{value}{unit}</h3>
            <p className="text-muted mb-0">{title}</p>
            {subtitle && <small className="text-muted">{subtitle}</small>}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  if (loading && stats.totalDevices === 0) {
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
                <i className="fas fa-tachometer-alt me-2 text-primary"></i>
                Network Operations Dashboard
              </h2>
              <p className="text-muted mb-0">Real-time network monitoring and management overview</p>
            </div>
            <div className="d-flex align-items-center">
              {connected ? (
                <Badge bg="success" className="me-3">
                  <i className="fas fa-circle me-1"></i>
                  Live
                </Badge>
              ) : (
                <Badge bg="danger" className="me-3">
                  <i className="fas fa-circle me-1"></i>
                  Disconnected
                </Badge>
              )}
              {lastUpdated && (
                <small className="text-muted me-3">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </small>
              )}
              <Button variant="outline-light" size="sm" onClick={fetchDashboardData} disabled={loading}>
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

      {/* Key Metrics Row */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard('Total Devices', stats.totalDevices, '', 'fas fa-server', 'primary')}
        </Col>
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard('Active Devices', stats.activeDevices, '', 'fas fa-check-circle', 'success')}
        </Col>
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard('Critical Alerts', stats.criticalAlerts, '', 'fas fa-exclamation-triangle', 'danger')}
        </Col>
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard('Network Health', stats.networkHealth, '%', 'fas fa-heartbeat', getHealthColor(stats.networkHealth))}
        </Col>
      </Row>

      {/* Performance Metrics Row */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard('Avg Response', stats.avgResponseTime, 'ms', 'fas fa-clock', 'info')}
        </Col>
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard('System Uptime', stats.uptime, '%', 'fas fa-arrow-up', 'success')}
        </Col>
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard('Warning Alerts', stats.warningAlerts, '', 'fas fa-exclamation-circle', 'warning')}
        </Col>
        <Col lg={3} md={6} className="mb-3">
          {renderMetricCard('Inactive Devices', stats.inactiveDevices, '', 'fas fa-times-circle', 'secondary')}
        </Col>
      </Row>

      {/* System Information Row */}
      <Row className="mb-4">
        <Col lg={6} className="mb-3">
          <Card className="bg-dark border-secondary h-100">
            <Card.Header className="bg-dark border-secondary">
              <h5 className="mb-0 text-white">
                <i className="fas fa-server me-2 text-primary"></i>
                System Status
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col sm={6} className="mb-3">
                  <div className="text-white mb-1">Server Uptime</div>
                  <div className="text-success h5">{systemInfo.serverUptime}</div>
                </Col>
                <Col sm={6} className="mb-3">
                  <div className="text-white mb-1">Active Sessions</div>
                  <div className="text-info h5">{systemInfo.activeSessions}</div>
                </Col>
              </Row>
              <Row>
                <Col sm={4} className="mb-2">
                  <div className="text-muted small">Memory Usage</div>
                  <ProgressBar 
                    variant={systemInfo.memoryUsage > 80 ? 'danger' : 'primary'} 
                    now={systemInfo.memoryUsage} 
                    label={`${systemInfo.memoryUsage}%`}
                  />
                </Col>
                <Col sm={4} className="mb-2">
                  <div className="text-muted small">CPU Usage</div>
                  <ProgressBar 
                    variant={systemInfo.cpuUsage > 80 ? 'danger' : 'success'} 
                    now={systemInfo.cpuUsage} 
                    label={`${systemInfo.cpuUsage}%`}
                  />
                </Col>
                <Col sm={4} className="mb-2">
                  <div className="text-muted small">Disk Usage</div>
                  <ProgressBar 
                    variant={systemInfo.diskUsage > 80 ? 'warning' : 'info'} 
                    now={systemInfo.diskUsage} 
                    label={`${systemInfo.diskUsage}%`}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6} className="mb-3">
          <Card className="bg-dark border-secondary h-100">
            <Card.Header className="bg-dark border-secondary">
              <h5 className="mb-0 text-white">
                <i className="fas fa-chart-line me-2 text-success"></i>
                Top Devices by Utilization
              </h5>
            </Card.Header>
            <Card.Body>
              {topDevices.length > 0 ? (
                <Table variant="dark" size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>IP Address</th>
                      <th>Utilization</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDevices.map((device, index) => (
                      <tr key={device._id || index}>
                        <td>
                          <div className="text-white">{device.name || device.hostname || 'Unknown'}</div>
                        </td>
                        <td>
                          <code className="text-info">{device.ipAddress || device.ip}</code>
                        </td>
                        <td>
                          <ProgressBar 
                            variant="warning" 
                            now={device.metrics?.networkUtilization || 0} 
                            size="sm"
                            label={`${device.metrics?.networkUtilization || 0}%`}
                          />
                        </td>
                        <td>
                          <Badge bg={device.status === 'online' ? 'success' : 'danger'}>
                            {device.status || 'unknown'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center text-muted py-3">
                  <i className="fas fa-chart-line fs-2 mb-2"></i>
                  <p>No device utilization data available</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Alerts and Activity */}
      <Row>
        <Col lg={6} className="mb-3">
          <Card className="bg-dark border-secondary h-100">
            <Card.Header className="bg-dark border-secondary d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-white">
                <i className="fas fa-bell me-2 text-warning"></i>
                Recent Alerts
              </h5>
              <Badge bg="secondary">{recentAlerts.length}</Badge>
            </Card.Header>
            <Card.Body>
              {recentAlerts.length > 0 ? (
                <div className="alert-list">
                  {recentAlerts.map((alert, index) => (
                    <div key={alert._id || index} className="border-bottom border-secondary pb-2 mb-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            {getSeverityBadge(alert.severity)}
                            <span className="text-white ms-2">{alert.message || alert.type}</span>
                          </div>
                          <small className="text-muted">
                            {alert.deviceName && `${alert.deviceName} • `}
                            {formatTimestamp(alert.timestamp)}
                          </small>
                        </div>
                        {!alert.acknowledged && (
                          <Button variant="outline-warning" size="sm">
                            <i className="fas fa-check"></i>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-3">
                  <i className="fas fa-check-circle fs-2 mb-2 text-success"></i>
                  <p>No recent alerts</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6} className="mb-3">
          <Card className="bg-dark border-secondary h-100">
            <Card.Header className="bg-dark border-secondary">
              <h5 className="mb-0 text-white">
                <i className="fas fa-history me-2 text-info"></i>
                Recent Activity
              </h5>
            </Card.Header>
            <Card.Body>
              {recentActivity.length > 0 ? (
                <div className="activity-list">
                  {recentActivity.map((activity, index) => (
                    <div key={activity._id || index} className="border-bottom border-secondary pb-2 mb-2">
                      <div className="d-flex align-items-center">
                        <div className="flex-shrink-0">
                          <i className={`fas ${activity.icon || 'fa-info-circle'} text-${activity.type === 'success' ? 'success' : activity.type === 'error' ? 'danger' : 'info'}`}></i>
                        </div>
                        <div className="flex-grow-1 ms-2">
                          <div className="text-white">{activity.message || activity.action}</div>
                          <small className="text-muted">
                            {activity.user && `by ${activity.user} • `}
                            {formatTimestamp(activity.timestamp)}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-3">
                  <i className="fas fa-history fs-2 mb-2"></i>
                  <p>No recent activity</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
