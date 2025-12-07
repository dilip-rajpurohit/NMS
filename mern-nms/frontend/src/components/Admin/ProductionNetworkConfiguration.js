import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, Table, Badge, Modal, Spinner, Accordion } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ProductionNetworkConfiguration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('overview');

  // Network Configuration Data
  const [networkConfigs, setNetworkConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [devices, setDevices] = useState([]);
  
  // Configuration Form States
  const [vlanConfig, setVlanConfig] = useState({
    id: '',
    name: '',
    description: '',
    subnet: '',
    gateway: '',
    dhcpEnabled: true,
    dhcpRange: { start: '', end: '' },
    vlanType: 'data',
    securityLevel: 'medium'
  });

  const [routingConfig, setRoutingConfig] = useState({
    protocol: 'OSPF',
    area: '0',
    routerId: '',
    networks: [],
    redistribution: [],
    metrics: { bandwidth: 100, delay: 100, reliability: 255, load: 1, mtu: 1500 }
  });

  const [qosConfig, setQosConfig] = useState({
    name: '',
    description: '',
    classes: [],
    policies: [],
    enabled: true,
    bandwidthLimits: { upload: 0, download: 0 }
  });

  const [securityConfig, setSecurityConfig] = useState({
    firewallRules: [],
    accessLists: [],
    vpnConfig: { enabled: false, type: 'IPSec', endpoints: [] },
    authenticationMethod: '802.1X',
    encryptionLevel: 'WPA3-Enterprise'
  });

  // Modals
  const [showVlanModal, setShowVlanModal] = useState(false);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [showQosModal, setShowQosModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [deploymentTargets, setDeploymentTargets] = useState([]);

  // Deployment tracking
  const [deploymentStatus, setDeploymentStatus] = useState({});
  const [configChanges, setConfigChanges] = useState([]);

  // Data fetching functions
  const fetchNetworkConfigurations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/network-config');
      setNetworkConfigs(response.data?.configurations || []);
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to load network configurations'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await api.get('/devices');
      setDevices(response.data?.devices || []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  }, []);

  const fetchConfigurationDetails = useCallback(async (configId) => {
    try {
      setLoading(true);
      const response = await api.get(`/network-config/${configId}`);
      setSelectedConfig(response.data);
      
      // Populate form states with existing configuration
      const config = response.data;
      if (config.vlans) {
        // Set VLAN configurations
      }
      if (config.routing) {
        setRoutingConfig(prev => ({ ...prev, ...config.routing }));
      }
      if (config.qos) {
        setQosConfig(prev => ({ ...prev, ...config.qos }));
      }
      if (config.security) {
        setSecurityConfig(prev => ({ ...prev, ...config.security }));
      }
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to load configuration details'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Effects
  useEffect(() => {
    if (user) {
      fetchNetworkConfigurations();
      fetchDevices();
    }
  }, [user, fetchNetworkConfigurations, fetchDevices]);

  // Event Handlers
  const handleCreateVlanConfig = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/network-config/vlan', vlanConfig);
      setMessage({ type: 'success', text: 'VLAN configuration created successfully!' });
      setShowVlanModal(false);
      fetchNetworkConfigurations();
      setVlanConfig({
        id: '',
        name: '',
        description: '',
        subnet: '',
        gateway: '',
        dhcpEnabled: true,
        dhcpRange: { start: '', end: '' },
        vlanType: 'data',
        securityLevel: 'medium'
      });
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to create VLAN configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoutingConfig = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/network-config/routing', routingConfig);
      setMessage({ type: 'success', text: 'Routing configuration created successfully!' });
      setShowRoutingModal(false);
      fetchNetworkConfigurations();
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to create routing configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQosConfig = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/network-config/qos', qosConfig);
      setMessage({ type: 'success', text: 'QoS configuration created successfully!' });
      setShowQosModal(false);
      fetchNetworkConfigurations();
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to create QoS configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSecurityConfig = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/network-config/security', securityConfig);
      setMessage({ type: 'success', text: 'Security configuration created successfully!' });
      setShowSecurityModal(false);
      fetchNetworkConfigurations();
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to create security configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeployConfiguration = async (configId, targetDevices) => {
    try {
      setLoading(true);
      const response = await api.post(`/network-config/${configId}/deploy`, {
        targetDevices: targetDevices
      });
      
      setMessage({ type: 'success', text: 'Configuration deployment initiated successfully!' });
      setDeploymentStatus(response.data.deploymentStatus);
      setShowDeploymentModal(false);
      
      // Poll for deployment status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await api.get(`/network-config/deployment/${response.data.deploymentId}/status`);
          setDeploymentStatus(statusResponse.data);
          
          if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
            clearInterval(pollInterval);
            if (statusResponse.data.status === 'completed') {
              setMessage({ type: 'success', text: 'Configuration deployed successfully to all devices!' });
            } else {
              setMessage({ type: 'warning', text: 'Configuration deployment completed with some failures. Check device logs.' });
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
        }
      }, 5000);
      
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to deploy configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackupConfiguration = async (configId) => {
    try {
      setLoading(true);
      const response = await api.post(`/network-config/${configId}/backup`);
      setMessage({ type: 'success', text: 'Configuration backup created successfully!' });
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to create configuration backup'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfiguration = async (configId) => {
    if (window.confirm('Are you sure you want to delete this configuration? This action cannot be undone.')) {
      try {
        await api.delete(`/network-config/${configId}`);
        setMessage({ type: 'success', text: 'Configuration deleted successfully!' });
        fetchNetworkConfigurations();
      } catch (error) {
        setMessage({
          type: 'danger',
          text: error.response?.data?.error || 'Failed to delete configuration'
        });
      }
    }
  };

  if (!user) {
    return (
  <Container fluid className="p-2">
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-1"></i>
          Authentication required. Please log in to access network configuration.
        </Alert>
      </Container>
    );
  }

  return (
  <Container fluid className="p-1">
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-gradient-success text-white">
              <Row className="align-items-center">
                <Col>
                  <h4 className="mb-0">
                    <i className="fas fa-network-wired me-1"></i>
                    Network Configuration Management
                  </h4>
                  <small className="text-light">Enterprise-grade network infrastructure configuration and deployment</small>
                </Col>
                <Col xs="auto">
                  <div className="d-flex gap-1">
                    <Button 
                      variant="light" 
                      size="sm"
                      onClick={() => setShowDeploymentModal(true)}
                      disabled={!selectedConfig}
                    >
                      <i className="fas fa-rocket me-1"></i>
                      Deploy
                    </Button>
                    <Button 
                      variant="light" 
                      size="sm"
                      onClick={fetchNetworkConfigurations}
                      disabled={loading}
                    >
                      <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`}></i>
                      Refresh
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body className="p-0">
              {message.text && (
                <Alert 
                  variant={message.type} 
                  dismissible 
                  onClose={() => setMessage({ type: '', text: '' })}
                  className="m-3 mb-0"
                >
                  {message.text}
                </Alert>
              )}

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="nav-pills-custom"
                fill
              >
                {/* Configuration Overview Tab */}
                <Tab eventKey="overview" title={
                  <span><i className="fas fa-tachometer-alt me-1"></i>Configuration Overview</span>
                }>
                  <div className="p-2">
                    {/* Configuration Summary Cards */}
                    <Row className="mb-2">
                      <Col md={3}>
                        <Card className="border-primary text-center h-100">
                          <Card.Body>
                            <h4 className="text-primary">{networkConfigs.length}</h4>
                            <small className="text-muted">Active Configurations</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-success text-center h-100">
                          <Card.Body>
                            <h4 className="text-success">{devices.filter(d => d.status === 'online').length}</h4>
                            <small className="text-muted">Managed Devices</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-info text-center h-100">
                          <Card.Body>
                            <h4 className="text-info">{configChanges.length}</h4>
                            <small className="text-muted">Pending Changes</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-warning text-center h-100">
                          <Card.Body>
                            <h4 className="text-warning">
                              {Object.values(deploymentStatus).filter(s => s === 'in-progress').length}
                            </h4>
                            <small className="text-muted">Deployments in Progress</small>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* Configurations List */}
                    <Card>
                      <Card.Header>
                        <h5 className="mb-0">Network Configurations</h5>
                      </Card.Header>
                      <Card.Body>
                        {networkConfigs.length > 0 ? (
                          <Table striped bordered hover responsive>
                            <thead className="table-dark">
                              <tr>
                                <th>Configuration Name</th>
                                <th>Type</th>
                                <th>Devices</th>
                                <th>Status</th>
                                <th>Last Modified</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {networkConfigs.map((config, index) => (
                                <tr 
                                  key={index}
                                  className={selectedConfig?._id === config._id ? 'table-active' : ''}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => setSelectedConfig(config)}
                                >
                                  <td>
                                    <div className="fw-semibold">{config.name || 'Unnamed Configuration'}</div>
                                    <small className="text-muted">{config.description || 'No description'}</small>
                                  </td>
                                  <td>
                                    <Badge bg="secondary">{config.type || 'General'}</Badge>
                                  </td>
                                  <td>{config.targetDevices?.length || 0}</td>
                                  <td>
                                    <Badge bg={config.status === 'active' ? 'success' : config.status === 'pending' ? 'warning' : 'secondary'}>
                                      {config.status || 'draft'}
                                    </Badge>
                                  </td>
                                  <td>
                                    <small>{config.lastModified ? new Date(config.lastModified).toLocaleString() : 'Unknown'}</small>
                                  </td>
                                  <td>
                                    <div className="d-flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          fetchConfigurationDetails(config._id);
                                        }}
                                      >
                                        <i className="fas fa-edit"></i>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline-info"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleBackupConfiguration(config._id);
                                        }}
                                      >
                                        <i className="fas fa-download"></i>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline-success"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedConfig(config);
                                          setShowDeploymentModal(true);
                                        }}
                                      >
                                        <i className="fas fa-rocket"></i>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline-danger"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteConfiguration(config._id);
                                        }}
                                      >
                                        <i className="fas fa-trash"></i>
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : (
                          <Alert variant="info">
                            <i className="fas fa-info-circle me-1"></i>
                            No network configurations found. Use the tabs above to create VLAN, routing, QoS, or security configurations.
                          </Alert>
                        )}
                      </Card.Body>
                    </Card>
                  </div>
                </Tab>

                {/* VLAN Management Tab */}
                <Tab eventKey="vlans" title={
                  <span><i className="fas fa-sitemap me-1"></i>VLAN Management</span>
                }>
                  <div className="p-2">
                    <Row className="mb-2">
                      <Col>
                        <div className="d-flex justify-content-between align-items-center">
                          <h5>VLAN Configuration</h5>
                          <Button variant="primary" onClick={() => setShowVlanModal(true)}>
                            <i className="fas fa-plus me-1"></i>Create VLAN
                          </Button>
                        </div>
                      </Col>
                    </Row>

                    <Card>
                      <Card.Body>
                        <p className="text-muted mb-2">
                          Manage Virtual Local Area Networks (VLANs) to segment your network traffic and improve security.
                          Configure VLAN IDs, IP ranges, DHCP settings, and security policies for each network segment.
                        </p>
                        
                        <Accordion defaultActiveKey="0">
                          <Accordion.Item eventKey="0">
                            <Accordion.Header>
                              <i className="fas fa-network-wired me-1"></i>
                              Active VLANs
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="info">
                                <i className="fas fa-info-circle me-1"></i>
                                VLAN configurations will be displayed here once created. Each VLAN will show its ID, 
                                name, subnet information, and current device assignments.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>
                          
                          <Accordion.Item eventKey="1">
                            <Accordion.Header>
                              <i className="fas fa-chart-bar me-1"></i>
                              VLAN Traffic Statistics
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="info">
                                <i className="fas fa-chart-line me-1"></i>
                                Traffic statistics and utilization metrics for each VLAN will be available 
                                once monitoring data is collected.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>
                        </Accordion>
                      </Card.Body>
                    </Card>
                  </div>
                </Tab>

                {/* Routing Configuration Tab */}
                <Tab eventKey="routing" title={
                  <span><i className="fas fa-route me-1"></i>Routing & Protocols</span>
                }>
                  <div className="p-2">
                    <Row className="mb-2">
                      <Col>
                        <div className="d-flex justify-content-between align-items-center">
                          <h5>Routing Protocol Configuration</h5>
                          <Button variant="info" onClick={() => setShowRoutingModal(true)}>
                            <i className="fas fa-cog me-1"></i>Configure Routing
                          </Button>
                        </div>
                      </Col>
                    </Row>

                    <Card>
                      <Card.Body>
                        <p className="text-muted mb-2">
                          Configure dynamic routing protocols including OSPF, BGP, and EIGRP. Manage route redistribution, 
                          metrics, and network advertisements for optimal traffic flow and redundancy.
                        </p>

                        <Accordion defaultActiveKey="0">
                          <Accordion.Item eventKey="0">
                            <Accordion.Header>
                              <i className="fas fa-project-diagram me-1"></i>
                              OSPF Configuration
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="info">
                                <i className="fas fa-info-circle me-1"></i>
                                OSPF (Open Shortest Path First) configuration settings will be managed here. 
                                Configure areas, router IDs, network advertisements, and authentication.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>

                          <Accordion.Item eventKey="1">
                            <Accordion.Header>
                              <i className="fas fa-globe me-1"></i>
                              BGP Configuration
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="info">
                                <i className="fas fa-info-circle me-1"></i>
                                Border Gateway Protocol (BGP) settings for external routing and AS path management. 
                                Configure peer relationships, route policies, and prefix filtering.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>

                          <Accordion.Item eventKey="2">
                            <Accordion.Header>
                              <i className="fas fa-route me-1"></i>
                              Static Routes
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="info">
                                <i className="fas fa-info-circle me-1"></i>
                                Manage static routing table entries for specific network destinations. 
                                Configure gateway addresses, metrics, and administrative distances.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>
                        </Accordion>
                      </Card.Body>
                    </Card>
                  </div>
                </Tab>

                {/* QoS Configuration Tab */}
                <Tab eventKey="qos" title={
                  <span><i className="fas fa-tachometer-alt me-1"></i>Quality of Service</span>
                }>
                  <div className="p-2">
                    <Row className="mb-2">
                      <Col>
                        <div className="d-flex justify-content-between align-items-center">
                          <h5>Quality of Service (QoS) Configuration</h5>
                          <Button variant="warning" onClick={() => setShowQosModal(true)}>
                            <i className="fas fa-cog me-1"></i>QoS Policies
                          </Button>
                        </div>
                      </Col>
                    </Row>

                    <Card>
                      <Card.Body>
                        <p className="text-muted mb-2">
                          Implement Quality of Service policies to prioritize critical network traffic, 
                          manage bandwidth allocation, and ensure optimal performance for business-critical applications.
                        </p>

                        <Accordion defaultActiveKey="0">
                          <Accordion.Item eventKey="0">
                            <Accordion.Header>
                              <i className="fas fa-layer-group me-1"></i>
                              Traffic Classes
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="warning">
                                <i className="fas fa-info-circle me-1"></i>
                                Define traffic classification rules based on application type, port numbers, 
                                source/destination addresses, and DSCP markings.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>

                          <Accordion.Item eventKey="1">
                            <Accordion.Header>
                              <i className="fas fa-chart-line me-1"></i>
                              Bandwidth Management
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="warning">
                                <i className="fas fa-info-circle me-1"></i>
                                Configure bandwidth limits, guaranteed rates, and burst allowances for different 
                                traffic classes and user groups.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>

                          <Accordion.Item eventKey="2">
                            <Accordion.Header>
                              <i className="fas fa-sort-amount-up me-1"></i>
                              Priority Queuing
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="warning">
                                <i className="fas fa-info-circle me-1"></i>
                                Implement priority queuing strategies including WFQ, CBWFQ, and LLQ 
                                to ensure time-sensitive traffic receives appropriate treatment.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>
                        </Accordion>
                      </Card.Body>
                    </Card>
                  </div>
                </Tab>

                {/* Security Policies Tab */}
                <Tab eventKey="security" title={
                  <span><i className="fas fa-shield-alt me-2"></i>Security Policies</span>
                }>
                  <div className="p-2">
                    <Row className="mb-2">
                      <Col>
                        <div className="d-flex justify-content-between align-items-center">
                          <h5>Network Security Configuration</h5>
                          <Button variant="danger" onClick={() => setShowSecurityModal(true)}>
                            <i className="fas fa-shield-alt me-1"></i>Configure Security
                          </Button>
                        </div>
                      </Col>
                    </Row>

                    <Card>
                      <Card.Body>
                        <p className="text-muted mb-2">
                          Configure comprehensive network security policies including firewalls, access control lists, 
                          VPN settings, and authentication mechanisms to protect your network infrastructure.
                        </p>

                        <Accordion defaultActiveKey="0">
                          <Accordion.Item eventKey="0">
                            <Accordion.Header>
                              <i className="fas fa-fire me-2"></i>
                              Firewall Rules
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="danger">
                                <i className="fas fa-info-circle me-2"></i>
                                Configure firewall rules to control traffic flow between network segments. 
                                Define allow/deny policies based on source, destination, ports, and protocols.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>

                          <Accordion.Item eventKey="1">
                            <Accordion.Header>
                              <i className="fas fa-key me-2"></i>
                              VPN Configuration
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="danger">
                                <i className="fas fa-info-circle me-2"></i>
                                Set up secure VPN connections for remote access and site-to-site connectivity. 
                                Configure IPSec, SSL VPN, and PPTP tunnel parameters.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>

                          <Accordion.Item eventKey="2">
                            <Accordion.Header>
                              <i className="fas fa-user-shield me-2"></i>
                              Authentication & Access Control
                            </Accordion.Header>
                            <Accordion.Body>
                              <Alert variant="danger">
                                <i className="fas fa-info-circle me-2"></i>
                                Implement 802.1X authentication, RADIUS integration, and MAC address filtering 
                                to control network access and ensure authorized device connectivity.
                              </Alert>
                            </Accordion.Body>
                          </Accordion.Item>
                        </Accordion>
                      </Card.Body>
                    </Card>
                  </div>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* VLAN Configuration Modal */}
      <Modal show={showVlanModal} onHide={() => setShowVlanModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create VLAN Configuration</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateVlanConfig}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>VLAN ID</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="4094"
                    value={vlanConfig.id}
                    onChange={(e) => setVlanConfig({...vlanConfig, id: e.target.value})}
                    required
                    placeholder="e.g., 100"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>VLAN Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={vlanConfig.name}
                    onChange={(e) => setVlanConfig({...vlanConfig, name: e.target.value})}
                    required
                    placeholder="e.g., Guest_Network"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={vlanConfig.description}
                onChange={(e) => setVlanConfig({...vlanConfig, description: e.target.value})}
                placeholder="Brief description of this VLAN's purpose"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Subnet (CIDR)</Form.Label>
                  <Form.Control
                    type="text"
                    value={vlanConfig.subnet}
                    onChange={(e) => setVlanConfig({...vlanConfig, subnet: e.target.value})}
                    required
                    placeholder="e.g., 192.168.100.0/24"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Gateway IP</Form.Label>
                  <Form.Control
                    type="text"
                    value={vlanConfig.gateway}
                    onChange={(e) => setVlanConfig({...vlanConfig, gateway: e.target.value})}
                    required
                    placeholder="e.g., 192.168.100.1"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check 
                type="checkbox" 
                label="Enable DHCP" 
                checked={vlanConfig.dhcpEnabled}
                onChange={(e) => setVlanConfig({...vlanConfig, dhcpEnabled: e.target.checked})}
              />
            </Form.Group>

            {vlanConfig.dhcpEnabled && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>DHCP Range Start</Form.Label>
                    <Form.Control
                      type="text"
                      value={vlanConfig.dhcpRange.start}
                      onChange={(e) => setVlanConfig({
                        ...vlanConfig, 
                        dhcpRange: {...vlanConfig.dhcpRange, start: e.target.value}
                      })}
                      placeholder="e.g., 192.168.100.10"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>DHCP Range End</Form.Label>
                    <Form.Control
                      type="text"
                      value={vlanConfig.dhcpRange.end}
                      onChange={(e) => setVlanConfig({
                        ...vlanConfig, 
                        dhcpRange: {...vlanConfig.dhcpRange, end: e.target.value}
                      })}
                      placeholder="e.g., 192.168.100.200"
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>VLAN Type</Form.Label>
                  <Form.Select
                    value={vlanConfig.vlanType}
                    onChange={(e) => setVlanConfig({...vlanConfig, vlanType: e.target.value})}
                  >
                    <option value="data">Data Network</option>
                    <option value="voice">Voice Network</option>
                    <option value="guest">Guest Network</option>
                    <option value="management">Management Network</option>
                    <option value="dmz">DMZ Network</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Security Level</Form.Label>
                  <Form.Select
                    value={vlanConfig.securityLevel}
                    onChange={(e) => setVlanConfig({...vlanConfig, securityLevel: e.target.value})}
                  >
                    <option value="high">High Security</option>
                    <option value="medium">Medium Security</option>
                    <option value="low">Low Security</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowVlanModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-1"
                  />
                  Creating...
                </>
              ) : (
                'Create VLAN'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Additional modals for Routing, QoS, Security, and Deployment would be implemented similarly */}
      {/* For brevity, showing placeholder for other modals */}
      
      {/* Routing Configuration Modal */}
      <Modal show={showRoutingModal} onHide={() => setShowRoutingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Configure Routing Protocols</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            Routing protocol configuration interface will be implemented here with support for OSPF, BGP, and static routing.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRoutingModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* QoS Configuration Modal */}
      <Modal show={showQosModal} onHide={() => setShowQosModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Quality of Service Configuration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            QoS policy configuration interface will be implemented here with traffic classification, bandwidth management, and priority queuing.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQosModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Security Configuration Modal */}
      <Modal show={showSecurityModal} onHide={() => setShowSecurityModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Network Security Configuration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            Security configuration interface will be implemented here with firewall rules, VPN setup, and authentication policies.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSecurityModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Deployment Modal */}
      <Modal show={showDeploymentModal} onHide={() => setShowDeploymentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Deploy Configuration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <strong>Deployment Warning:</strong> This will apply the selected configuration to target devices. 
            Ensure you have a backup of current configurations before proceeding.
          </Alert>
          
          <Form.Group className="mb-3">
            <Form.Label>Select Target Devices</Form.Label>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {devices.map((device, index) => (
                <Form.Check 
                  key={index}
                  type="checkbox" 
                  id={`device-${device._id}`}
                  label={`${device.name} (${device.ipAddress})`}
                  checked={deploymentTargets.includes(device._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDeploymentTargets([...deploymentTargets, device._id]);
                    } else {
                      setDeploymentTargets(deploymentTargets.filter(id => id !== device._id));
                    }
                  }}
                />
              ))}
            </div>
          </Form.Group>
          
          {deploymentTargets.length === 0 && (
            <Alert variant="warning">
              Please select at least one device for deployment.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeploymentModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={() => handleDeployConfiguration(selectedConfig?._id, deploymentTargets)}
            disabled={loading || deploymentTargets.length === 0}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-1"
                />
                Deploying...
              </>
            ) : (
              'Deploy Configuration'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProductionNetworkConfiguration;