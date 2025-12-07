import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Form, InputGroup, Modal } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import ErrorHandler from '../../utils/ErrorHandler';

const Devices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [deleting, setDeleting] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [addingDevice, setAddingDevice] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view' or 'edit'
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [newDeviceIP, setNewDeviceIP] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [ipValidationError, setIpValidationError] = useState('');
  const successTimeoutRef = useRef(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { socket, connected, realTimeData, subscribe } = useSocket();

  // Real-time data updates
  useEffect(() => {
    if (realTimeData && realTimeData.devices) {
      setDevices(realTimeData.devices);
      setLastUpdated(new Date());
    }
  }, [realTimeData]);

  // Real-time updates are handled by `realTimeData.devices` and the effect above.

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/discovery/devices');
      // Ensure we always get an array
      const devicesData = Array.isArray(response.data.devices) ? response.data.devices : 
                         Array.isArray(response.data) ? response.data : [];
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

  // Filter devices based on search and filters
  useEffect(() => {
    // Ensure devices is always an array
    let filtered = Array.isArray(devices) ? devices : [];

    // Search filter
    if (searchTerm && filtered.length > 0) {
      filtered = filtered.filter(device => 
        (device.name && device.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (device.displayName && device.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (device.ipAddress && device.ipAddress.includes(searchTerm)) ||
        (device.ip && device.ip.includes(searchTerm)) ||
        (device.description && device.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(device => {
        const status = device.status?.toLowerCase();
        if (statusFilter === 'online') {
          return status === 'online' || status === 'up';
        } else if (statusFilter === 'offline') {
          return status === 'offline' || status === 'down';
        }
        return status === statusFilter;
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(device => 
        device.deviceType === typeFilter || device.type === typeFilter
      );
    }

    setFilteredDevices(filtered);
  }, [devices, searchTerm, statusFilter, typeFilter]);

  // Enhanced message display with auto-clear
  const showSuccess = useCallback((message, duration = 4000) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setSuccessMessage(message);
    
    if (duration > 0) {
      successTimeoutRef.current = setTimeout(() => {
        setSuccessMessage('');
      }, duration);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Validate IP address
  const validateIP = useCallback((ip) => {
    const cleanIp = ip.trim();
    
    if (!cleanIp) {
      return 'IP address is required';
    }
    
    // Enhanced IP validation
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(cleanIp)) {
      return 'Please enter a valid IP address (e.g., 192.168.1.100)';
    }

    // Check for common invalid IPs
    if (cleanIp === '0.0.0.0' || cleanIp === '255.255.255.255' || cleanIp.endsWith('.0') || cleanIp.endsWith('.255')) {
      return 'Please enter a valid host IP address (not network or broadcast address)';
    }

    // Check for localhost IPs
    if (cleanIp.startsWith('127.')) {
      return 'Localhost addresses are not allowed for device monitoring';
    }

    return '';
  }, []);

  // Handle IP input change with validation
  const handleIPChange = useCallback((value) => {
    setNewDeviceIP(value);
    const error = validateIP(value);
    setIpValidationError(error);
  }, [validateIP]);

  // Add device function (now uses modal)
  const handleAddDeviceSubmit = async () => {
    const cleanIp = newDeviceIP.trim();
    const cleanName = newDeviceName.trim();
    
    // Validate IP
    const ipError = validateIP(cleanIp);
    if (ipError) {
      setIpValidationError(ipError);
      return;
    }

    setAddingDevice(true);
    
    try {
      setError(null);
      console.log('➕ Adding device:', cleanIp);
      
      // Use the manual discovery endpoint to properly add and discover the device
      const response = await api.post('/discovery/manual', { 
        ipAddress: cleanIp, 
        name: cleanName || undefined,
        snmpCommunity: 'public' 
      }, { timeout: 60000 });
      
      console.log('✅ Manual discovery response:', response);

      if (response.data && response.data.device) {
        showSuccess(`Device ${cleanIp} added successfully! Discovery completed.`);
        
        // Reset form and close modal
        setNewDeviceIP('');
        setNewDeviceName('');
        setIpValidationError('');
        setShowAddDeviceModal(false);
        
        // Refresh device list
        await fetchDevices();
        
      } else {
        throw new Error('Device was not properly created');
      }
    } catch (err) {
      console.error('❌ Add device failed:', err);
      const errorMessage = ErrorHandler.getErrorMessage(err);
      
      if (err.response?.status === 400 && errorMessage.includes('already exists')) {
        setError(`Device ${cleanIp} is already in the system.`);
      } else if (err.response?.status === 400 && (errorMessage.includes('not reachable') || errorMessage.includes('not responding'))) {
        setError(`Device ${cleanIp} is not reachable. Please check:\n• The IP address is correct\n• The device is powered on\n• Your network connection\n• Firewall settings`);
      } else if (err.response?.status === 400 && errorMessage.includes('timeout')) {
        setError(`Connection to ${cleanIp} timed out. The device may be slow to respond or behind a firewall.`);
      } else {
        setError(`Failed to add device: ${errorMessage}`);
      }
    } finally {
      setAddingDevice(false);
    }
  };

  // Open add device modal
  const handleAddDevice = () => {
    setNewDeviceIP('');
    setNewDeviceName('');
    setIpValidationError('');
    setShowAddDeviceModal(true);
  };

  // Delete device function
  const handleDeleteDevice = async (device) => {
    const deviceId = device._id || device.id;
    const deviceName = device.name || device.hostname || device.ip || device.ipAddress || 'Unknown Device';
    
    if (!deviceId) {
      setError('Invalid device ID - cannot delete device');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete device "${deviceName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeleting(prev => ({ ...prev, [deviceId]: true }));
    
    try {
      setError(null);
      
      // Delete device via API
      await api.delete(`/devices/${deviceId}`);
      
      // Remove device from local state
      setDevices(prev => prev.filter(d => (d._id || d.id) !== deviceId));
      
      showSuccess(`Device "${deviceName}" deleted successfully`);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error deleting device:', err);
      const errorMessage = ErrorHandler.getErrorMessage(err);
      setError(`Failed to delete device: ${errorMessage}`);
    } finally {
      setDeleting(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'online':
      case 'up': return <Badge bg="success">Online</Badge>;
      case 'offline':
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
              <h2 className="text-white mb-1">
                <i className="fas fa-microchip me-2 text-primary"></i>
                Device Management
              </h2>
            </div>
            <div className="d-flex align-items-center gap-2">
              {connected ? (
                <Badge bg="success">
                  <i className="fas fa-circle me-1"></i>
                  Connected
                </Badge>
              ) : (
                <Badge bg="danger">
                  <i className="fas fa-circle me-1"></i>
                  Disconnected
                </Badge>
              )}
              {lastUpdated && (
                <small className="text-muted">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </small>
              )}
              <Button 
                variant="success" 
                size="sm" 
                onClick={handleAddDevice}
                disabled={loading || addingDevice}
              >
                {addingDevice ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus me-2"></i>
                    Add Device
                  </>
                )}
              </Button>
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
            <Alert variant="danger" className="bg-danger bg-opacity-20 border-danger text-white" style={{ whiteSpace: 'pre-line' }}>
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {successMessage && (
        <Row className="mb-4">
          <Col>
            <Alert variant="success" className="bg-success bg-opacity-20 border-success text-white">
              <i className="fas fa-check-circle me-2"></i>
              {successMessage}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Filters Section */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Body>
              <Row className="align-items-center">
                <Col md={4}>
                  <Form.Label className="text-white">Search Devices</Form.Label>
                  <InputGroup size="sm">
                    <InputGroup.Text className="bg-dark text-white border-secondary">
                      <i className="fas fa-search"></i>
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search by name, IP, hostname..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-dark text-white border-secondary"
                    />
                    {searchTerm && (
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        title="Clear search"
                      >
                        <i className="fas fa-times"></i>
                      </Button>
                    )}
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-white">Status Filter</Form.Label>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    size="sm"
                    className="bg-dark text-white border-secondary"
                  >
                    <option value="all">All Statuses</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-white">Device Type</Form.Label>
                  <Form.Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    size="sm"
                    className="bg-dark text-white border-secondary"
                  >
                    <option value="all">All Types</option>
                    <option value="router">Router</option>
                    <option value="switch">Switch</option>
                    <option value="server">Server</option>
                    <option value="host">Host/Computer</option>
                    <option value="unknown">Unknown</option>
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Label className="text-white">Results</Form.Label>
                  <div className="text-center">
                    <Badge bg="info" className="fs-6 px-3 py-2">
                      {filteredDevices.length} / {devices.length}
                    </Badge>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Header className="bg-dark border-secondary d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-white">
                <i className="fas fa-server me-2 text-primary"></i>
                Network Devices ({filteredDevices.length})
              </h5>
              <Badge bg={filteredDevices.length > 0 ? 'success' : 'secondary'}>
                {filteredDevices.length} devices {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'found' : 'discovered'}
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {filteredDevices.length === 0 ? (
                <div className="text-center p-5">
                  {devices.length === 0 ? (
                    <>
                      <i className="fas fa-search fs-1 text-muted mb-3"></i>
                      <p className="text-muted">No devices found</p>
                      <small className="text-muted">Click "Add Device" or run discovery to find network devices</small>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-filter fs-1 text-muted mb-3"></i>
                      <p className="text-muted">No devices match your filters</p>
                      <small className="text-muted">Try adjusting your search terms or filters</small>
                    </>
                  )}
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
                    {filteredDevices.map((device) => (
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
                            {device.deviceType || device.type || 'Unknown'}
                          </span>
                        </td>
                        <td>
                          <code className="text-info">{device.ipAddress || device.ip}</code>
                        </td>
                        <td>
                          {getStatusBadge(device.status)}
                        </td>
                        <td>
                          <small className="text-muted">
                            {device.metrics?.lastSeen 
                              ? new Date(device.metrics.lastSeen).toLocaleString()
                              : device.lastSeen 
                              ? new Date(device.lastSeen).toLocaleString()
                              : 'Never'
                            }
                          </small>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button 
                              variant="outline-info" 
                              size="sm" 
                              title="View Details" 
                              onClick={() => { 
                                setSelectedDevice(device); 
                                setModalMode('view'); 
                                setShowDetailsModal(true); 
                              }}
                              className="px-2"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button 
                              variant="outline-warning" 
                              size="sm" 
                              title="Edit" 
                              onClick={() => { 
                                setSelectedDevice(device); 
                                setModalMode('edit'); 
                                setShowDetailsModal(true); 
                              }}
                              className="px-2"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              title="Delete Device"
                              onClick={() => handleDeleteDevice(device)}
                              disabled={deleting[device._id || device.id]}
                              className="px-2"
                            >
                              {deleting[device._id || device.id] ? (
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
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
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Add Device Modal */}
      <Modal show={showAddDeviceModal} onHide={() => setShowAddDeviceModal(false)} centered>
        <Modal.Header closeButton className="bg-dark text-white border-secondary">
          <Modal.Title className="text-white">Add New Device</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="text-white">IP Address *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., 192.168.1.100"
                value={newDeviceIP}
                onChange={(e) => handleIPChange(e.target.value)}
                isInvalid={!!ipValidationError}
                className="bg-dark text-white border-secondary"
              />
              <Form.Control.Feedback type="invalid">
                {ipValidationError}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Enter a valid IPv4 address for the device you want to monitor
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label className="text-white">Device Name (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Office Router"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                className="bg-dark text-white border-secondary"
              />
              <Form.Text className="text-muted">
                If not provided, the system will attempt to discover the device name automatically
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowAddDeviceModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddDeviceSubmit}
            disabled={addingDevice || !!ipValidationError || !newDeviceIP.trim()}
          >
            {addingDevice ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Adding Device...
              </>
            ) : (
              <>
                <i className="fas fa-plus me-2"></i>
                Add Device
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Details / Edit Modal */}
      {selectedDevice && (
        <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
          <Modal.Header closeButton className="bg-dark text-white border-secondary">
            <Modal.Title className="text-white">{modalMode === 'view' ? 'Device Details' : 'Edit Device'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-dark text-white">
            <div className="p-3">
              {modalMode === 'view' ? (
                <div>
                  <h6 className="text-primary mb-3">Device Information</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label text-muted">Name</label>
                        <div className="text-white">{selectedDevice.name || 'N/A'}</div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label text-muted">IP Address</label>
                        <div className="text-white"><code className="text-info">{selectedDevice.ipAddress || selectedDevice.ip}</code></div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label text-muted">Device Type</label>
                        <div className="text-white text-capitalize">{selectedDevice.deviceType || selectedDevice.type || 'Unknown'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label text-muted">Status</label>
                        <div className="text-white">{getStatusBadge(selectedDevice.status)}</div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label text-muted">Vendor</label>
                        <div className="text-white">{selectedDevice.vendor || 'Unknown'}</div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label text-muted">Last Seen</label>
                        <div className="text-white">
                          {selectedDevice.lastSeen 
                            ? new Date(selectedDevice.lastSeen).toLocaleString()
                            : 'Never'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                  {selectedDevice.snmpData && (
                    <div className="mt-4">
                      <h6 className="text-primary mb-3">SNMP Information</h6>
                      <div className="bg-secondary bg-opacity-25 p-3 rounded">
                        <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: '0.85rem', margin: 0 }}>
                          {JSON.stringify(selectedDevice.snmpData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <DeviceEditForm device={selectedDevice} onSaved={async () => { setShowDetailsModal(false); await fetchDevices(); }} />
              )}
            </div>
          </Modal.Body>
        </Modal>
      )}
    </Container>
  );
};

export default Devices;

// Small inline edit form to avoid adding many files
const DeviceEditForm = ({ device, onSaved }) => {
  const [name, setName] = useState(device.name || device.hostname || '');
  const [vendor, setVendor] = useState(device.vendor || '');
  const [deviceType, setDeviceType] = useState(device.deviceType || device.type || 'unknown');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const id = device._id || device.id;
      await api.put(`/devices/${id}`, { name, vendor, deviceType });
      if (onSaved) await onSaved();
    } catch (err) {
      console.error('Edit device failed', err);
      alert('Failed to save device: ' + (err.message || 'unknown'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h6 className="text-primary mb-4">Edit Device Information</h6>
      <div className="row g-3">
        <div className="col-md-6">
          <Form.Group className="mb-3">
            <Form.Label className="text-white">Device Name</Form.Label>
            <Form.Control 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="bg-dark text-white border-secondary"
              placeholder="Enter device name"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="text-white">Vendor</Form.Label>
            <Form.Control 
              value={vendor} 
              onChange={(e) => setVendor(e.target.value)}
              className="bg-dark text-white border-secondary"
              placeholder="Enter vendor name"
            />
          </Form.Group>
        </div>
        <div className="col-md-6">
          <Form.Group className="mb-3">
            <Form.Label className="text-white">Device Type</Form.Label>
            <Form.Select 
              value={deviceType} 
              onChange={(e) => setDeviceType(e.target.value)}
              className="bg-dark text-white border-secondary"
            >
              <option value="router">Router</option>
              <option value="switch">Switch</option>
              <option value="server">Server</option>
              <option value="host">Host</option>
              <option value="unknown">Unknown</option>
            </Form.Select>
          </Form.Group>
          <div className="mb-3">
            <Form.Label className="text-muted">IP Address</Form.Label>
            <div className="text-white">
              <code className="text-info">{device.ipAddress || device.ip}</code>
              <small className="text-muted ms-2">(Read-only)</small>
            </div>
          </div>
        </div>
      </div>
      <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top border-secondary">
        <Button 
          variant="outline-secondary" 
          onClick={() => onSaved && onSaved()} 
          disabled={saving}
          className="px-4"
        >
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave} 
          disabled={saving}
          className="px-4"
        >
          {saving ? (
            <>
              <div className="spinner-border spinner-border-sm me-2" role="status"></div>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
};