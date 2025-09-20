import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, Table, Badge, Modal } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatBytes, getStatusBadge } from '../../utils/common';

const NetworkConfiguration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('interfaces');

  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vlans, setVlans] = useState([]);
  const [subnets, setSubnets] = useState([]);

  const [showInterfaceModal, setShowInterfaceModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showVlanModal, setShowVlanModal] = useState(false);
  const [showSubnetModal, setShowSubnetModal] = useState(false);

  const [selectedInterface, setSelectedInterface] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedVlan, setSelectedVlan] = useState(null);
  const [selectedSubnet, setSelectedSubnet] = useState(null);

  const [interfaceForm, setInterfaceForm] = useState({
    name: '',
    ip: '',
    subnet: '',
    gateway: '',
    mtu: 1500,
    status: 'active',
    description: ''
  });

  const [routeForm, setRouteForm] = useState({
    destination: '',
    gateway: '',
    interface: '',
    metric: 1,
    type: 'static'
  });

  const [vlanForm, setVlanForm] = useState({
    id: '',
    name: '',
    description: '',
    ports: '',
    status: 'active'
  });

  const [subnetForm, setSubnetForm] = useState({
    network: '',
    subnet: '',
    vlan: '',
    gateway: '',
    dhcp: false,
    dhcpStart: '',
    dhcpEnd: '',
    description: ''
  });

  const [networkStats, setNetworkStats] = useState({
    totalInterfaces: 0,
    activeInterfaces: 0,
    totalRoutes: 0,
    totalVlans: 0,
    totalSubnets: 0,
    trafficIn: 0,
    trafficOut: 0
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchNetworkConfiguration();
      fetchNetworkStats();
    }
  }, [user]);

  const fetchNetworkConfiguration = async () => {
    try {
      setLoading(true);
      
      const [interfacesRes, routesRes, vlansRes, subnetsRes] = await Promise.all([
        api.get('/admin/network/interfaces'),
        api.get('/admin/network/routes'),
        api.get('/admin/network/vlans'),
        api.get('/admin/network/subnets')
      ]);

      setNetworkInterfaces(interfacesRes.data || []);
      setRoutes(routesRes.data || []);
      setVlans(vlansRes.data || []);
      setSubnets(subnetsRes.data || []);
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to load network configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworkStats = async () => {
    try {
      const response = await api.get('/admin/network/stats');
      setNetworkStats(response.data);
    } catch (error) {
      console.error('Failed to fetch network stats:', error);
    }
  };

  const handleCreateInterface = () => {
    setSelectedInterface(null);
    setInterfaceForm({
      name: '',
      ip: '',
      subnet: '',
      gateway: '',
      mtu: 1500,
      status: 'active',
      description: ''
    });
    setShowInterfaceModal(true);
  };

  const handleEditInterface = (iface) => {
    setSelectedInterface(iface);
    setInterfaceForm(iface);
    setShowInterfaceModal(true);
  };

  const handleSaveInterface = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (selectedInterface) {
        await api.put(`/admin/network/interfaces/${selectedInterface.id}`, interfaceForm);
        setMessage({ type: 'success', text: 'Interface updated successfully!' });
      } else {
        await api.post('/admin/network/interfaces', interfaceForm);
        setMessage({ type: 'success', text: 'Interface created successfully!' });
      }
      
      setShowInterfaceModal(false);
      fetchNetworkConfiguration();
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to save interface'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInterface = async (id) => {
    if (window.confirm('Are you sure you want to delete this interface?')) {
      try {
        await api.delete(`/admin/network/interfaces/${id}`);
        setMessage({ type: 'success', text: 'Interface deleted successfully!' });
        fetchNetworkConfiguration();
      } catch (error) {
        setMessage({
          type: 'danger',
          text: error.response?.data?.error || 'Failed to delete interface'
        });
      }
    }
  };

  const handleCreateRoute = () => {
    setSelectedRoute(null);
    setRouteForm({
      destination: '',
      gateway: '',
      interface: '',
      metric: 1,
      type: 'static'
    });
    setShowRouteModal(true);
  };

  const handleEditRoute = (route) => {
    setSelectedRoute(route);
    setRouteForm(route);
    setShowRouteModal(true);
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (selectedRoute) {
        await api.put(`/admin/network/routes/${selectedRoute.id}`, routeForm);
        setMessage({ type: 'success', text: 'Route updated successfully!' });
      } else {
        await api.post('/admin/network/routes', routeForm);
        setMessage({ type: 'success', text: 'Route created successfully!' });
      }
      
      setShowRouteModal(false);
      fetchNetworkConfiguration();
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.error || 'Failed to save route'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (id) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await api.delete(`/admin/network/routes/${id}`);
        setMessage({ type: 'success', text: 'Route deleted successfully!' });
        fetchNetworkConfiguration();
      } catch (error) {
        setMessage({
          type: 'danger',
          text: error.response?.data?.error || 'Failed to delete route'
        });
      }
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          You don't have permission to access this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-network-wired me-2"></i>
                Network Configuration
              </h4>
            </Card.Header>

            <Card.Body>
              {message.text && (
                <Alert 
                  variant={message.type} 
                  dismissible 
                  onClose={() => setMessage({ type: '', text: '' })}
                >
                  {message.text}
                </Alert>
              )}

              {/* Network Statistics */}
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h3 className="text-primary">{networkStats.totalInterfaces}</h3>
                      <small className="text-muted">Total Interfaces</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h3 className="text-success">{networkStats.activeInterfaces}</h3>
                      <small className="text-muted">Active Interfaces</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h3 className="text-info">{formatBytes(networkStats.trafficIn)}</h3>
                      <small className="text-muted">Traffic In</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h3 className="text-warning">{formatBytes(networkStats.trafficOut)}</h3>
                      <small className="text-muted">Traffic Out</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
              >
                {/* Network Interfaces Tab */}
                <Tab eventKey="interfaces" title={
                  <>
                    <i className="fas fa-ethernet me-1"></i>
                    Interfaces
                  </>
                }>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>Network Interfaces</h5>
                    <Button variant="primary" onClick={handleCreateInterface}>
                      <i className="fas fa-plus me-1"></i>
                      Add Interface
                    </Button>
                  </div>

                  <Table responsive striped>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>IP Address</th>
                        <th>Subnet</th>
                        <th>Gateway</th>
                        <th>MTU</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkInterfaces.map((iface) => (
                        <tr key={iface.id}>
                          <td><strong>{iface.name}</strong></td>
                          <td>{iface.ip}</td>
                          <td>{iface.subnet}</td>
                          <td>{iface.gateway || 'N/A'}</td>
                          <td>{iface.mtu}</td>
                          <td>
                            {getStatusBadge(iface.status)}
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditInterface(iface)}
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteInterface(iface.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {networkInterfaces.length === 0 && (
                        <tr>
                          <td colSpan="7" className="text-center text-muted">
                            No network interfaces configured
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Tab>

                {/* Routing Table Tab */}
                <Tab eventKey="routes" title={
                  <>
                    <i className="fas fa-route me-1"></i>
                    Routes
                  </>
                }>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>Routing Table</h5>
                    <Button variant="primary" onClick={handleCreateRoute}>
                      <i className="fas fa-plus me-1"></i>
                      Add Route
                    </Button>
                  </div>

                  <Table responsive striped>
                    <thead>
                      <tr>
                        <th>Destination</th>
                        <th>Gateway</th>
                        <th>Interface</th>
                        <th>Metric</th>
                        <th>Type</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.map((route) => (
                        <tr key={route.id}>
                          <td>{route.destination}</td>
                          <td>{route.gateway}</td>
                          <td>{route.interface}</td>
                          <td>{route.metric}</td>
                          <td>
                            <Badge bg={route.type === 'static' ? 'primary' : 'info'}>
                              {route.type}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditRoute(route)}
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteRoute(route.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {routes.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center text-muted">
                            No routes configured
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Tab>

                {/* VLANs Tab */}
                <Tab eventKey="vlans" title={
                  <>
                    <i className="fas fa-layer-group me-1"></i>
                    VLANs
                  </>
                }>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>VLAN Configuration</h5>
                    <Button variant="primary" onClick={() => setShowVlanModal(true)}>
                      <i className="fas fa-plus me-1"></i>
                      Add VLAN
                    </Button>
                  </div>

                  <Table responsive striped>
                    <thead>
                      <tr>
                        <th>VLAN ID</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Ports</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vlans.map((vlan) => (
                        <tr key={vlan.id}>
                          <td><Badge bg="primary">{vlan.vlanId}</Badge></td>
                          <td><strong>{vlan.name}</strong></td>
                          <td>{vlan.description}</td>
                          <td>{vlan.ports}</td>
                          <td>
                            <Badge bg={vlan.status === 'active' ? 'success' : 'secondary'}>
                              {vlan.status}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {vlans.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center text-muted">
                            No VLANs configured
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Tab>

                {/* Subnets Tab */}
                <Tab eventKey="subnets" title={
                  <>
                    <i className="fas fa-sitemap me-1"></i>
                    Subnets
                  </>
                }>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>Subnet Configuration</h5>
                    <Button variant="primary" onClick={() => setShowSubnetModal(true)}>
                      <i className="fas fa-plus me-1"></i>
                      Add Subnet
                    </Button>
                  </div>

                  <Table responsive striped>
                    <thead>
                      <tr>
                        <th>Network</th>
                        <th>Subnet Mask</th>
                        <th>VLAN</th>
                        <th>Gateway</th>
                        <th>DHCP</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subnets.map((subnet) => (
                        <tr key={subnet.id}>
                          <td><strong>{subnet.network}</strong></td>
                          <td>{subnet.subnet}</td>
                          <td>{subnet.vlan ? <Badge bg="info">{subnet.vlan}</Badge> : 'N/A'}</td>
                          <td>{subnet.gateway}</td>
                          <td>
                            <Badge bg={subnet.dhcp ? 'success' : 'secondary'}>
                              {subnet.dhcp ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </td>
                          <td>{subnet.description}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {subnets.length === 0 && (
                        <tr>
                          <td colSpan="7" className="text-center text-muted">
                            No subnets configured
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Interface Modal */}
      <Modal show={showInterfaceModal} onHide={() => setShowInterfaceModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedInterface ? 'Edit Interface' : 'Create Interface'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveInterface}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Interface Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={interfaceForm.name}
                    onChange={(e) => setInterfaceForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>IP Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={interfaceForm.ip}
                    onChange={(e) => setInterfaceForm(prev => ({ ...prev, ip: e.target.value }))}
                    placeholder="192.168.1.1"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Subnet Mask</Form.Label>
                  <Form.Control
                    type="text"
                    value={interfaceForm.subnet}
                    onChange={(e) => setInterfaceForm(prev => ({ ...prev, subnet: e.target.value }))}
                    placeholder="255.255.255.0 or /24"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Gateway</Form.Label>
                  <Form.Control
                    type="text"
                    value={interfaceForm.gateway}
                    onChange={(e) => setInterfaceForm(prev => ({ ...prev, gateway: e.target.value }))}
                    placeholder="192.168.1.1"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>MTU</Form.Label>
                  <Form.Control
                    type="number"
                    value={interfaceForm.mtu}
                    onChange={(e) => setInterfaceForm(prev => ({ ...prev, mtu: parseInt(e.target.value) }))}
                    min="68"
                    max="9000"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={interfaceForm.status}
                    onChange={(e) => setInterfaceForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={interfaceForm.description}
                onChange={(e) => setInterfaceForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Interface description"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInterfaceModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving...' : (selectedInterface ? 'Update' : 'Create')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Route Modal */}
      <Modal show={showRouteModal} onHide={() => setShowRouteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedRoute ? 'Edit Route' : 'Create Route'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveRoute}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Destination</Form.Label>
              <Form.Control
                type="text"
                value={routeForm.destination}
                onChange={(e) => setRouteForm(prev => ({ ...prev, destination: e.target.value }))}
                placeholder="0.0.0.0/0 or 192.168.1.0/24"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Gateway</Form.Label>
              <Form.Control
                type="text"
                value={routeForm.gateway}
                onChange={(e) => setRouteForm(prev => ({ ...prev, gateway: e.target.value }))}
                placeholder="192.168.1.1"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Interface</Form.Label>
              <Form.Select
                value={routeForm.interface}
                onChange={(e) => setRouteForm(prev => ({ ...prev, interface: e.target.value }))}
                required
              >
                <option value="">Select Interface</option>
                {networkInterfaces.map((iface) => (
                  <option key={iface.name} value={iface.name}>
                    {iface.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Metric</Form.Label>
                  <Form.Control
                    type="number"
                    value={routeForm.metric}
                    onChange={(e) => setRouteForm(prev => ({ ...prev, metric: parseInt(e.target.value) }))}
                    min="1"
                    max="255"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Select
                    value={routeForm.type}
                    onChange={(e) => setRouteForm(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="static">Static</option>
                    <option value="dynamic">Dynamic</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRouteModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving...' : (selectedRoute ? 'Update' : 'Create')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default NetworkConfiguration;