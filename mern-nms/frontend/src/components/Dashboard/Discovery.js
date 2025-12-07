import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, ProgressBar, Spinner, Table, Modal } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const Discovery = () => {
  const { socket, connected } = useSocket();
  const [discoveryConfig, setDiscoveryConfig] = useState({
    subnet: '192.168.1.0/24',
    method: 'ping',
    enableSnmp: true,
    snmpCommunity: 'public',
    snmpVersion: '2c',
    timeout: 3000,
    maxHosts: 254,
    threadCount: 50,
    enableDns: true,
    enablePorts: false,
    portList: '22,23,53,80,443,161,3389'
  });

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentTarget, setCurrentTarget] = useState('');
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [scanStats, setScanStats] = useState({
    totalHosts: 0,
    scannedHosts: 0,
    foundDevices: 0,
    startTime: null,
    estimatedTime: 0
  });

  // Load scan history on component mount
  useEffect(() => {
    loadScanHistory();
    loadExistingDevices();
  }, []);

  // WebSocket event listeners
  useEffect(() => {
    if (socket && connected) {
      socket.on('scanProgress', (data) => {
        setScanProgress(data.percentage);
        setCurrentTarget(data.currentTarget);
        setScanStats(prev => ({ ...prev, scannedHosts: data.scannedHosts }));
      });

      socket.on('deviceFound', (device) => {
        setDiscoveredDevices(prev => {
          const existing = prev.find(d => d.ip === device.ip);
          if (existing) {
            return prev.map(d => d.ip === device.ip ? { ...d, ...device } : d);
          }
          return [...prev, device];
        });
        setScanStats(prev => ({ ...prev, foundDevices: prev.foundDevices + 1 }));
      });

      socket.on('scanCompleted', (data) => {
        setIsScanning(false);
        setScanProgress(100);
        setCurrentTarget('');
        setMessage({ type: 'success', text: `Scan completed. Found ${data.devicesFound} devices in ${data.duration}` });
        loadScanHistory();
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      });

      socket.on('scanError', (data) => {
        setIsScanning(false);
        setMessage({ type: 'danger', text: data.error });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      });

      return () => {
        socket.off('scanProgress');
        socket.off('deviceFound');
        socket.off('scanCompleted');
        socket.off('scanError');
      };
    }
  }, [socket, connected]);

  const loadScanHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/discovery/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setScanHistory(response.data || []);
    } catch (error) {
      console.error('Error loading scan history:', error);
    }
  };

  const loadExistingDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Show recently discovered devices
      const recentDevices = (response.data || [])
        .filter(device => device.discoveredAt && new Date(device.discoveredAt) > new Date(Date.now() - 24 * 60 * 60 * 1000))
        .slice(0, 10);
      
      setDiscoveredDevices(recentDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const startDiscovery = async () => {
    try {
      setIsScanning(true);
      setScanProgress(0);
      setDiscoveredDevices([]);
      setMessage({ type: '', text: '' });
      setCurrentTarget('');
      
      const startTime = new Date();
      setScanStats({
        totalHosts: calculateTotalHosts(discoveryConfig.subnet),
        scannedHosts: 0,
        foundDevices: 0,
        startTime,
        estimatedTime: 0
      });

      const token = localStorage.getItem('token');
      const response = await api.post('/discovery/start', discoveryConfig, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setMessage({ type: 'info', text: 'Network discovery started. This may take several minutes...' });
      
    } catch (error) {
      setIsScanning(false);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.message || 'Failed to start network discovery' 
      });
    }
  };

  const stopDiscovery = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.post('/discovery/stop', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setIsScanning(false);
      setMessage({ type: 'warning', text: 'Network discovery stopped by user' });
      
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to stop discovery' });
    }
  };

  const addDeviceToMonitoring = async (device) => {
    try {
      const token = localStorage.getItem('token');
      await api.post('/devices', {
        name: device.name || device.hostname || `Device-${device.ip}`,
        ipAddress: device.ip,
        deviceType: device.type || device.deviceType || 'unknown',
        vendor: device.vendor || 'Unknown',
        model: device.model || '',
        macAddress: device.mac || device.macAddress || '',
        status: device.status || 'unknown',
        discoveredBy: 'manual',
        monitoringEnabled: true
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: `Device ${device.ip} added to monitoring` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.message || 'Failed to add device to monitoring' 
      });
    }
  };

  const calculateTotalHosts = (subnet) => {
    const cidr = parseInt(subnet.split('/')[1]);
    return Math.pow(2, 32 - cidr) - 2; // Subtract network and broadcast addresses
  };

  const getDeviceIcon = (device) => {
    if (device.type) {
      switch (device.type.toLowerCase()) {
        case 'router': return 'fas fa-route text-primary';
        case 'switch': return 'fas fa-network-wired text-info';
        case 'server': return 'fas fa-server text-success';
        case 'printer': return 'fas fa-print text-warning';
        case 'computer': return 'fas fa-desktop text-secondary';
        case 'phone': return 'fas fa-phone text-primary';
        default: return 'fas fa-question text-muted';
      }
    }
    return 'fas fa-laptop text-info';
  };

  const getStatusBadge = (device) => {
    if (device.status === 'up') {
      return <Badge bg="success">Online</Badge>;
    } else if (device.status === 'down') {
      return <Badge bg="danger">Offline</Badge>;
    }
    return <Badge bg="warning">Unknown</Badge>;
  };

  return (
    <Container fluid className="p-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-white mb-1">
                <i className="fas fa-search-plus me-2 text-primary"></i>
                Network Discovery
              </h2>
            </div>
            <div className="d-flex align-items-center">
              <Badge bg={connected ? 'success' : 'danger'} className="me-3">
                <i className="fas fa-circle me-1"></i>
                {connected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Badge bg={isScanning ? 'warning' : 'secondary'}>
                <i className={`fas fa-${isScanning ? 'spin fa-spinner' : 'pause'} me-1`}></i>
                {isScanning ? 'Scanning' : 'Idle'}
              </Badge>
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

      <Row>
        {/* Discovery Configuration */}
        <Col lg={4} className="mb-4">
          <Card className="bg-dark border-secondary">
            <Card.Header className="bg-dark border-secondary">
              <h5 className="mb-0 text-white">
                <i className="fas fa-cog me-2 text-warning"></i>
                Discovery Settings
              </h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label className="text-white">Network Subnet</Form.Label>
                  <Form.Control
                    type="text"
                    value={discoveryConfig.subnet}
                    onChange={(e) => setDiscoveryConfig(prev => ({ ...prev, subnet: e.target.value }))}
                    placeholder="192.168.1.0/24"
                    disabled={isScanning}
                    className="bg-dark text-white border-secondary"
                  />
                  <Form.Text className="text-muted">
                    Enter network in CIDR notation (e.g., 192.168.1.0/24)
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="text-white">Discovery Method</Form.Label>
                  <Form.Select
                    value={discoveryConfig.method}
                    onChange={(e) => setDiscoveryConfig(prev => ({ ...prev, method: e.target.value }))}
                    disabled={isScanning}
                    className="bg-dark text-white border-secondary"
                  >
                    <option value="ping">Ping Sweep</option>
                    <option value="arp">ARP Table</option>
                    <option value="snmp">SNMP Discovery</option>
                    <option value="comprehensive">Comprehensive Scan</option>
                  </Form.Select>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-white">Timeout (ms)</Form.Label>
                      <Form.Control
                        type="number"
                        value={discoveryConfig.timeout}
                        onChange={(e) => setDiscoveryConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                        disabled={isScanning}
                        className="bg-dark text-white border-secondary"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-white">Thread Count</Form.Label>
                      <Form.Control
                        type="number"
                        value={discoveryConfig.threadCount}
                        onChange={(e) => setDiscoveryConfig(prev => ({ ...prev, threadCount: parseInt(e.target.value) }))}
                        disabled={isScanning}
                        className="bg-dark text-white border-secondary"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="enable-snmp"
                    label="Enable SNMP Discovery"
                    checked={discoveryConfig.enableSnmp}
                    onChange={(e) => setDiscoveryConfig(prev => ({ ...prev, enableSnmp: e.target.checked }))}
                    disabled={isScanning}
                    className="text-white"
                  />
                </Form.Group>

                {discoveryConfig.enableSnmp && (
                  <Form.Group className="mb-3">
                    <Form.Label className="text-white">SNMP Community</Form.Label>
                    <Form.Control
                      type="text"
                      value={discoveryConfig.snmpCommunity}
                      onChange={(e) => setDiscoveryConfig(prev => ({ ...prev, snmpCommunity: e.target.value }))}
                      disabled={isScanning}
                      className="bg-dark text-white border-secondary"
                    />
                  </Form.Group>
                )}

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="enable-ports"
                    label="Enable Port Scanning"
                    checked={discoveryConfig.enablePorts}
                    onChange={(e) => setDiscoveryConfig(prev => ({ ...prev, enablePorts: e.target.checked }))}
                    disabled={isScanning}
                    className="text-white"
                  />
                </Form.Group>

                <div className="d-grid">
                  {!isScanning ? (
                    <Button variant="primary" onClick={startDiscovery} disabled={!connected}>
                      <i className="fas fa-play me-2"></i>
                      Start Discovery
                    </Button>
                  ) : (
                    <Button variant="danger" onClick={stopDiscovery}>
                      <i className="fas fa-stop me-2"></i>
                      Stop Discovery
                    </Button>
                  )}
                </div>
              </Form>
            </Card.Body>
          </Card>

          {/* Scan Statistics */}
          {isScanning && (
            <Card className="bg-dark border-secondary mt-4">
              <Card.Header className="bg-dark border-secondary">
                <h6 className="mb-0 text-white">
                  <i className="fas fa-chart-bar me-2 text-info"></i>
                  Scan Progress
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-white">Progress</span>
                    <span className="text-white">{scanProgress.toFixed(1)}%</span>
                  </div>
                  <ProgressBar 
                    now={scanProgress} 
                    variant="primary" 
                    className="bg-dark"
                    style={{ height: '8px' }}
                  />
                </div>
                
                {currentTarget && (
                  <div className="mb-3">
                    <small className="text-muted">Scanning:</small>
                    <div className="text-info">{currentTarget}</div>
                  </div>
                )}

                <Row className="text-center">
                  <Col>
                    <div className="text-primary h5">{scanStats.scannedHosts}</div>
                    <small className="text-muted">Scanned</small>
                  </Col>
                  <Col>
                    <div className="text-success h5">{scanStats.foundDevices}</div>
                    <small className="text-muted">Found</small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Discovered Devices */}
        <Col lg={8}>
          <Card className="bg-dark border-secondary">
            <Card.Header className="bg-dark border-secondary">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-white">
                  <i className="fas fa-network-wired me-2 text-success"></i>
                  Discovered Devices ({discoveredDevices.length})
                </h5>
                <Button variant="outline-secondary" size="sm" onClick={loadExistingDevices}>
                  <i className="fas fa-sync-alt me-1"></i>
                  Refresh
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {discoveredDevices.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="fas fa-search fa-3x mb-3 opacity-25"></i>
                  <p>No devices discovered yet</p>
                  <p className="small">Start a network discovery scan to find devices</p>
                </div>
              ) : (
                <Table responsive className="table-dark table-hover">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>IP Address</th>
                      <th>Status</th>
                      <th>Type</th>
                      <th>Response Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discoveredDevices.map((device, index) => (
                      <tr key={device.ip || index}>
                        <td>
                          <div className="d-flex align-items-center">
                            <i className={`${getDeviceIcon(device)} me-2`}></i>
                            <div>
                              <div className="text-white">{device.hostname || device.name || 'Unknown Device'}</div>
                              {device.manufacturer && (
                                <small className="text-muted">{device.manufacturer}</small>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-white">{device.ip}</td>
                        <td>{getStatusBadge(device)}</td>
                        <td>
                          <Badge bg="secondary">{device.type || 'Unknown'}</Badge>
                        </td>
                        <td className="text-white">
                          {device.responseTime ? `${device.responseTime}ms` : '-'}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => {
                                setSelectedDevice(device);
                                setShowDeviceModal(true);
                              }}
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => addDeviceToMonitoring(device)}
                            >
                              <i className="fas fa-plus"></i>
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

          {/* Recent Scan History */}
          {scanHistory.length > 0 && (
            <Card className="bg-dark border-secondary mt-4">
              <Card.Header className="bg-dark border-secondary">
                <h6 className="mb-0 text-white">
                  <i className="fas fa-history me-2 text-warning"></i>
                  Recent Scan History
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="small">
                  {scanHistory.slice(0, 5).map((scan, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                      <div>
                        <div className="text-white">{scan.subnet}</div>
                        <small className="text-muted">{new Date(scan.timestamp).toLocaleString()}</small>
                      </div>
                      <div className="text-end">
                        <div className="text-success">{scan.devicesFound} devices</div>
                        <small className="text-muted">{scan.duration}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Device Details Modal */}
      <Modal show={showDeviceModal} onHide={() => setShowDeviceModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title className="text-white">Device Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          {selectedDevice && (
            <Row>
              <Col md={6}>
                <h6>Basic Information</h6>
                <Table className="table-dark table-sm">
                  <tbody>
                    <tr>
                      <td>IP Address:</td>
                      <td>{selectedDevice.ip}</td>
                    </tr>
                    <tr>
                      <td>Hostname:</td>
                      <td>{selectedDevice.hostname || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>MAC Address:</td>
                      <td>{selectedDevice.mac || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Status:</td>
                      <td>{getStatusBadge(selectedDevice)}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                <h6>Additional Details</h6>
                <Table className="table-dark table-sm">
                  <tbody>
                    <tr>
                      <td>Type:</td>
                      <td>{selectedDevice.type || 'Unknown'}</td>
                    </tr>
                    <tr>
                      <td>Manufacturer:</td>
                      <td>{selectedDevice.manufacturer || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Response Time:</td>
                      <td>{selectedDevice.responseTime ? `${selectedDevice.responseTime}ms` : 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Discovered:</td>
                      <td>{selectedDevice.discoveredAt ? new Date(selectedDevice.discoveredAt).toLocaleString() : 'N/A'}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowDeviceModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              addDeviceToMonitoring(selectedDevice);
              setShowDeviceModal(false);
            }}
          >
            Add to Monitoring
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Discovery;