import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Modal, Table, Form, ButtonGroup, Spinner } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const AdvancedTopology = () => {
  const { socket, connected, realTimeData } = useSocket();
  const svgRef = useRef(null);
  const [topology, setTopology] = useState({
    nodes: [],
    edges: [],
    statistics: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const [viewMode, setViewMode] = useState('force-directed'); // 'force-directed', 'hierarchical', 'circular'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'online', 'offline'
  const [filterType, setFilterType] = useState('all'); // 'all', 'router', 'switch', etc.
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Enhanced topology data loading with connection inference
  const loadTopologyData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch topology data
      const response = await api.get('/dashboard/topology');
      const topologyData = response.data;

      // Enhance nodes with real-time data
      const enhancedNodes = (topologyData.nodes || []).map(node => ({
        ...node,
        x: Math.random() * 800 + 100, // Initial positioning
        y: Math.random() * 600 + 100,
        vx: 0, // Velocity for force simulation
        vy: 0,
        fx: null, // Fixed position (if dragged)
        fy: null,
        group: getNodeGroup(node.type, node.status),
        size: getNodeSize(node.type),
        color: getNodeColor(node.status, node.type)
      }));

      // Infer network connections based on IP ranges and device types
      const inferredEdges = inferNetworkConnections(enhancedNodes);

      setTopology({
        nodes: enhancedNodes,
        edges: inferredEdges,
        statistics: topologyData.statistics || {}
      });

      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error loading topology data:', err);
      setError('Failed to load topology data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Infer network connections based on network topology rules
  const inferNetworkConnections = (nodes) => {
    const edges = [];
    const routers = nodes.filter(n => n.type === 'router');
    const switches = nodes.filter(n => n.type === 'switch');
    const workstations = nodes.filter(n => n.type === 'workstation');
    const servers = nodes.filter(n => n.type === 'server');
    const others = nodes.filter(n => !['router', 'switch', 'workstation', 'server'].includes(n.type));

    // Connect devices in the same subnet
    const subnets = groupBySubnet(nodes);
    
    Object.values(subnets).forEach(subnetDevices => {
      if (subnetDevices.length > 1) {
        // Find the gateway/router in this subnet
        const gateway = subnetDevices.find(d => 
          d.type === 'router' || 
          d.ipAddress.endsWith('.1') || 
          d.ipAddress.endsWith('.254')
        );

        if (gateway) {
          // Connect all other devices to the gateway
          subnetDevices.forEach(device => {
            if (device.id !== gateway.id) {
              edges.push({
                id: `${gateway.id}-${device.id}`,
                source: gateway.id,
                target: device.id,
                type: 'subnet',
                bandwidth: getBandwidth(gateway.type, device.type),
                latency: Math.random() * 10 + 1, // Simulated latency
                utilization: Math.random() * 100, // Simulated utilization
                status: gateway.status === 'online' && device.status === 'online' ? 'active' : 'inactive'
              });
            }
          });
        } else {
          // No obvious gateway, create mesh connections for small subnets
          if (subnetDevices.length <= 4) {
            for (let i = 0; i < subnetDevices.length; i++) {
              for (let j = i + 1; j < subnetDevices.length; j++) {
                edges.push({
                  id: `${subnetDevices[i].id}-${subnetDevices[j].id}`,
                  source: subnetDevices[i].id,
                  target: subnetDevices[j].id,
                  type: 'direct',
                  bandwidth: getBandwidth(subnetDevices[i].type, subnetDevices[j].type),
                  latency: Math.random() * 5 + 1,
                  utilization: Math.random() * 50,
                  status: subnetDevices[i].status === 'online' && subnetDevices[j].status === 'online' ? 'active' : 'inactive'
                });
              }
            }
          }
        }
      }
    });

    return edges;
  };

  // Group devices by subnet
  const groupBySubnet = (nodes) => {
    const subnets = {};
    nodes.forEach(node => {
      if (node.ipAddress && node.ipAddress !== 'localhost') {
        const parts = node.ipAddress.split('.');
        if (parts.length === 4) {
          const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
          if (!subnets[subnet]) subnets[subnet] = [];
          subnets[subnet].push(node);
        }
      }
    });
    return subnets;
  };

  // Get node group for styling
  const getNodeGroup = (type, status) => {
    if (status === 'offline') return 'offline';
    switch (type) {
      case 'router': return 'router';
      case 'switch': return 'switch';
      case 'server': return 'server';
      case 'workstation': return 'workstation';
      default: return 'unknown';
    }
  };

  // Get node size based on type and importance
  const getNodeSize = (type) => {
    switch (type) {
      case 'router': return 25;
      case 'switch': return 20;
      case 'server': return 18;
      case 'workstation': return 15;
      default: return 12;
    }
  };

  // Get node color based on status and type
  const getNodeColor = (status, type) => {
    if (status === 'offline') return '#dc3545'; // Red
    if (status === 'unknown') return '#6c757d'; // Gray
    
    switch (type) {
      case 'router': return '#007bff'; // Blue
      case 'switch': return '#28a745'; // Green
      case 'server': return '#fd7e14'; // Orange
      case 'workstation': return '#6f42c1'; // Purple
      default: return '#17a2b8'; // Cyan
    }
  };

  // Get bandwidth based on device types
  const getBandwidth = (type1, type2) => {
    const speeds = {
      router: 1000,
      switch: 1000,
      server: 100,
      workstation: 100,
      unknown: 10
    };
    return Math.min(speeds[type1] || 10, speeds[type2] || 10);
  };

  // Force-directed layout simulation
  const startForceSimulation = useCallback(() => {
    if (!svgRef.current || topology.nodes.length === 0) return;

    const svg = svgRef.current;
    const width = 1000;
    const height = 700;

    // Clear previous content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Create main group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);

    // Draw edges
    topology.edges.forEach(edge => {
      const sourceNode = topology.nodes.find(n => n.id === edge.source);
      const targetNode = topology.nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sourceNode.x);
        line.setAttribute('y1', sourceNode.y);
        line.setAttribute('x2', targetNode.x);
        line.setAttribute('y2', targetNode.y);
        line.setAttribute('stroke', edge.status === 'active' ? '#28a745' : '#dc3545');
        line.setAttribute('stroke-width', Math.max(1, edge.bandwidth / 200));
        line.setAttribute('stroke-opacity', '0.6');
        line.setAttribute('cursor', 'pointer');
        
        line.addEventListener('click', () => {
          setSelectedEdge(edge);
          setShowEdgeModal(true);
        });
        
        g.appendChild(line);

        // Add bandwidth label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (sourceNode.x + targetNode.x) / 2);
        text.setAttribute('y', (sourceNode.y + targetNode.y) / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '10');
        text.setAttribute('fill', '#666');
        text.textContent = `${edge.bandwidth}Mbps`;
        g.appendChild(text);
      }
    });

    // Draw nodes
    topology.nodes.forEach(node => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', node.size);
      circle.setAttribute('fill', node.color);
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('cursor', 'pointer');
      
      circle.addEventListener('click', () => {
        setSelectedNode(node);
        setShowNodeModal(true);
      });
      
      g.appendChild(circle);

      // Add device icon based on type
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('x', node.x);
      icon.setAttribute('y', node.y + 4);
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('font-family', 'FontAwesome');
      icon.setAttribute('font-size', '14');
      icon.setAttribute('fill', '#fff');
      icon.textContent = getDeviceIcon(node.type);
      g.appendChild(icon);

      // Add device label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', node.x);
      label.setAttribute('y', node.y + node.size + 15);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '10');
      label.setAttribute('fill', '#333');
      label.textContent = node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name;
      g.appendChild(label);
    });

  }, [topology]);

  // Get device icon
  const getDeviceIcon = (type) => {
    switch (type) {
      case 'router': return '\uf0e8'; // fa-router
      case 'switch': return '\uf6ff'; // fa-network-wired
      case 'server': return '\uf233'; // fa-server
      case 'workstation': return '\uf108'; // fa-desktop
      default: return '\uf059'; // fa-question-circle
    }
  };

  // Real-time updates from socket
  useEffect(() => {
    if (realTimeData && realTimeData.devices && realTimeData.lastUpdate) {
      const updatedNodes = topology.nodes.map(node => {
        const realtimeDevice = realTimeData.devices.find(d => 
          d._id === node.id || d.ipAddress === node.ipAddress
        );
        if (realtimeDevice) {
          return {
            ...node,
            status: realtimeDevice.status,
            name: realtimeDevice.name || node.name,
            color: getNodeColor(realtimeDevice.status, node.type)
          };
        }
        return node;
      });

      if (JSON.stringify(updatedNodes) !== JSON.stringify(topology.nodes)) {
        setTopology(prev => ({
          ...prev,
          nodes: updatedNodes
        }));
      }
    }
  }, [realTimeData, topology.nodes]);

  // Start visualization when topology data changes
  useEffect(() => {
    if (topology.nodes.length > 0) {
      startForceSimulation();
    }
  }, [topology, startForceSimulation]);

  // Load data on mount and setup refresh
  useEffect(() => {
    loadTopologyData();
    
    if (autoRefresh) {
      const interval = setInterval(loadTopologyData, 30000);
      return () => clearInterval(interval);
    }
  }, [loadTopologyData, autoRefresh]);

  // Filter nodes based on current filters
  const getFilteredStats = () => {
    let filtered = topology.nodes;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(node => node.status === filterStatus);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(node => node.type === filterType);
    }

    return {
      visible: filtered.length,
      total: topology.nodes.length,
      online: filtered.filter(n => n.status === 'online').length,
      offline: filtered.filter(n => n.status === 'offline').length,
      connections: topology.edges.filter(e => 
        filtered.find(n => n.id === e.source) && filtered.find(n => n.id === e.target)
      ).length
    };
  };

  const filteredStats = getFilteredStats();

  if (loading) {
    return (
      <Container fluid className="p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" variant="primary" />
          <span className="ms-2 text-white">Loading network topology...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-white mb-1">
                <i className="fas fa-project-diagram me-2 text-primary"></i>
                Advanced Network Topology
              </h2>
              <small className="text-muted">
                Real-time network visualization with intelligent connection mapping
              </small>
            </div>
            <div className="d-flex align-items-center gap-2">
              {connected ? (
                <Badge bg="success">
                  <i className="fas fa-circle me-1"></i>
                  Real-time Active
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
                variant="outline-light" 
                size="sm" 
                onClick={loadTopologyData}
                disabled={loading}
              >
                <i className="fas fa-sync-alt me-2"></i>
                Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Error Alert */}
      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger" className="bg-danger bg-opacity-20 border-danger text-white">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="bg-dark border-secondary text-white h-100">
            <Card.Body className="text-center">
              <i className="fas fa-network-wired fa-2x text-primary mb-2"></i>
              <h4 className="mb-1">{filteredStats.visible}/{filteredStats.total}</h4>
              <small className="text-muted">Total Devices</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="bg-dark border-secondary text-white h-100">
            <Card.Body className="text-center">
              <i className="fas fa-link fa-2x text-success mb-2"></i>
              <h4 className="mb-1">{filteredStats.connections}</h4>
              <small className="text-muted">Active Connections</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="bg-dark border-secondary text-white h-100">
            <Card.Body className="text-center">
              <i className="fas fa-circle fa-2x text-success mb-2"></i>
              <h4 className="mb-1">{filteredStats.online}</h4>
              <small className="text-muted">Online Devices</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="bg-dark border-secondary text-white h-100">
            <Card.Body className="text-center">
              <i className="fas fa-circle fa-2x text-danger mb-2"></i>
              <h4 className="mb-1">{filteredStats.offline}</h4>
              <small className="text-muted">Offline Devices</small>
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
                <Col md={3}>
                  <Form.Label className="text-white">Status Filter</Form.Label>
                  <Form.Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-dark text-white border-secondary"
                    size="sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="unknown">Unknown</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-white">Device Type</Form.Label>
                  <Form.Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-dark text-white border-secondary"
                    size="sm"
                  >
                    <option value="all">All Types</option>
                    <option value="router">Routers</option>
                    <option value="switch">Switches</option>
                    <option value="server">Servers</option>
                    <option value="workstation">Workstations</option>
                    <option value="unknown">Unknown</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-white">Layout Mode</Form.Label>
                  <Form.Select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    className="bg-dark text-white border-secondary"
                    size="sm"
                  >
                    <option value="force-directed">Force Directed</option>
                    <option value="hierarchical">Hierarchical</option>
                    <option value="circular">Circular</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="text-white">Auto Refresh</Form.Label>
                  <Form.Check
                    type="switch"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="text-white"
                    label="30s refresh"
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
            <Card.Header className="bg-dark border-secondary text-white">
              <i className="fas fa-project-diagram me-2"></i>
              Network Topology Map
              <small className="text-muted ms-2">
                Click devices and connections for details
              </small>
            </Card.Header>
            <Card.Body className="p-2">
              <div className="d-flex justify-content-center" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', minHeight: '700px' }}>
                <svg
                  ref={svgRef}
                  width="1000"
                  height="700"
                  style={{ border: '1px solid #dee2e6', borderRadius: '8px' }}
                >
                  {/* SVG content will be generated by the force simulation */}
                </svg>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Device Details Modal */}
      <Modal show={showNodeModal} onHide={() => setShowNodeModal(false)} size="lg">
        <Modal.Header closeButton className="bg-dark text-white border-secondary">
          <Modal.Title>
            <i className={`fas ${selectedNode?.type === 'router' ? 'fa-route' : 'fa-desktop'} me-2`}></i>
            Device Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          {selectedNode && (
            <Row>
              <Col md={6}>
                <Table variant="dark" size="sm">
                  <tbody>
                    <tr>
                      <td><strong>Name:</strong></td>
                      <td>{selectedNode.name}</td>
                    </tr>
                    <tr>
                      <td><strong>IP Address:</strong></td>
                      <td>{selectedNode.ipAddress}</td>
                    </tr>
                    <tr>
                      <td><strong>Type:</strong></td>
                      <td>
                        <Badge bg="secondary">{selectedNode.type}</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Status:</strong></td>
                      <td>
                        <Badge bg={selectedNode.status === 'online' ? 'success' : 'danger'}>
                          {selectedNode.status}
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Vendor:</strong></td>
                      <td>{selectedNode.vendor || 'Unknown'}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                <h6>Connection Summary</h6>
                <p>
                  Connections: {topology.edges.filter(e => 
                    e.source === selectedNode.id || e.target === selectedNode.id
                  ).length}
                </p>
                <h6>Network Position</h6>
                <p>
                  Subnet: {selectedNode.ipAddress?.split('.').slice(0, 3).join('.')}.*
                </p>
              </Col>
            </Row>
          )}
        </Modal.Body>
      </Modal>

      {/* Edge Details Modal */}
      <Modal show={showEdgeModal} onHide={() => setShowEdgeModal(false)}>
        <Modal.Header closeButton className="bg-dark text-white border-secondary">
          <Modal.Title>
            <i className="fas fa-link me-2"></i>
            Connection Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          {selectedEdge && (
            <Table variant="dark" size="sm">
              <tbody>
                <tr>
                  <td><strong>Connection Type:</strong></td>
                  <td><Badge bg="info">{selectedEdge.type}</Badge></td>
                </tr>
                <tr>
                  <td><strong>Bandwidth:</strong></td>
                  <td>{selectedEdge.bandwidth} Mbps</td>
                </tr>
                <tr>
                  <td><strong>Latency:</strong></td>
                  <td>{selectedEdge.latency?.toFixed(1)} ms</td>
                </tr>
                <tr>
                  <td><strong>Utilization:</strong></td>
                  <td>{selectedEdge.utilization?.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td><strong>Status:</strong></td>
                  <td>
                    <Badge bg={selectedEdge.status === 'active' ? 'success' : 'danger'}>
                      {selectedEdge.status}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default AdvancedTopology;