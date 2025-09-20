import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Alert } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { getSeverityBadge, formatTimestamp } from '../../utils/common';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { connected } = useSocket();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/devices/alerts');
      setAlerts(response.data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'fas fa-exclamation-circle text-danger';
      case 'warning': return 'fas fa-exclamation-triangle text-warning';
      case 'info': return 'fas fa-info-circle text-info';
      default: return 'fas fa-question-circle text-secondary';
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await api.put(`/api/devices/alerts/${alertId}/acknowledge`);
      fetchAlerts(); // Refresh alerts
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const clearAlert = async (alertId) => {
    try {
      await api.delete(`/api/devices/alerts/${alertId}`);
      fetchAlerts(); // Refresh alerts
    } catch (err) {
      console.error('Error clearing alert:', err);
    }
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Alerts & Events</h2>
              <p className="text-muted mb-0">Monitor system alerts and network events</p>
            </div>
            <Button variant="primary" onClick={fetchAlerts}>
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

      {/* Alert Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-danger bg-opacity-10 rounded p-3">
                    <i className="fas fa-exclamation-circle text-danger fs-4"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1 text-danger">
                    {alerts.filter(a => a.severity === 'critical').length}
                  </h5>
                  <p className="text-muted mb-0">Critical</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-warning bg-opacity-10 rounded p-3">
                    <i className="fas fa-exclamation-triangle text-warning fs-4"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1 text-warning">
                    {alerts.filter(a => a.severity === 'warning').length}
                  </h5>
                  <p className="text-muted mb-0">Warning</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-info bg-opacity-10 rounded p-3">
                    <i className="fas fa-info-circle text-info fs-4"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1 text-info">
                    {alerts.filter(a => a.severity === 'info').length}
                  </h5>
                  <p className="text-muted mb-0">Info</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-primary bg-opacity-10 rounded p-3">
                    <i className="fas fa-list text-primary fs-4"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1 text-primary">{alerts.length}</h5>
                  <p className="text-muted mb-0">Total</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alerts Table */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0">
              <h5 className="mb-0">
                <i className="fas fa-bell me-2"></i>
                Active Alerts ({alerts.length})
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center p-5">
                  <i className="fas fa-check-circle fs-1 text-success mb-3"></i>
                  <h5 className="text-success">No Active Alerts</h5>
                  <p className="text-muted">All systems are running normally</p>
                </div>
              ) : (
                <Table responsive hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Severity</th>
                      <th>Device</th>
                      <th>Message</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, index) => (
                      <tr key={index}>
                        <td>
                          <div className="d-flex align-items-center">
                            <i className={`${getSeverityIcon(alert.severity)} me-2`}></i>
                            {getSeverityBadge(alert.severity)}
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="fw-medium">{alert.device || 'Unknown'}</div>
                            {alert.deviceIp && (
                              <small className="text-muted">{alert.deviceIp}</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="text-wrap" style={{ maxWidth: '300px' }}>
                            {alert.message || 'No message available'}
                          </div>
                        </td>
                        <td>
                          <small className="text-muted">
                            {alert.timestamp 
                              ? new Date(alert.timestamp).toLocaleString()
                              : 'Unknown'
                            }
                          </small>
                        </td>
                        <td>
                          {alert.acknowledged ? (
                            <Badge bg="success">Acknowledged</Badge>
                          ) : (
                            <Badge bg="secondary">New</Badge>
                          )}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            {!alert.acknowledged && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => acknowledgeAlert(alert._id)}
                                title="Acknowledge"
                              >
                                <i className="fas fa-check"></i>
                              </Button>
                            )}
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => clearAlert(alert._id)}
                              title="Clear"
                            >
                              <i className="fas fa-times"></i>
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

export default Alerts;