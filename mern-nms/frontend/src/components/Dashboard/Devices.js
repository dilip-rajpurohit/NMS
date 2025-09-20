import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { connected } = useSocket();

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/devices');
      setDevices(response.data);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Device Management</h2>
              <p className="text-muted mb-0">Monitor and manage network devices</p>
            </div>
            <Button variant="primary" onClick={fetchDevices}>
              <i className="fas fa-sync-alt me-2"></i>
              Refresh
            </Button>
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
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0">
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Device List ({devices.length})
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center p-5">
                  <i className="fas fa-search fs-1 text-muted mb-3"></i>
                  <p className="text-muted">No devices found</p>
                  <small className="text-muted">Run discovery to find network devices</small>
                </div>
              ) : (
                <Table responsive hover className="mb-0">
                  <thead className="table-light">
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
                      <tr key={device._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <i className={`${getTypeIcon(device.type)} me-2 text-primary`}></i>
                            <div>
                              <div className="fw-medium">{device.name || device.hostname}</div>
                              {device.description && (
                                <small className="text-muted">{device.description}</small>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-capitalize">
                            {device.type || 'Unknown'}
                          </span>
                        </td>
                        <td>
                          <code>{device.ip}</code>
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
                            <Button variant="outline-primary" size="sm">
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button variant="outline-secondary" size="sm">
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