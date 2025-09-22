import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Modal, Form, ButtonGroup, InputGroup, Pagination } from 'react-bootstrap';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const Alerts = () => {
  const { socket, connected } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [alertsPerPage] = useState(10);

  const [alertStats, setAlertStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    acknowledged: 0,
    resolved: 0
  });

  // Load alerts on component mount
  useEffect(() => {
    loadAlerts();
    
    // Refresh alerts every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket event listeners for real-time alerts
  useEffect(() => {
    if (socket && connected) {
      socket.on('newAlert', (alert) => {
        setAlerts(prev => [alert, ...prev]);
        updateAlertStats([alert, ...alerts]);
      });

      socket.on('alertUpdated', (updatedAlert) => {
        setAlerts(prev => prev.map(alert => 
          alert._id === updatedAlert._id ? updatedAlert : alert
        ));
      });

      socket.on('alertResolved', (alertId) => {
        setAlerts(prev => prev.map(alert => 
          alert._id === alertId ? { ...alert, status: 'resolved', resolvedAt: new Date() } : alert
        ));
      });

      return () => {
        socket.off('newAlert');
        socket.off('alertUpdated');
        socket.off('alertResolved');
      };
    }
  }, [socket, connected, alerts]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await api.get('/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const alertsData = response.data || [];
      setAlerts(alertsData);
      updateAlertStats(alertsData);
      
    } catch (error) {
      console.error('Error loading alerts:', error);
      setMessage({ type: 'danger', text: 'Failed to load alerts' });
      
      // Set mock data if API fails
      const mockAlerts = generateMockAlerts();
      setAlerts(mockAlerts);
      updateAlertStats(mockAlerts);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAlerts = () => {
    const devices = ['192.168.1.1', '192.168.1.10', '192.168.1.50', '192.168.1.100'];
    const severities = ['critical', 'warning', 'info'];
    const types = ['CPU Usage High', 'Memory Usage High', 'Disk Space Low', 'Interface Down', 'Response Time High', 'Device Unreachable'];
    
    return Array.from({ length: 15 }, (_, index) => ({
      _id: `alert_${index}`,
      severity: severities[Math.floor(Math.random() * severities.length)],
      type: types[Math.floor(Math.random() * types.length)],
      message: `Alert message for device ${devices[Math.floor(Math.random() * devices.length)]}`,
      deviceIp: devices[Math.floor(Math.random() * devices.length)],
      status: Math.random() > 0.7 ? 'resolved' : Math.random() > 0.5 ? 'acknowledged' : 'active',
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      value: Math.floor(Math.random() * 100),
      threshold: 80,
      acknowledgedBy: Math.random() > 0.5 ? 'admin' : null,
      acknowledgedAt: Math.random() > 0.5 ? new Date() : null
    }));
  };

  const updateAlertStats = (alertsData) => {
    const stats = {
      total: alertsData.length,
      critical: alertsData.filter(a => a.severity === 'critical').length,
      warning: alertsData.filter(a => a.severity === 'warning').length,
      info: alertsData.filter(a => a.severity === 'info').length,
      acknowledged: alertsData.filter(a => a.status === 'acknowledged').length,
      resolved: alertsData.filter(a => a.status === 'resolved').length
    };
    setAlertStats(stats);
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await api.put(`/alerts/${alertId}/acknowledge`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setAlerts(prev => prev.map(alert => 
        alert._id === alertId 
          ? { ...alert, status: 'acknowledged', acknowledgedBy: 'current_user', acknowledgedAt: new Date() }
          : alert
      ));
      
      setMessage({ type: 'success', text: 'Alert acknowledged successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      setMessage({ type: 'danger', text: 'Failed to acknowledge alert' });
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await api.put(`/alerts/${alertId}/resolve`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setAlerts(prev => prev.map(alert => 
        alert._id === alertId 
          ? { ...alert, status: 'resolved', resolvedAt: new Date() }
          : alert
      ));
      
      setMessage({ type: 'success', text: 'Alert resolved successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      console.error('Error resolving alert:', error);
      setMessage({ type: 'danger', text: 'Failed to resolve alert' });
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/alerts/${alertId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setAlerts(prev => prev.filter(alert => alert._id !== alertId));
      setMessage({ type: 'success', text: 'Alert deleted successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      console.error('Error deleting alert:', error);
      setMessage({ type: 'danger', text: 'Failed to delete alert' });
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <Badge bg="danger">Critical</Badge>;
      case 'warning':
        return <Badge bg="warning">Warning</Badge>;
      case 'info':
        return <Badge bg="info">Info</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge bg="danger">Active</Badge>;
      case 'acknowledged':
        return <Badge bg="warning">Acknowledged</Badge>;
      case 'resolved':
        return <Badge bg="success">Resolved</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return 'fas fa-exclamation-circle text-danger';
      case 'warning':
        return 'fas fa-exclamation-triangle text-warning';
      case 'info':
        return 'fas fa-info-circle text-info';
      default:
        return 'fas fa-question-circle text-secondary';
    }
  };

  // Filter and search alerts
  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.deviceIp.includes(searchTerm);
    
    return matchesSeverity && matchesStatus && matchesSearch;
  });

  // Pagination
  const indexOfLastAlert = currentPage * alertsPerPage;
  const indexOfFirstAlert = indexOfLastAlert - alertsPerPage;
  const currentAlerts = filteredAlerts.slice(indexOfFirstAlert, indexOfLastAlert);
  const totalPages = Math.ceil(filteredAlerts.length / alertsPerPage);

  const handleBulkAction = async (action) => {
    try {
      const token = localStorage.getItem('token');
      
      for (const alertId of selectedAlerts) {
        if (action === 'acknowledge') {
          await acknowledgeAlert(alertId);
        } else if (action === 'resolve') {
          await resolveAlert(alertId);
        } else if (action === 'delete') {
          await deleteAlert(alertId);
        }
      }
      
      setSelectedAlerts([]);
      setShowBulkActions(false);
      
    } catch (error) {
      setMessage({ type: 'danger', text: `Failed to perform bulk ${action}` });
    }
  };

  return (
    <Container fluid className="p-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-white mb-1">
                <i className="fas fa-bell me-2 text-warning"></i>
                Network Alerts
              </h2>
              <p className="text-muted mb-0">Monitor and manage network alerts and notifications</p>
            </div>
            <div className="d-flex align-items-center">
              <Badge bg={connected ? 'success' : 'danger'} className="me-3">
                <i className="fas fa-circle me-1"></i>
                {connected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Button variant="outline-primary" size="sm" onClick={loadAlerts}>
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
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

      {/* Alert Statistics */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Body>
              <Row className="text-center">
                <Col md={2}>
                  <div className="text-primary h4">{alertStats.total}</div>
                  <small className="text-muted">Total Alerts</small>
                </Col>
                <Col md={2}>
                  <div className="text-danger h4">{alertStats.critical}</div>
                  <small className="text-muted">Critical</small>
                </Col>
                <Col md={2}>
                  <div className="text-warning h4">{alertStats.warning}</div>
                  <small className="text-muted">Warning</small>
                </Col>
                <Col md={2}>
                  <div className="text-info h4">{alertStats.info}</div>
                  <small className="text-muted">Info</small>
                </Col>
                <Col md={2}>
                  <div className="text-secondary h4">{alertStats.acknowledged}</div>
                  <small className="text-muted">Acknowledged</small>
                </Col>
                <Col md={2}>
                  <div className="text-success h4">{alertStats.resolved}</div>
                  <small className="text-muted">Resolved</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters and Search */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Body>
              <Row className="align-items-center">
                <Col md={3}>
                  <Form.Label className="text-white me-2">Severity:</Form.Label>
                  <Form.Select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    size="sm"
                    className="bg-dark text-white border-secondary"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-white me-2">Status:</Form.Label>
                  <Form.Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    size="sm"
                    className="bg-dark text-white border-secondary"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="resolved">Resolved</option>
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label className="text-white">Search:</Form.Label>
                  <InputGroup size="sm">
                    <Form.Control
                      type="text"
                      placeholder="Search alerts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-dark text-white border-secondary"
                    />
                    <Button variant="outline-secondary">
                      <i className="fas fa-search"></i>
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={2}>
                  {selectedAlerts.length > 0 && (
                    <Button 
                      variant="outline-warning" 
                      size="sm"
                      onClick={() => setShowBulkActions(true)}
                    >
                      <i className="fas fa-tasks me-1"></i>
                      Bulk Actions
                    </Button>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alerts Table */}
      <Row>
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Header className="bg-dark border-secondary">
              <h5 className="mb-0 text-white">
                <i className="fas fa-list me-2"></i>
                Alerts ({filteredAlerts.length})
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status"></div>
                  <p className="text-muted">Loading alerts...</p>
                </div>
              ) : currentAlerts.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="fas fa-bell-slash fa-3x mb-3 opacity-25"></i>
                  <p>No alerts found</p>
                  <p className="small">No alerts match your current filters</p>
                </div>
              ) : (
                <>
                  <Table responsive className="table-dark table-hover mb-0">
                    <thead>
                      <tr>
                        <th>
                          <Form.Check
                            type="checkbox"
                            checked={selectedAlerts.length === currentAlerts.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAlerts(currentAlerts.map(a => a._id));
                              } else {
                                setSelectedAlerts([]);
                              }
                            }}
                          />
                        </th>
                        <th>Severity</th>
                        <th>Type</th>
                        <th>Device</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Time</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAlerts.map((alert) => (
                        <tr key={alert._id}>
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={selectedAlerts.includes(alert._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAlerts(prev => [...prev, alert._id]);
                                } else {
                                  setSelectedAlerts(prev => prev.filter(id => id !== alert._id));
                                }
                              }}
                            />
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <i className={`${getSeverityIcon(alert.severity)} me-2`}></i>
                              {getSeverityBadge(alert.severity)}
                            </div>
                          </td>
                          <td className="text-white">{alert.type}</td>
                          <td className="text-white">{alert.deviceIp}</td>
                          <td className="text-white" style={{ maxWidth: '300px' }}>
                            <div className="text-truncate" title={alert.message}>
                              {alert.message}
                            </div>
                          </td>
                          <td>{getStatusBadge(alert.status)}</td>
                          <td className="text-white small">
                            {new Date(alert.timestamp).toLocaleString()}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => {
                                  setSelectedAlert(alert);
                                  setShowDetailsModal(true);
                                }}
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                              {alert.status === 'active' && (
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => acknowledgeAlert(alert._id)}
                                >
                                  <i className="fas fa-check"></i>
                                </Button>
                              )}
                              {(alert.status === 'active' || alert.status === 'acknowledged') && (
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => resolveAlert(alert._id)}
                                >
                                  <i className="fas fa-check-double"></i>
                                </Button>
                              )}
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => deleteAlert(alert._id)}
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center p-3">
                      <Pagination className="mb-0">
                        <Pagination.Prev 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        />
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = currentPage <= 3 ? i + 1 : 
                                     currentPage >= totalPages - 2 ? totalPages - 4 + i :
                                     currentPage - 2 + i;
                          
                          return (
                            <Pagination.Item
                              key={page}
                              active={page === currentPage}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Pagination.Item>
                          );
                        })}
                        
                        <Pagination.Next 
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        />
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alert Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title className="text-white">Alert Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          {selectedAlert && (
            <Row>
              <Col md={6}>
                <Table className="table-dark table-sm">
                  <tbody>
                    <tr>
                      <td>Severity:</td>
                      <td>{getSeverityBadge(selectedAlert.severity)}</td>
                    </tr>
                    <tr>
                      <td>Status:</td>
                      <td>{getStatusBadge(selectedAlert.status)}</td>
                    </tr>
                    <tr>
                      <td>Type:</td>
                      <td>{selectedAlert.type}</td>
                    </tr>
                    <tr>
                      <td>Device IP:</td>
                      <td>{selectedAlert.deviceIp}</td>
                    </tr>
                    <tr>
                      <td>Timestamp:</td>
                      <td>{new Date(selectedAlert.timestamp).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                <Table className="table-dark table-sm">
                  <tbody>
                    <tr>
                      <td>Value:</td>
                      <td>{selectedAlert.value}</td>
                    </tr>
                    <tr>
                      <td>Threshold:</td>
                      <td>{selectedAlert.threshold}</td>
                    </tr>
                    <tr>
                      <td>Acknowledged By:</td>
                      <td>{selectedAlert.acknowledgedBy || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Acknowledged At:</td>
                      <td>{selectedAlert.acknowledgedAt ? new Date(selectedAlert.acknowledgedAt).toLocaleString() : 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Resolved At:</td>
                      <td>{selectedAlert.resolvedAt ? new Date(selectedAlert.resolvedAt).toLocaleString() : 'N/A'}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col xs={12}>
                <h6 className="mt-3">Message:</h6>
                <p className="border border-secondary p-3 rounded bg-dark">
                  {selectedAlert.message}
                </p>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Actions Modal */}
      <Modal show={showBulkActions} onHide={() => setShowBulkActions(false)} centered>
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title className="text-white">Bulk Actions</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <p>Selected {selectedAlerts.length} alert(s). Choose an action:</p>
          <div className="d-grid gap-2">
            <Button variant="warning" onClick={() => handleBulkAction('acknowledge')}>
              <i className="fas fa-check me-2"></i>
              Acknowledge All
            </Button>
            <Button variant="success" onClick={() => handleBulkAction('resolve')}>
              <i className="fas fa-check-double me-2"></i>
              Resolve All
            </Button>
            <Button variant="danger" onClick={() => handleBulkAction('delete')}>
              <i className="fas fa-trash me-2"></i>
              Delete All
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowBulkActions(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Alerts;