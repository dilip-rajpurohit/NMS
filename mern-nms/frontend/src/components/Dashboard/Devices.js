import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { socket, connected, realTimeData, subscribe } = useSocket();

  // Real-time data updates
  useEffect(() => {
    if (realTimeData && realTimeData.devices) {
      setDevices(realTimeData.devices);
      setLastUpdated(new Date());
    }
  }, [realTimeData]);

  // Subscribe to real-time device events
  useEffect(() => {
    if (socket && connected) {
      const unsubscribe = subscribe([
        'deviceFound',
        'deviceUpdated',
        'deviceStatusChanged',
        'deviceDeleted'
      ], (data) => {
        // Handle individual device updates
        if (data.type === 'deviceFound' || data.type === 'deviceUpdated') {
          setDevices(prev => {
            const existing = prev.find(d => d._id === data.device._id);
            if (existing) {
              return prev.map(d => d._id === data.device._id ? { ...d, ...data.device } : d);
            } else {
              return [...prev, data.device];
            }
          });
        } else if (data.type === 'deviceDeleted') {
          setDevices(prev => prev.filter(d => d._id !== data.deviceId));
        }
        setLastUpdated(new Date());
      });

      return unsubscribe;
    }
  }, [socket, connected, subscribe]);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/discovery/devices');
      const devicesData = response.data.devices || [];
      setDevices(devicesData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load devices');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'up': return <Badge bg="success">Online</Badge>;
      case 'down': return <Badge bg="danger">Offline</Badge>;
      case 'warning': return <Badge bg="warning">Warning</Badge>;
      default: return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'router': return 'fas fa-route';
      case 'switch': return 'fas fa-network-wired';
      case 'host': return 'fas fa-desktop';
      case 'server': return 'fas fa-server';
      default: return 'fas fa-question-circle';
    }
  };

  if (loading) {
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
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1 text-white">Device Management</h2>
              <p className="text-muted mb-0">Monitor and manage network devices in real-time</p>
            </div>
            <div className="d-flex align-items-center">
              {connected ? (
                <span className="badge bg-success me-3">
                  <i className="fas fa-circle me-1"></i>
                  Connected
                </span>
              ) : (
                <span className="badge bg-danger me-3">
                  <i className="fas fa-circle me-1"></i>
                  Disconnected
                </span>
              )}
              {lastUpdated && (
                <small className="text-muted me-3">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </small>
              )}
              <Button variant="outline-light" size="sm" onClick={fetchDevices} disabled={loading}>
                <i className="fas fa-sync-alt me-2"></i>
                Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Header className="bg-dark border-secondary d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-white">
                <i className="fas fa-server me-2 text-primary"></i>
                Network Devices ({devices.length})
              </h5>
              <Badge bg={devices.length > 0 ? 'success' : 'secondary'}>
                {devices.length} devices discovered
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {devices.length === 0 ? (
                <div className="text-center p-5">
                  <i className="fas fa-search fs-1 text-muted mb-3"></i>
                  <p className="text-muted">No devices found</p>
                  <small className="text-muted">Run discovery to find network devices</small>
                </div>
              ) : (
                <Table responsive hover variant="dark" className="mb-0">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Type</th>
                      <th>IP Address</th>
                      <th>Status</th>
                      <th>Last Seen</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device) => (
                      <tr key={device._id || device.ip}>
                        <td>
                          <div className="d-flex align-items-center">
                            <i className={`${getTypeIcon(device.type)} me-2 text-primary`}></i>
                            <div>
                              <div className="fw-medium text-white">{device.name || device.hostname || device.ip}</div>
                              {device.description && (
                                <small className="text-muted">{device.description}</small>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-capitalize text-white">
                            {device.type || 'Unknown'}
                          </span>
                        </td>
                        <td>
                          <code className="text-info">{device.ip}</code>
                        </td>
                        <td>
                          {getStatusBadge(device.status)}
                        </td>
                        <td>
                          <small className="text-muted">
                            {device.lastSeen 
                              ? new Date(device.lastSeen).toLocaleString()
                              : 'Never'
                            }
                          </small>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <Button variant="outline-info" size="sm" title="View Details">
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button variant="outline-warning" size="sm" title="Edit">
                              <i className="fas fa-edit"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Devices;