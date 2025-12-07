import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Modal, Form, ButtonGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import '../../styles/topology.css';

const Topology = () => {
  const { socket, connected, realTimeData } = useSocket();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [viewMode, setViewMode] = useState('network');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Device type configurations
  const deviceConfig = {
    router: { 
      icon: '🔀', 
      color: '#4f46e5', 
      bgColor: '#f3f4f6',
      borderColor: '#e5e7eb'
    },
    switch: { 
      icon: '⚡', 
      color: '#059669', 
      bgColor: '#f0fdf4',
      borderColor: '#d1fae5'
    },
    server: { 
      icon: '💻', 
      color: '#dc2626', 
      bgColor: '#fef2f2',
      borderColor: '#fecaca'
    },
    unknown: { 
      icon: '❓', 
      color: '#6b7280', 
      bgColor: '#f9fafb',
      borderColor: '#e5e7eb'
    },
    host: { 
      icon: '🖥️', 
      color: '#7c3aed', 
      bgColor: '#faf5ff',
      borderColor: '#e9d5ff'
    }
  };

  // Status configurations
  const statusConfig = {
    online: { color: '#10b981', bgColor: '#d1fae5', label: 'Online' },
    offline: { color: '#ef4444', bgColor: '#fee2e2', label: 'Offline' },
    unknown: { color: '#6b7280', bgColor: '#f3f4f6', label: 'Unknown' }
  };

  // Load topology data
  const loadTopologyData = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const [devicesRes, topologyRes] = await Promise.all([
        api.get('/devices'),
        api.get('/topology').catch(() => ({ data: { topology: [] } }))
      ]);

      if (devicesRes.data && devicesRes.data.devices) {
        const devicesData = devicesRes.data.devices.map(device => ({
          id: device._id || device.id,
          ip: device.ipAddress || device.ip,
          name: device.name || device.hostname || device.ip || 'Unknown',
          type: determineDeviceType(device),
          status: normalizeStatus(device.status),
          metrics: device.metrics || {},
          lastSeen: device.lastSeen,
          manufacturer: device.details?.manufacturer || 'Unknown',
          model: device.details?.model || 'Unknown'
        }));

        setDevices(devicesData);

        // Generate smart links based on network topology
        const smartLinks = generateSmartLinks(devicesData);
        setLinks(smartLinks);

        if (devicesData.length === 0) {
          setMessage({ 
            type: 'info', 
            text: 'No devices discovered yet. Use the Discovery page to add devices to your network.' 
          });
        }
      }
    } catch (error) {
      console.error('Error loading topology:', error);
      setMessage({ 
        type: 'danger', 
        text: 'Failed to load network topology. Please try refreshing the page.' 
      });
      setDevices([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Determine device type based on available information
  const determineDeviceType = (device) => {
    if (device.deviceType) return device.deviceType.toLowerCase();
    if (device.type) return device.type.toLowerCase();
    
    // Intelligent type detection based on name/IP patterns
    const name = (device.name || device.hostname || '').toLowerCase();
    const ip = device.ipAddress || device.ip || '';
    
    if (name.includes('router') || name.includes('gw') || name.includes('gateway')) return 'router';
    if (name.includes('switch') || name.includes('sw')) return 'switch';
    if (name.includes('server') || name.includes('srv')) return 'server';
    if (ip.endsWith('.1') || ip.endsWith('.254')) return 'router'; // Common gateway IPs
    
    return 'unknown';
  };

  // Normalize device status
  const normalizeStatus = (status) => {
    if (!status) return 'unknown';
    const s = status.toLowerCase();
    if (s === 'up' || s === 'online' || s === 'active') return 'online';
    if (s === 'down' || s === 'offline' || s === 'inactive') return 'offline';
    return 'unknown';
  };

  // Generate intelligent network links
  const generateSmartLinks = (devicesData) => {
    const links = [];
    const routers = devicesData.filter(d => d.type === 'router');
    const switches = devicesData.filter(d => d.type === 'switch');
    const others = devicesData.filter(d => d.type !== 'router' && d.type !== 'switch');

    // Connect routers to each other (backbone)
    for (let i = 0; i < routers.length; i++) {
      for (let j = i + 1; j < routers.length; j++) {
        if (areDevicesConnected(routers[i], routers[j])) {
          links.push({
            id: `${routers[i].id}-${routers[j].id}`,
            source: routers[i].id,
            target: routers[j].id,
            type: 'backbone',
            strength: 3
          });
        }
      }
    }

    // Connect switches to routers
    switches.forEach(sw => {
      const nearestRouter = findNearestRouter(sw, routers);
      if (nearestRouter) {
        links.push({
          id: `${nearestRouter.id}-${sw.id}`,
          source: nearestRouter.id,
          target: sw.id,
          type: 'infrastructure',
          strength: 2
        });
      }
    });

    // Connect other devices to switches/routers
    others.forEach(device => {
      const nearestInfra = findNearestInfrastructure(device, [...routers, ...switches]);
      if (nearestInfra) {
        links.push({
          id: `${nearestInfra.id}-${device.id}`,
          source: nearestInfra.id,
          target: device.id,
          type: 'access',
          strength: 1
        });
      }
    });

    return links;
  };

  // Helper function to determine if devices are connected
  const areDevicesConnected = (device1, device2) => {
    const ip1 = device1.ip || '';
    const ip2 = device2.ip || '';
    
    // Same subnet logic (simplified)
    const subnet1 = ip1.split('.').slice(0, 3).join('.');
    const subnet2 = ip2.split('.').slice(0, 3).join('.');
    
    return subnet1 === subnet2;
  };

  // Find nearest router for a device
  const findNearestRouter = (device, routers) => {
    return routers.find(router => areDevicesConnected(device, router)) || routers[0];
  };

  // Find nearest infrastructure device
  const findNearestInfrastructure = (device, infraDevices) => {
    return infraDevices.find(infra => areDevicesConnected(device, infra)) || infraDevices[0];
  };

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(rect.width - 40, 600),
          height: Math.max(rect.height - 40, 400)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Position devices using force-directed layout
  const positionDevices = (devicesData, width, height) => {
    const positioned = devicesData.map((device, index) => {
      let x, y;

      if (viewMode === 'network') {
        // Smart positioning based on device type
        switch (device.type) {
          case 'router':
            x = width / 2 + (Math.random() - 0.5) * 200;
            y = height / 4 + (Math.random() - 0.5) * 100;
            break;
          case 'switch':
            x = width / 4 + (index % 2) * (width / 2) + (Math.random() - 0.5) * 100;
            y = height / 2 + (Math.random() - 0.5) * 100;
            break;
          default:
            x = 100 + (index % 6) * ((width - 200) / 6) + (Math.random() - 0.5) * 50;
            y = height * 0.75 + (Math.random() - 0.5) * 100;
        }
      } else {
        // Grid layout
        const cols = Math.ceil(Math.sqrt(devicesData.length));
        const row = Math.floor(index / cols);
        const col = index % cols;
        x = 50 + col * ((width - 100) / cols);
        y = 50 + row * ((height - 100) / Math.ceil(devicesData.length / cols));
      }

      return { ...device, x, y };
    });

    return positioned;
  };

  // Draw the topology
  const drawTopology = useCallback(() => {
    if (!svgRef.current || devices.length === 0) return;

    const svg = svgRef.current;
    const { width, height } = dimensions;

    // Filter devices based on status
    const filteredDevices = filterStatus === 'all' 
      ? devices 
      : devices.filter(d => d.status === filterStatus);

    const positionedDevices = positionDevices(filteredDevices, width, height);

    // Clear and setup SVG
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `${panOffset.x} ${panOffset.y} ${width / zoomLevel} ${height / zoomLevel}`);

    // Create defs for gradients and filters
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Add drop shadow filter
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'drop-shadow');
    filter.innerHTML = `
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.2)" />
    `;
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Draw links
    links.forEach(link => {
      const sourceDevice = positionedDevices.find(d => d.id === link.source);
      const targetDevice = positionedDevices.find(d => d.id === link.target);

      if (sourceDevice && targetDevice) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sourceDevice.x);
        line.setAttribute('y1', sourceDevice.y);
        line.setAttribute('x2', targetDevice.x);
        line.setAttribute('y2', targetDevice.y);
        line.setAttribute('stroke', getConnectionColor(link.type));
        line.setAttribute('stroke-width', link.strength || 1);
        line.setAttribute('opacity', '0.6');
        line.setAttribute('class', 'topology-link');
        svg.appendChild(line);
      }
    });

    // Draw devices
    positionedDevices.forEach(device => {
      const deviceGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      deviceGroup.setAttribute('class', 'device-node');
      deviceGroup.setAttribute('data-device-id', device.id);

      const config = deviceConfig[device.type] || deviceConfig.unknown;
      const statusConf = statusConfig[device.status] || statusConfig.unknown;

      // Device circle background
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', device.x);
      circle.setAttribute('cy', device.y);
      circle.setAttribute('r', '25');
      circle.setAttribute('fill', config.bgColor);
      circle.setAttribute('stroke', statusConf.color);
      circle.setAttribute('stroke-width', '3');
      circle.setAttribute('filter', 'url(#drop-shadow)');
      circle.setAttribute('class', 'device-circle');

      // Device icon (text)
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('x', device.x);
      icon.setAttribute('y', device.y + 6);
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('font-size', '18');
      icon.setAttribute('fill', config.color);
      icon.textContent = config.icon;

      // Device label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', device.x);
      label.setAttribute('y', device.y + 45);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '12');
      label.setAttribute('fill', '#374151');
      label.setAttribute('font-weight', '500');
      label.textContent = device.name.length > 12 ? device.name.substring(0, 12) + '...' : device.name;

      // Status indicator
      const statusDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      statusDot.setAttribute('cx', device.x + 18);
      statusDot.setAttribute('cy', device.y - 18);
      statusDot.setAttribute('r', '6');
      statusDot.setAttribute('fill', statusConf.color);
      statusDot.setAttribute('stroke', 'white');
      statusDot.setAttribute('stroke-width', '2');

      // Add interactivity
      deviceGroup.addEventListener('click', () => {
        setSelectedDevice(device);
        setShowDeviceModal(true);
      });

      deviceGroup.addEventListener('mouseenter', () => {
        setHoveredNode(device.id);
        deviceGroup.style.cursor = 'pointer';
        circle.setAttribute('r', '28');
        circle.setAttribute('stroke-width', '4');
      });

      deviceGroup.addEventListener('mouseleave', () => {
        setHoveredNode(null);
        circle.setAttribute('r', '25');
        circle.setAttribute('stroke-width', '3');
      });

      deviceGroup.appendChild(circle);
      deviceGroup.appendChild(icon);
      deviceGroup.appendChild(label);
      deviceGroup.appendChild(statusDot);
      svg.appendChild(deviceGroup);
    });

  }, [devices, links, dimensions, viewMode, filterStatus, zoomLevel, panOffset]);

  // Get connection color based on type
  const getConnectionColor = (type) => {
    switch (type) {
      case 'backbone': return '#4f46e5';
      case 'infrastructure': return '#059669';
      case 'access': return '#6b7280';
      default: return '#e5e7eb';
    }
  };

  // Update from real-time data
  useEffect(() => {
    if (realTimeData && realTimeData.devices) {
      const updatedDevices = realTimeData.devices.map(device => ({
        id: device._id || device.id,
        ip: device.ipAddress || device.ip,
        name: device.name || device.hostname || device.ip || 'Unknown',
        type: determineDeviceType(device),
        status: normalizeStatus(device.status),
        metrics: device.metrics || {},
        lastSeen: device.lastSeen,
        manufacturer: device.details?.manufacturer || 'Unknown',
        model: device.details?.model || 'Unknown'
      }));
      
      setDevices(updatedDevices);
      setLinks(generateSmartLinks(updatedDevices));
    }
  }, [realTimeData]);

  // Initial load and draw
  useEffect(() => {
    loadTopologyData();
  }, [loadTopologyData]);

  useEffect(() => {
    drawTopology();
  }, [drawTopology]);

  // Socket event listeners
  useEffect(() => {
    if (socket && connected) {
      const handleDeviceUpdate = (data) => {
        loadTopologyData(); // Refresh topology on device changes
      };

      socket.on('dashboard.deviceAdded', handleDeviceUpdate);
      socket.on('dashboard.deviceDeleted', handleDeviceUpdate);
      socket.on('deviceStatusChanged', handleDeviceUpdate);

      return () => {
        socket.off('dashboard.deviceAdded', handleDeviceUpdate);
        socket.off('dashboard.deviceDeleted', handleDeviceUpdate);
        socket.off('deviceStatusChanged', handleDeviceUpdate);
      };
    }
  }, [socket, connected]);

  // Statistics
  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    routers: devices.filter(d => d.type === 'router').length,
    switches: devices.filter(d => d.type === 'switch').length,
    servers: devices.filter(d => d.type === 'server').length
  };

  return (
    <Container fluid className="topology-container">
      <Row className="mb-4">
        <Col>
          <Card className="modern-card">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">Network Topology</h5>
                <small className="text-muted">Interactive network visualization</small>
              </div>
              <div className="d-flex gap-2">
                <ButtonGroup size="sm">
                  <Button 
                    variant={viewMode === 'network' ? 'primary' : 'outline-primary'}
                    onClick={() => setViewMode('network')}
                  >
                    Network
                  </Button>
                  <Button 
                    variant={viewMode === 'grid' ? 'primary' : 'outline-primary'}
                    onClick={() => setViewMode('grid')}
                  >
                    Grid
                  </Button>
                </ButtonGroup>

                <ButtonGroup size="sm">
                  <Button 
                    variant={filterStatus === 'all' ? 'success' : 'outline-success'}
                    onClick={() => setFilterStatus('all')}
                  >
                    All ({stats.total})
                  </Button>
                  <Button 
                    variant={filterStatus === 'online' ? 'success' : 'outline-success'}
                    onClick={() => setFilterStatus('online')}
                  >
                    Online ({stats.online})
                  </Button>
                  <Button 
                    variant={filterStatus === 'offline' ? 'danger' : 'outline-danger'}
                    onClick={() => setFilterStatus('offline')}
                  >
                    Offline ({stats.offline})
                  </Button>
                </ButtonGroup>

                <Button 
                  size="sm" 
                  variant="outline-primary" 
                  onClick={loadTopologyData}
                  disabled={loading}
                >
                  {loading ? '🔄' : '↻'} Refresh
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0" ref={containerRef}>
              {message.text && (
                <Alert variant={message.type} className="m-3 mb-0">
                  {message.text}
                </Alert>
              )}

              <div className="topology-workspace" style={{ height: '500px', position: 'relative' }}>
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  style={{ background: '#fafafa', borderRadius: '0 0 8px 8px' }}
                >
                </svg>

                {devices.length > 0 && (
                  <div className="topology-legend">
                    <div className="legend-item">
                      <span className="legend-icon router">🔀</span> Router ({stats.routers})
                    </div>
                    <div className="legend-item">
                      <span className="legend-icon switch">⚡</span> Switch ({stats.switches})
                    </div>
                    <div className="legend-item">
                      <span className="legend-icon server">💻</span> Server ({stats.servers})
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Device Details Modal */}
      <Modal show={showDeviceModal} onHide={() => setShowDeviceModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Device Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDevice && (
            <div>
              <Row className="mb-3">
                <Col sm={4}><strong>Name:</strong></Col>
                <Col sm={8}>{selectedDevice.name}</Col>
              </Row>
              <Row className="mb-3">
                <Col sm={4}><strong>IP Address:</strong></Col>
                <Col sm={8}>
                  <code>{selectedDevice.ip}</code>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={4}><strong>Status:</strong></Col>
                <Col sm={8}>
                  <Badge bg={selectedDevice.status === 'online' ? 'success' : 'danger'}>
                    {statusConfig[selectedDevice.status]?.label || 'Unknown'}
                  </Badge>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={4}><strong>Type:</strong></Col>
                <Col sm={8}>
                  <span className="device-type-badge">
                    {deviceConfig[selectedDevice.type]?.icon} {selectedDevice.type}
                  </span>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={4}><strong>Manufacturer:</strong></Col>
                <Col sm={8}>{selectedDevice.manufacturer}</Col>
              </Row>
              <Row className="mb-3">
                <Col sm={4}><strong>Model:</strong></Col>
                <Col sm={8}>{selectedDevice.model}</Col>
              </Row>
              {selectedDevice.metrics?.responseTime && (
                <Row className="mb-3">
                  <Col sm={4}><strong>Response Time:</strong></Col>
                  <Col sm={8}>{selectedDevice.metrics.responseTime}ms</Col>
                </Row>
              )}
              {selectedDevice.lastSeen && (
                <Row className="mb-3">
                  <Col sm={4}><strong>Last Seen:</strong></Col>
                  <Col sm={8}>{new Date(selectedDevice.lastSeen).toLocaleString()}</Col>
                </Row>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Topology;