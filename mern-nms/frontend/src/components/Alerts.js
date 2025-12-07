import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Modal, Form, ButtonGroup, InputGroup, Pagination, Spinner } from 'react-bootstrap';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ErrorHandler from '../utils/ErrorHandler';

const Alerts = () => {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const messageTimeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [alertsPerPage] = useState(10);
  const [error, setError] = useState(null);

  const [alertStats, setAlertStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    acknowledged: 0,
    resolved: 0
  });

  // Cleanup function for message timeouts
  const clearMessageTimeout = useCallback(() => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }
  }, []);

  // Enhanced message display with auto-clear
  const showMessage = useCallback((type, text, duration = 5000) => {
    clearMessageTimeout();
    setMessage({ type, text });
    
    if (duration > 0) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, duration);
    }
  }, [clearMessageTimeout]);

  // Load alerts on component mount
  useEffect(() => {
    loadAlerts();
    
    // Refresh alerts every 30 seconds
    intervalRef.current = setInterval(loadAlerts, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearMessageTimeout();
    };
  }, [clearMessageTimeout]);

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
      setError(null);
      
      const response = await api.get('/alerts');
      
      // Check if response.data.alerts exists (new API format)
      const alertsData = response.data.alerts || response.data || [];
      
      if (!Array.isArray(alertsData)) {
        throw new Error('Invalid alerts data format received from server');
      }
      
      setAlerts(alertsData);
      updateAlertStats(alertsData);
      
      // Also update stats from API if provided
      if (response.data.statistics) {
        const apiStats = response.data.statistics;
        setAlertStats({
          total: apiStats.totalAlerts || 0,
          critical: apiStats.criticalAlerts || 0,
          warning: apiStats.warningAlerts || 0,
          info: apiStats.infoAlerts || 0,
          acknowledged: apiStats.acknowledgedAlerts || 0,
          resolved: apiStats.unacknowledgedAlerts || 0
        });
      }
      
    } catch (error) {
      console.error('Error loading alerts:', error);
      const errorMessage = ErrorHandler.getErrorMessage(error);
      setError(`Failed to load alerts: ${errorMessage}`);
      showMessage('danger', `Failed to load alerts: ${errorMessage}`);
      
      // Set empty state on error
      setAlerts([]);
      setAlertStats({
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
        acknowledged: 0,
        resolved: 0
      });
    } finally {
      setLoading(false);
    }
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
    if (!alertId) {
      showMessage('danger', 'Invalid alert ID');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [`ack_${alertId}`]: true }));
      setError(null);
      
      await api.post('/alerts/acknowledge', {
        alertIds: [alertId],
        acknowledgedBy: user?.username || 'Unknown User'
      });
      
      setAlerts(prev => prev.map(alert => 
        alert._id === alertId || alert.alertId === alertId
          ? { 
              ...alert, 
              acknowledged: true,
              acknowledgedBy: user?.username || 'Unknown User', 
              acknowledgedAt: new Date().toISOString()
            }
          : alert
      ));
      
      showMessage('success', 'Alert acknowledged successfully');
      
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      const errorMessage = ErrorHandler.getErrorMessage(error);
      showMessage('danger', `Failed to acknowledge alert: ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`ack_${alertId}`]: false }));
    }
  };

  const resolveAlert = async (alertId) => {
    if (!alertId) {
      showMessage('danger', 'Invalid alert ID');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [`resolve_${alertId}`]: true }));
      setError(null);
      
      await api.put(`/alerts/${alertId}/resolve`);
      
      setAlerts(prev => prev.map(alert => 
        alert._id === alertId || alert.alertId === alertId
          ? { 
              ...alert, 
              status: 'resolved', 
              resolvedAt: new Date().toISOString(),
              resolvedBy: user?.username || 'Unknown User'
            }
          : alert
      ));
      
      showMessage('success', 'Alert resolved successfully');
      
    } catch (error) {
      console.error('Error resolving alert:', error);
      const errorMessage = ErrorHandler.getErrorMessage(error);
      showMessage('danger', `Failed to resolve alert: ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`resolve_${alertId}`]: false }));
    }
  };

  const deleteAlert = async (alertId) => {
    if (!alertId) {
      showMessage('danger', 'Invalid alert ID');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this alert? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [`delete_${alertId}`]: true }));
      setError(null);
      
      await api.delete(`/alerts/${alertId}`);
      
      setAlerts(prev => prev.filter(alert => 
        alert._id !== alertId && alert.alertId !== alertId
      ));
      
      showMessage('success', 'Alert deleted successfully');
      
    } catch (error) {
      console.error('Error deleting alert:', error);
      const errorMessage = ErrorHandler.getErrorMessage(error);
      showMessage('danger', `Failed to delete alert: ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete_${alertId}`]: false }));
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
    if (!selectedAlerts.length) {
      showMessage('warning', 'No alerts selected for bulk action');
      return;
    }

    if (action === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedAlerts.length} alert(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [`bulk_${action}`]: true }));
      setError(null);
      
      if (action === 'acknowledge') {
        await api.post('/alerts/acknowledge', {
          alertIds: selectedAlerts,
          acknowledgedBy: user?.username || 'Unknown User'
        });
        
        setAlerts(prev => prev.map(alert => 
          selectedAlerts.includes(alert._id) || selectedAlerts.includes(alert.alertId)
            ? { 
                ...alert, 
                acknowledged: true,
                acknowledgedBy: user?.username || 'Unknown User', 
                acknowledgedAt: new Date().toISOString()
              }
            : alert
        ));
        showMessage('success', `${selectedAlerts.length} alert(s) acknowledged successfully`);
        
      } else if (action === 'delete') {
        // For bulk delete, we need to handle it differently
        const deletePromises = selectedAlerts.map(alertId => 
          api.delete(`/alerts/${alertId}`)
        );
        await Promise.allSettled(deletePromises);
        
        setAlerts(prev => prev.filter(alert => 
          !selectedAlerts.includes(alert._id) && !selectedAlerts.includes(alert.alertId)
        ));
        showMessage('success', `${selectedAlerts.length} alert(s) deleted successfully`);
      }
      
      setSelectedAlerts([]);
      setShowBulkActions(false);
      
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      const errorMessage = ErrorHandler.getErrorMessage(error);
      showMessage('danger', `Failed to perform bulk ${action}: ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`bulk_${action}`]: false }));
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
                <i className="fas fa-bell me-2 text-primary"></i>
                Network Alerts
              </h2>
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
                                  disabled={actionLoading[`ack_${alert._id}`]}
                                  onClick={() => acknowledgeAlert(alert._id)}
                                >
                                  {actionLoading[`ack_${alert._id}`] ? (
                                    <Spinner as="span" animation="border" size="sm" />
                                  ) : (
                                    <i className="fas fa-check"></i>
                                  )}
                                </Button>
                              )}
                              {(alert.status === 'active' || alert.status === 'acknowledged') && (
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  disabled={actionLoading[`resolve_${alert._id}`]}
                                  onClick={() => resolveAlert(alert._id)}
                                >
                                  {actionLoading[`resolve_${alert._id}`] ? (
                                    <Spinner as="span" animation="border" size="sm" />
                                  ) : (
                                    <i className="fas fa-check-double"></i>
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="outline-danger"
                                size="sm"
                                disabled={actionLoading[`delete_${alert._id}`]}
                                onClick={() => deleteAlert(alert._id)}
                              >
                                {actionLoading[`delete_${alert._id}`] ? (
                                  <Spinner as="span" animation="border" size="sm" />
                                ) : (
                                  <i className="fas fa-trash"></i>
                                )}
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
            <Button 
              variant="warning" 
              disabled={actionLoading.bulk_acknowledge}
              onClick={() => handleBulkAction('acknowledge')}
            >
              {actionLoading.bulk_acknowledge ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Acknowledging...
                </>
              ) : (
                <>
                  <i className="fas fa-check me-2"></i>
                  Acknowledge All
                </>
              )}
            </Button>
            <Button 
              variant="danger" 
              disabled={actionLoading.bulk_delete}
              onClick={() => handleBulkAction('delete')}
            >
              {actionLoading.bulk_delete ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <i className="fas fa-trash me-2"></i>
                  Delete All
                </>
              )}
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