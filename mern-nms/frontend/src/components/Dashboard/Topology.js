import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Modal, Table, Form, ButtonGroup } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const Topology = () => {
  const { socket, connected } = useSocket();
  const svgRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null);
  const [viewMode, setViewMode] = useState('hierarchical');
  const [filterType, setFilterType] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [topologyStats, setTopologyStats] = useState({
    totalDevices: 0,
    totalLinks: 0,
    routerCount: 0,
    switchCount: 0,
    serverCount: 0,
    unknownCount: 0
  });

  // Load topology data
  useEffect(() => {
    loadTopologyData();
    
    if (autoRefresh) {
      const interval = setInterval(loadTopologyData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // WebSocket event listeners
  useEffect(() => {
    if (socket && connected) {
      socket.on('topologyUpdate', (data) => {
        if (data.devices) setDevices(data.devices);
        if (data.links) setLinks(data.links);
        updateTopologyStats(data.devices || devices, data.links || links);
      });

      socket.on('deviceStatusChanged', (device) => {
        setDevices(prev => prev.map(d => 
          d.ip === device.ip ? { ...d, status: device.status } : d
        ));
      });

      return () => {
        socket.off('topologyUpdate');
        socket.off('deviceStatusChanged');
      };
    }
  }, [socket, connected, devices, links]);

  const loadTopologyData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [devicesRes, topologyRes] = await Promise.all([
        api.get('/devices', { headers }),
        api.get('/dashboard/topology', { headers }).catch(() => ({ data: { nodes: [], links: [] } }))
      ]);

      const devicesData = devicesRes.data || [];
      const topologyData = topologyRes.data || { nodes: [], links: [] };

      setDevices(devicesData);
      setLinks(topologyData.links || []);
      updateTopologyStats(devicesData, topologyData.links || []);
      drawTopology(devicesData, topologyData.links || []);

    } catch (error) {
      console.error('Error loading topology:', error);
      setMessage({ type: 'danger', text: 'Failed to load network topology' });
    } finally {
      setLoading(false);
    }
  };

  const updateTopologyStats = (devicesData, linksData) => {
    const stats = {
      totalDevices: devicesData.length,
      totalLinks: linksData.length,
      routerCount: devicesData.filter(d => d.type === 'router').length,
      switchCount: devicesData.filter(d => d.type === 'switch').length,
      serverCount: devicesData.filter(d => d.type === 'server').length,
      unknownCount: devicesData.filter(d => !d.type || d.type === 'unknown').length
    };
    setTopologyStats(stats);
  };

  const drawTopology = (devicesData, linksData) => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    // Clear existing content
    svg.innerHTML = '';

    // Filter devices based on selected type
    const filteredDevices = filterType === 'all' 
      ? devicesData 
      : devicesData.filter(d => d.type === filterType);

    // Position devices based on view mode
    const positionedDevices = positionDevices(filteredDevices, width, height);

    // Draw links first (so they appear behind devices)
    linksData.forEach(link => {
      const sourceDevice = positionedDevices.find(d => d.ip === link.source);
      const targetDevice = positionedDevices.find(d => d.ip === link.target);
      
      if (sourceDevice && targetDevice) {
        drawLink(svg, sourceDevice, targetDevice, link);
      }
    });

    // Draw devices
    positionedDevices.forEach(device => {
      drawDevice(svg, device);
    });
  };

  const positionDevices = (devicesData, width, height) => {
    const devices = [...devicesData];
    const padding = 100;
    const usableWidth = width - 2 * padding;
    const usableHeight = height - 2 * padding;

    if (viewMode === 'hierarchical') {
      // Group devices by type for hierarchical layout
      const routers = devices.filter(d => d.type === 'router');
      const switches = devices.filter(d => d.type === 'switch');
      const servers = devices.filter(d => d.type === 'server');
      const others = devices.filter(d => !['router', 'switch', 'server'].includes(d.type));

      let currentY = padding;
      const layerHeight = usableHeight / 4;

      // Position routers at top
      routers.forEach((device, index) => {
        device.x = padding + (usableWidth / (routers.length + 1)) * (index + 1);
        device.y = currentY;
      });

      currentY += layerHeight;

      // Position switches in middle
      switches.forEach((device, index) => {
        device.x = padding + (usableWidth / (switches.length + 1)) * (index + 1);
        device.y = currentY;
      });

      currentY += layerHeight;

      // Position servers
      servers.forEach((device, index) => {
        device.x = padding + (usableWidth / (servers.length + 1)) * (index + 1);
        device.y = currentY;
      });

      currentY += layerHeight;

      // Position other devices at bottom
      others.forEach((device, index) => {
        device.x = padding + (usableWidth / (others.length + 1)) * (index + 1);
        device.y = currentY;
      });

    } else if (viewMode === 'circular') {
      // Circular layout
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(usableWidth, usableHeight) / 2 - 50;

      devices.forEach((device, index) => {
        const angle = (2 * Math.PI * index) / devices.length;
        device.x = centerX + radius * Math.cos(angle);
        device.y = centerY + radius * Math.sin(angle);
      });

    } else {
      // Grid layout
      const cols = Math.ceil(Math.sqrt(devices.length));
      const rows = Math.ceil(devices.length / cols);
      const cellWidth = usableWidth / cols;
      const cellHeight = usableHeight / rows;

      devices.forEach((device, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        device.x = padding + col * cellWidth + cellWidth / 2;
        device.y = padding + row * cellHeight + cellHeight / 2;
      });
    }

    return devices;
  };

  const drawDevice = (svg, device) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'device-node');
    group.setAttribute('cursor', 'pointer');

    // Device circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', device.x);
    circle.setAttribute('cy', device.y);
    circle.setAttribute('r', getDeviceSize(device));
    circle.setAttribute('fill', getDeviceColor(device));
    circle.setAttribute('stroke', device.status === 'up' ? '#28a745' : '#dc3545');
    circle.setAttribute('stroke-width', '3');

    // Device icon (simplified as text)
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', device.x);
    text.setAttribute('y', device.y + 5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', '14');
    text.setAttribute('font-weight', 'bold');
    text.textContent = getDeviceIcon(device);

    // Device label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', device.x);
    label.setAttribute('y', device.y + getDeviceSize(device) + 20);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#ffffff');
    label.setAttribute('font-size', '12');
    label.textContent = device.hostname || device.name || device.ip;

    // Add click event
    group.addEventListener('click', () => {
      setSelectedDevice(device);
      setShowDeviceModal(true);
    });

    group.appendChild(circle);
    group.appendChild(text);
    group.appendChild(label);
    svg.appendChild(group);
  };

  const drawLink = (svg, source, target, link) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', source.x);
    line.setAttribute('y1', source.y);
    line.setAttribute('x2', target.x);
    line.setAttribute('y2', target.y);
    line.setAttribute('stroke', getLinkColor(link));
    line.setAttribute('stroke-width', getLinkWidth(link));
    line.setAttribute('cursor', 'pointer');

    // Add click event for link details
    line.addEventListener('click', () => {
      setSelectedLink({ ...link, source, target });
      setShowLinkModal(true);
    });

    svg.appendChild(line);
  };

  const getDeviceSize = (device) => {
    switch (device.type) {
      case 'router': return 25;
      case 'switch': return 20;
      case 'server': return 30;
      default: return 18;
    }
  };

  const getDeviceColor = (device) => {
    switch (device.type) {
      case 'router': return '#007bff';
      case 'switch': return '#17a2b8';
      case 'server': return '#28a745';
      case 'printer': return '#ffc107';
      case 'computer': return '#6c757d';
      default: return '#6f42c1';
    }
  };

  const getDeviceIcon = (device) => {
    switch (device.type) {
      case 'router': return 'R';
      case 'switch': return 'S';
      case 'server': return 'SV';
      case 'printer': return 'P';
      case 'computer': return 'PC';
      default: return '?';
    }
  };

  const getLinkColor = (link) => {
    if (link.status === 'down') return '#dc3545';
    if (link.utilization > 80) return '#ffc107';
    return '#28a745';
  };

  const getLinkWidth = (link) => {
    return Math.max(1, Math.min(5, (link.bandwidth || 100) / 100));
  };

  const refreshTopology = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.post('/topology/discover', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setMessage({ type: 'info', text: 'Topology discovery started. Please wait...' });
      setTimeout(() => {
        loadTopologyData();
        setMessage({ type: '', text: '' });
      }, 5000);
      
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to refresh topology' });
    }
  };

  // Redraw topology when view mode or filter changes
  useEffect(() => {
    if (!loading) {
      drawTopology(devices, links);
    }
  }, [viewMode, filterType, devices, links, loading]);

  return (
    <Container fluid className="p-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-white mb-1">
                <i className="fas fa-project-diagram me-2 text-success"></i>
                Network Topology
              </h2>
              <p className="text-muted mb-0">Interactive network topology visualization</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Badge bg={connected ? 'success' : 'danger'}>
                <i className="fas fa-circle me-1"></i>
                {connected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Button variant="outline-primary" size="sm" onClick={refreshTopology}>
                <i className="fas fa-sync-alt me-1"></i>
                Discover
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

      {/* Topology Stats */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Body>
              <Row className="text-center">
                <Col md={2}>
                  <div className="text-primary h4">{topologyStats.totalDevices}</div>
                  <small className="text-muted">Total Devices</small>
                </Col>
                <Col md={2}>
                  <div className="text-info h4">{topologyStats.totalLinks}</div>
                  <small className="text-muted">Total Links</small>
                </Col>
                <Col md={2}>
                  <div className="text-success h4">{topologyStats.routerCount}</div>
                  <small className="text-muted">Routers</small>
                </Col>
                <Col md={2}>
                  <div className="text-warning h4">{topologyStats.switchCount}</div>
                  <small className="text-muted">Switches</small>
                </Col>
                <Col md={2}>
                  <div className="text-danger h4">{topologyStats.serverCount}</div>
                  <small className="text-muted">Servers</small>
                </Col>
                <Col md={2}>
                  <div className="text-secondary h4">{topologyStats.unknownCount}</div>
                  <small className="text-muted">Unknown</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Controls */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Body>
              <Row className="align-items-center">
                <Col md={4}>
                  <Form.Label className="text-white me-2">View Mode:</Form.Label>
                  <ButtonGroup>
                    <Button
                      variant={viewMode === 'hierarchical' ? 'primary' : 'outline-primary'}
                      size="sm"
                      onClick={() => setViewMode('hierarchical')}
                    >
                      Hierarchical
                    </Button>
                    <Button
                      variant={viewMode === 'circular' ? 'primary' : 'outline-primary'}
                      size="sm"
                      onClick={() => setViewMode('circular')}
                    >
                      Circular
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'primary' : 'outline-primary'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      Grid
                    </Button>
                  </ButtonGroup>
                </Col>
                <Col md={4}>
                  <Form.Label className="text-white me-2">Filter by Type:</Form.Label>
                  <Form.Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    size="sm"
                    className="bg-dark text-white border-secondary"
                    style={{ width: 'auto', display: 'inline-block' }}
                  >
                    <option value="all">All Devices</option>
                    <option value="router">Routers</option>
                    <option value="switch">Switches</option>
                    <option value="server">Servers</option>
                    <option value="computer">Computers</option>
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Check
                    type="switch"
                    id="auto-refresh"
                    label="Auto Refresh"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="text-white"
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Topology Visualization */}
      <Row>
        <Col>
          <Card className="bg-dark border-secondary">
            <Card.Header className="bg-dark border-secondary">
              <h5 className="mb-0 text-white">
                <i className="fas fa-sitemap me-2"></i>
                Network Map
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ height: '600px' }}>
                  <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <p className="text-muted">Loading network topology...</p>
                  </div>
                </div>
              ) : (
                <svg
                  ref={svgRef}
                  width="100%"
                  height="600"
                  style={{ backgroundColor: '#1a1a1a' }}
                  className="border-0"
                />
              )}
            </Card.Body>
          </Card>
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
                      <td>Type:</td>
                      <td>
                        <Badge bg="secondary">{selectedDevice.type || 'Unknown'}</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td>Status:</td>
                      <td>
                        <Badge bg={selectedDevice.status === 'up' ? 'success' : 'danger'}>
                          {selectedDevice.status || 'Unknown'}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                <Table className="table-dark table-sm">
                  <tbody>
                    <tr>
                      <td>MAC Address:</td>
                      <td>{selectedDevice.mac || 'N/A'}</td>
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
                      <td>Last Seen:</td>
                      <td>{selectedDevice.lastSeen ? new Date(selectedDevice.lastSeen).toLocaleString() : 'N/A'}</td>
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
        </Modal.Footer>
      </Modal>

      {/* Link Details Modal */}
      <Modal show={showLinkModal} onHide={() => setShowLinkModal(false)} centered>
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title className="text-white">Link Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          {selectedLink && (
            <Table className="table-dark table-sm">
              <tbody>
                <tr>
                  <td>Source:</td>
                  <td>{selectedLink.source?.ip} ({selectedLink.source?.hostname || 'N/A'})</td>
                </tr>
                <tr>
                  <td>Target:</td>
                  <td>{selectedLink.target?.ip} ({selectedLink.target?.hostname || 'N/A'})</td>
                </tr>
                <tr>
                  <td>Bandwidth:</td>
                  <td>{selectedLink.bandwidth ? `${selectedLink.bandwidth} Mbps` : 'N/A'}</td>
                </tr>
                <tr>
                  <td>Utilization:</td>
                  <td>{selectedLink.utilization ? `${selectedLink.utilization}%` : 'N/A'}</td>
                </tr>
                <tr>
                  <td>Status:</td>
                  <td>
                    <Badge bg={selectedLink.status === 'up' ? 'success' : 'danger'}>
                      {selectedLink.status || 'Unknown'}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowLinkModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Topology;