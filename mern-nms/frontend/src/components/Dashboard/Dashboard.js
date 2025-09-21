import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Badge } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatTimestamp, getSeverityBadge } from '../../utils/common';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalDevices: 0,
    activeDevices: 0,
    alerts: 0,
    discoveryStatus: 'idle'
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const { socket, connected } = useSocket();
  const { user } = useAuth();

  // Fetch real dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch actual devices count
      const devicesResponse = await api.get('/discovery/devices');
      const alertsResponse = await api.get('/alerts');
      
      setStats({
        totalDevices: devicesResponse.data.total || 0,
        activeDevices: devicesResponse.data.devices?.filter(d => d.status === 'online').length || 0,
        alerts: alertsResponse.data.alerts?.length || 0,
        discoveryStatus: 'idle'
      });
      
      setRecentAlerts(alertsResponse.data.alerts?.slice(0, 5) || []);
      
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
      // Set empty state on error
      setStats({
        totalDevices: 0,
        activeDevices: 0,
        alerts: 0,
        discoveryStatus: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket || !connected) return;

    const handleDeviceEvent = () => {
      fetchDashboardData();
    };

    const handleDiscoveryFound = () => {
      fetchDashboardData();
    };

    const handleNewAlert = (alert) => {
      setRecentAlerts(prev => [alert, ...prev.slice(0, 4)]);
      setStats(prev => ({ ...prev, alerts: prev.alerts + 1 }));
    };

    socket.on('device.created', handleDeviceEvent);
    socket.on('device.updated', handleDeviceEvent);
    socket.on('device.deleted', handleDeviceEvent);
    socket.on('discovery.deviceFound', handleDiscoveryFound);
    socket.on('new-alert', handleNewAlert);

    return () => {
      socket.off('device.created', handleDeviceEvent);
      socket.off('device.updated', handleDeviceEvent);
      socket.off('device.deleted', handleDeviceEvent);
      socket.off('discovery.deviceFound', handleDiscoveryFound);
      socket.off('new-alert', handleNewAlert);
    };
  }, [socket, connected, fetchDashboardData]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Container fluid className="dashboard fade-in">
      <Row className="mb-4">
        <Col>
          <h2 className="text-white mb-3">
            <i className="fas fa-chart-line me-2 text-primary"></i>
            Network Dashboard
          </h2>
          <div className="d-flex align-items-center mb-3">
            <Badge bg={connected ? 'success' : 'danger'} className="me-2">
              <i className={`fas ${connected ? 'fa-wifi' : 'fa-wifi-slash'} me-1`}></i>
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
            <small className="text-muted">
              Welcome back, {user?.username}
            </small>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Main Stats */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="metric-card h-100">
            <Card.Body className="text-center">
              <div className="text-primary mb-2">
                <i className="fas fa-server fa-2x"></i>
              </div>
              <h3 className="text-white mb-1">{stats.totalDevices}</h3>
              <p className="text-muted mb-0">Total Devices</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="metric-card h-100">
            <Card.Body className="text-center">
              <div className="text-success mb-2">
                <i className="fas fa-check-circle fa-2x"></i>
              </div>
              <h3 className="text-white mb-1">{stats.activeDevices}</h3>
              <p className="text-muted mb-0">Active Devices</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="metric-card h-100">
            <Card.Body className="text-center">
              <div className="text-warning mb-2">
                <i className="fas fa-exclamation-triangle fa-2x"></i>
              </div>
              <h3 className="text-white mb-1">{stats.alerts}</h3>
              <p className="text-muted mb-0">Active Alerts</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="metric-card h-100">
            <Card.Body className="text-center">
              <div className="text-info mb-2">
                <i className="fas fa-search fa-2x"></i>
              </div>
              <h3 className="text-white mb-1">
                {stats.totalDevices - stats.activeDevices}
              </h3>
              <p className="text-muted mb-0">Offline Devices</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Alerts */}
      <Row>
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-bell me-2 text-warning"></i>
                Recent Alerts
              </h5>
            </Card.Header>
            <Card.Body>
              {recentAlerts.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentAlerts.map((alert, index) => (
                    <div key={index} className="list-group-item bg-transparent border-0 px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <Badge 
                            bg={getSeverityBadge(alert.level)}
                            className="me-2"
                          >
                            {alert.level}
                          </Badge>
                          <span className="text-white">{alert.message}</span>
                        </div>
                        <small className="text-muted">
                          {formatTimestamp(alert.timestamp)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <i className="fas fa-check-circle fa-2x mb-2"></i>
                  <p className="mb-0">No recent alerts</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-network-wired me-2 text-info"></i>
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body className="d-flex flex-column">
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => window.location.hash = '#discovery'}
                >
                  <i className="fas fa-search me-2"></i>
                  Start Discovery
                </button>
                <button 
                  className="btn btn-outline-success"
                  onClick={() => window.location.hash = '#topology'}
                >
                  <i className="fas fa-project-diagram me-2"></i>
                  View Topology
                </button>
                <button 
                  className="btn btn-outline-info"
                  onClick={() => window.location.hash = '#devices'}
                >
                  <i className="fas fa-server me-2"></i>
                  Manage Devices
                </button>
              </div>
              
              <div className="mt-auto pt-3">
                <small className="text-muted">
                  Last updated: {new Date().toLocaleTimeString()}
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
