import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const Discovery = () => {
  const [discoveryConfig, setDiscoveryConfig] = useState({
    subnet: '192.168.1.0/24',
    method: 'ping',
    enableSnmp: false,
    snmpCommunity: 'public',
    timeout: 5000
  });
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const { connected } = useSocket();

  useEffect(() => {
    // Load saved discovery configuration
    loadDiscoveryConfig();
  }, []);

  const loadDiscoveryConfig = async () => {
    try {
      const response = await api.get('/api/discovery/config');
      if (response.data) {
        setDiscoveryConfig(response.data);
      }
    } catch (err) {
      console.log('No saved config found, using defaults');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDiscoveryConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const startDiscovery = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setSuccess(null);
      setResults([]);

      const response = await api.post('/api/discovery/start', discoveryConfig);
      
      if (response.data.success) {
        setSuccess('Discovery started successfully! Results will appear below.');
        
        // Poll for results every 2 seconds
        const pollInterval = setInterval(async () => {
          try {
            const resultsResponse = await api.get('/api/discovery/results');
            setResults(resultsResponse.data);
            
            // Check if discovery is complete
            const statusResponse = await api.get('/api/discovery/status');
            if (!statusResponse.data.running) {
              clearInterval(pollInterval);
              setIsRunning(false);
              setSuccess('Discovery completed successfully!');
            }
          } catch (err) {
            console.error('Error polling results:', err);
          }
        }, 2000);

        // Stop polling after 5 minutes max
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsRunning(false);
        }, 300000);

      } else {
        setError('Failed to start discovery');
        setIsRunning(false);
      }
    } catch (err) {
      console.error('Discovery error:', err);
      setError(err.response?.data?.message || 'Failed to start discovery');
      setIsRunning(false);
    }
  };

  const stopDiscovery = async () => {
    try {
      await api.post('/api/discovery/stop');
      setIsRunning(false);
      setSuccess('Discovery stopped');
    } catch (err) {
      console.error('Error stopping discovery:', err);
      setError('Failed to stop discovery');
    }
  };

  const saveDevices = async () => {
    try {
      const response = await api.post('/api/discovery/save', { devices: results });
      setSuccess(`Saved ${response.data.saved} devices to database`);
    } catch (err) {
      console.error('Error saving devices:', err);
      setError('Failed to save devices');
    }
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Network Discovery</h2>
              <p className="text-muted mb-0">Automatically discover devices on your network</p>
            </div>
            <div>
              <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
                {connected ? 'System Online' : 'System Offline'}
              </span>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}

      {success && (
        <Row className="mb-4">
          <Col>
            <Alert variant="success">{success}</Alert>
          </Col>
        </Row>
      )}

      <Row>
        <Col lg={4}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0">
              <h5 className="mb-0">
                <i className="fas fa-cog me-2"></i>
                Discovery Settings
              </h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Network Subnet</Form.Label>
                  <Form.Control
                    type="text"
                    name="subnet"
                    value={discoveryConfig.subnet}
                    onChange={handleInputChange}
                    placeholder="e.g., 192.168.1.0/24"
                    disabled={isRunning}
                  />
                  <Form.Text className="text-muted">
                    CIDR notation for the network to scan
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Discovery Method</Form.Label>
                  <Form.Select
                    name="method"
                    value={discoveryConfig.method}
                    onChange={handleInputChange}
                    disabled={isRunning}
                  >
                    <option value="ping">Ping Sweep</option>
                    <option value="arp">ARP Scan</option>
                    <option value="snmp">SNMP Walk</option>
                    <option value="combined">Combined</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="enableSnmp"
                    label="Enable SNMP Discovery"
                    checked={discoveryConfig.enableSnmp}
                    onChange={handleInputChange}
                    disabled={isRunning}
                  />
                </Form.Group>

                {discoveryConfig.enableSnmp && (
                  <Form.Group className="mb-3">
                    <Form.Label>SNMP Community</Form.Label>
                    <Form.Control
                      type="text"
                      name="snmpCommunity"
                      value={discoveryConfig.snmpCommunity}
                      onChange={handleInputChange}
                      placeholder="public"
                      disabled={isRunning}
                    />
                  </Form.Group>
                )}

                <Form.Group className="mb-4">
                  <Form.Label>Timeout (ms)</Form.Label>
                  <Form.Control
                    type="number"
                    name="timeout"
                    value={discoveryConfig.timeout}
                    onChange={handleInputChange}
                    min="1000"
                    max="30000"
                    disabled={isRunning}
                  />
                </Form.Group>

                <div className="d-grid gap-2">
                  {!isRunning ? (
                    <Button
                      variant="primary"
                      onClick={startDiscovery}
                      disabled={!connected}
                    >
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
        </Col>

        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-search me-2"></i>
                  Discovery Results
                  {results.length > 0 && (
                    <span className="badge bg-primary ms-2">{results.length}</span>
                  )}
                </h5>
                {results.length > 0 && !isRunning && (
                  <Button variant="success" size="sm" onClick={saveDevices}>
                    <i className="fas fa-save me-1"></i>
                    Save Devices
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {isRunning && (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Discovering...</span>
                  </div>
                  <p className="mt-2 text-muted">Scanning network for devices...</p>
                </div>
              )}

              {!isRunning && results.length === 0 && (
                <div className="text-center p-5">
                  <i className="fas fa-search fs-1 text-muted mb-3"></i>
                  <h5 className="text-muted">No devices discovered yet</h5>
                  <p className="text-muted">Configure settings and start discovery to find network devices</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>IP Address</th>
                        <th>Hostname</th>
                        <th>MAC Address</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Response Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((device, index) => (
                        <tr key={index}>
                          <td>
                            <code>{device.ip}</code>
                          </td>
                          <td>
                            {device.hostname || (
                              <span className="text-muted">Unknown</span>
                            )}
                          </td>
                          <td>
                            {device.mac ? (
                              <code>{device.mac}</code>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <span className="text-capitalize">
                              {device.type || 'Unknown'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              device.status === 'up' ? 'bg-success' : 'bg-danger'
                            }`}>
                              {device.status || 'Unknown'}
                            </span>
                          </td>
                          <td>
                            {device.responseTime ? (
                              <span>{device.responseTime}ms</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Discovery;