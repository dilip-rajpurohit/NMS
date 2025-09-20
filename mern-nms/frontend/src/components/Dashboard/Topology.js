import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Alert, Button, Badge, Modal, Form } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import { discoveryAPI } from '../../services/api';

const Topology = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [autoDiscovery, setAutoDiscovery] = useState(false);
  const canvasRef = useRef(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (devices.length > 0) {
      drawTopology();
    }
  }, [devices]);

  // Real-time updates
  useEffect(() => {
    if (!socket || !connected) return;

    const normalize = (raw) => ({
      id: raw.id || raw._id,
      name: raw.name,
      hostname: raw.name,
      ip: raw.ip || raw.ipAddress,
      ipAddress: raw.ipAddress || raw.ip,
      mac: raw.mac || raw.macAddress,
      type: (raw.type || raw.deviceType || 'unknown').toLowerCase(),
      deviceType: raw.deviceType || raw.type,
      status: raw.status || 'unknown',
      lastSeen: raw.lastSeen || raw.metrics?.lastSeen,
      responseTime: raw.responseTime || raw.metrics?.responseTime,
      openPorts: raw.openPorts || [],
      vendor: raw.vendor,
    });

    const handleDeviceFound = (payload) => {
      const dev = normalize(payload.device || payload);
      setDevices((prev) => {
        const exists = prev.find((d) => (d.ipAddress || d.ip) === (dev.ipAddress || dev.ip));
        if (!exists) return [...prev, dev];
        return prev.map((d) => ((d.ipAddress || d.ip) === (dev.ipAddress || dev.ip) ? { ...d, ...dev } : d));
      });
    };

    const handleDeviceUpdated = (device) => {
      const dev = normalize(device);
      setDevices((prev) => prev.map((d) => (d.id === dev.id || d._id === dev.id ? { ...d, ...dev } : d)));
    };

    const handleDeviceMetrics = ({ deviceId, metrics }) => {
      setDevices((prev) => prev.map((d) => (d.id === deviceId || d._id === deviceId ? { ...d, status: 'online', lastSeen: metrics?.lastSeen, responseTime: metrics?.responseTime } : d)));
    };

    const handleScanCompleted = () => setAutoDiscovery(false);

    socket.on('discovery.deviceFound', handleDeviceFound);
    socket.on('device.updated', handleDeviceUpdated);
    socket.on('device.metrics', handleDeviceMetrics);
    socket.on('discovery.scanCompleted', handleScanCompleted);

    return () => {
      socket.off('discovery.deviceFound', handleDeviceFound);
      socket.off('device.updated', handleDeviceUpdated);
      socket.off('device.metrics', handleDeviceMetrics);
      socket.off('discovery.scanCompleted', handleScanCompleted);
    };
  }, [socket, connected]);

  const fetchDevices = async () => {
    try {
      setError(null);
      const response = await discoveryAPI.getDevices();
      const normalized = (response.data.devices || []).map((d) => ({
        id: d._id,
        name: d.name,
        hostname: d.name,
        ip: d.ipAddress,
        ipAddress: d.ipAddress,
        mac: d.macAddress,
        type: (d.deviceType || 'unknown').toLowerCase(),
        deviceType: d.deviceType,
        status: d.status || 'unknown',
        lastSeen: d.metrics?.lastSeen,
        responseTime: d.metrics?.responseTime,
        vendor: d.vendor,
      }));
      setDevices(normalized);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load topology data');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const startDiscovery = async () => {
    try {
      setAutoDiscovery(true);
      await discoveryAPI.startScan({
        networkRange: '192.168.1.0/24',
        protocols: ['ping', 'tcp'],
        maxDevices: 100,
      });
    } catch (err) {
      console.error('Error starting discovery:', err);
      setError('Failed to start discovery');
      setAutoDiscovery(false);
    }
  };

  const drawTopology = () => {
    const canvas = canvasRef.current;
    if (!canvas || devices.length === 0) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.fillStyle = '#0f1419';
    ctx.fillRect(0, 0, width, height);

    // Calculate positions for devices in a circular layout
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    const devicePositions = devices.map((device, index) => {
      const angle = (2 * Math.PI * index) / devices.length;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { ...device, x, y };
    });

    // Draw connections (simple star topology for now)
    if (devicePositions.length > 1) {
      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 2;
      
      devicePositions.forEach((device, index) => {
        if (index > 0) {
          ctx.beginPath();
          ctx.moveTo(devicePositions[0].x, devicePositions[0].y);
          ctx.lineTo(device.x, device.y);
          ctx.stroke();
        }
      });
    }

    // Draw devices
    devicePositions.forEach((device, index) => {
      // Device circle
      ctx.beginPath();
      ctx.arc(device.x, device.y, 25, 0, 2 * Math.PI);
      
      // Color based on status
      switch (device.status) {
        case 'online':
          ctx.fillStyle = '#28a745';
          break;
        case 'offline':
          ctx.fillStyle = '#dc3545';
          break;
        default:
          ctx.fillStyle = '#ffc107';
      }
      ctx.fill();
      
      // Border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Device icon
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px FontAwesome';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Simple icon based on device type
      let icon = '⚡'; // Default
      if (device.type) {
        switch (device.type.toLowerCase()) {
          case 'router':
            icon = '🔀';
            break;
          case 'switch':
            icon = '🔌';
            break;
          case 'server':
            icon = '🖥️';
            break;
          case 'firewall':
            icon = '🔥';
            break;
        }
      }
      
      ctx.fillText(icon, device.x, device.y);

      // Device label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(
        device.hostname || device.name || device.ipAddress || device.ip || 'Unknown',
        device.x,
        device.y + 40
      );
    });
  };

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is on a device
    devices.forEach((device, index) => {
      const angle = (2 * Math.PI * index) / devices.length;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) / 3;
      const deviceX = centerX + radius * Math.cos(angle);
      const deviceY = centerY + radius * Math.sin(angle);

      const distance = Math.sqrt((x - deviceX) ** 2 + (y - deviceY) ** 2);
      if (distance <= 25) {
        setSelectedDevice(device);
        setShowModal(true);
      }
    });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="text-muted">Loading topology...</p>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="topology fade-in">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-white mb-2">
                <i className="fas fa-project-diagram me-2 text-primary"></i>
                Network Topology
              </h2>
              <p className="text-muted mb-0">
                Interactive network visualization • {devices.length} devices discovered
              </p>
            </div>
            <div>
              <Button 
                variant={autoDiscovery ? "warning" : "success"}
                onClick={autoDiscovery ? () => setAutoDiscovery(false) : startDiscovery}
                className="me-2"
              >
                <i className={`fas ${autoDiscovery ? 'fa-stop' : 'fa-search'} me-2`}></i>
                {autoDiscovery ? 'Stop Discovery' : 'Auto Discovery'}
              </Button>
              <Button variant="outline-primary" onClick={fetchDevices}>
                <i className="fas fa-sync-alt me-2"></i>
                Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      <Row>
        <Col lg={9} className="mb-4">
          <Card className="topology-container">
            <Card.Body className="p-0">
              {devices.length > 0 ? (
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  onClick={handleCanvasClick}
                  style={{ 
                    width: '100%', 
                    height: '600px', 
                    cursor: 'pointer',
                    backgroundColor: '#0f1419'
                  }}
                />
              ) : (
                <div className="text-center p-5" style={{ minHeight: '600px' }}>
                  <i className="fas fa-search fa-3x text-muted mb-3"></i>
                  <h4 className="text-muted">No devices discovered</h4>
                  <p className="text-muted">Start auto-discovery to find network devices</p>
                  <Button variant="primary" onClick={startDiscovery}>
                    <i className="fas fa-play me-2"></i>
                    Start Discovery
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Device List
              </h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '550px', overflowY: 'auto' }}>
              {devices.map((device, index) => (
                <div 
                  key={index} 
                  className="d-flex justify-content-between align-items-center p-2 mb-2 rounded"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)', 
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)'
                  }}
                  onClick={() => {
                    setSelectedDevice(device);
                    setShowModal(true);
                  }}
                >
                  <div>
                    <div className="fw-bold text-white">
                      {device.hostname || device.ip}
                    </div>
                    <small className="text-muted">
                      {device.type || 'Unknown'} • {device.ip}
                    </small>
                  </div>
                  <Badge bg={
                    device.status === 'online' ? 'success' : 
                    device.status === 'offline' ? 'danger' : 'warning'
                  }>
                    {device.status || 'unknown'}
                  </Badge>
                </div>
              ))}
              
              {devices.length === 0 && (
                <div className="text-center text-muted py-4">
                  <i className="fas fa-search fa-2x mb-2"></i>
                  <p className="mb-0">No devices found</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Device Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>
            <i className="fas fa-server me-2"></i>
            Device Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          {selectedDevice && (
            <Row>
              <Col md={6}>
                <h6 className="text-primary">Basic Information</h6>
                <table className="table table-dark table-sm">
                  <tbody>
                    <tr>
                      <td>Hostname:</td>
                      <td>{selectedDevice.hostname || 'Unknown'}</td>
                    </tr>
                    <tr>
                      <td>IP Address:</td>
                      <td>{selectedDevice.ip}</td>
                    </tr>
                    <tr>
                      <td>MAC Address:</td>
                      <td>{selectedDevice.mac || 'Unknown'}</td>
                    </tr>
                    <tr>
                      <td>Type:</td>
                      <td>{selectedDevice.type || 'Unknown'}</td>
                    </tr>
                    <tr>
                      <td>Status:</td>
                      <td>
                        <Badge bg={
                          selectedDevice.status === 'online' ? 'success' : 
                          selectedDevice.status === 'offline' ? 'danger' : 'warning'
                        }>
                          {selectedDevice.status || 'unknown'}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
              <Col md={6}>
                <h6 className="text-primary">Network Information</h6>
                <table className="table table-dark table-sm">
                  <tbody>
                    <tr>
                      <td>Vendor:</td>
                      <td>{selectedDevice.vendor || 'Unknown'}</td>
                    </tr>
                    <tr>
                      <td>Last Seen:</td>
                      <td>
                        {selectedDevice.lastSeen 
                          ? new Date(selectedDevice.lastSeen).toLocaleString()
                          : 'Unknown'
                        }
                      </td>
                    </tr>
                    <tr>
                      <td>Response Time:</td>
                      <td>{selectedDevice.responseTime || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Open Ports:</td>
                      <td>
                        {selectedDevice.openPorts?.length > 0 
                          ? selectedDevice.openPorts.join(', ')
                          : 'None detected'
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark">
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Topology;
