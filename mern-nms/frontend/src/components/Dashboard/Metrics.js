import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Alert } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const Metrics = () => {
  const [metrics, setMetrics] = useState({});
  const [selectedDevice, setSelectedDevice] = useState('');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { connected } = useSocket();

  useEffect(() => {
    fetchDevices();
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchDeviceMetrics(selectedDevice);
    }
  }, [selectedDevice]);

  const fetchDevices = async () => {
    try {
      const response = await api.get('/api/devices');
      setDevices(response.data);
      if (response.data.length > 0) {
        setSelectedDevice(response.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/metrics');
      setMetrics(response.data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceMetrics = async (deviceId) => {
    try {
      const response = await api.get(`/api/metrics/device/${deviceId}`);
      setMetrics(prev => ({
        ...prev,
        device: response.data
      }));
    } catch (err) {
      console.error('Error fetching device metrics:', err);
    }
  };

  const renderMetricCard = (title, value, unit, icon, color = 'primary') => (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0">
            <div className={`bg-${color} bg-opacity-10 rounded p-3`}>
              <i className={`${icon} text-${color} fs-4`}></i>
            </div>
          </div>
          <div className="flex-grow-1 ms-3">
            <h5 className="mb-1">
              {value !== undefined ? value : 'N/A'}
              {unit && <small className="text-muted ms-1">{unit}</small>}
            </h5>
            <p className="text-muted mb-0">{title}</p>
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  const renderSystemMetrics = () => (
    <Row className="mb-4">
      <Col md={6} lg={3} className="mb-3">
        {renderMetricCard(
          'CPU Usage',
          metrics.system?.cpu?.toFixed(1),
          '%',
          'fas fa-microchip',
          metrics.system?.cpu > 80 ? 'danger' : metrics.system?.cpu > 60 ? 'warning' : 'success'
        )}
      </Col>
      <Col md={6} lg={3} className="mb-3">
        {renderMetricCard(
          'Memory Usage',
          metrics.system?.memory?.toFixed(1),
          '%',
          'fas fa-memory',
          metrics.system?.memory > 85 ? 'danger' : metrics.system?.memory > 70 ? 'warning' : 'success'
        )}
      </Col>
      <Col md={6} lg={3} className="mb-3">
        {renderMetricCard(
          'Disk Usage',
          metrics.system?.disk?.toFixed(1),
          '%',
          'fas fa-hdd',
          metrics.system?.disk > 90 ? 'danger' : metrics.system?.disk > 75 ? 'warning' : 'success'
        )}
      </Col>
      <Col md={6} lg={3} className="mb-3">
        {renderMetricCard(
          'Network Load',
          metrics.system?.network?.toFixed(1),
          'Mbps',
          'fas fa-network-wired',
          'info'
        )}
      </Col>
    </Row>
  );

  const renderDeviceMetrics = () => {
    const deviceMetrics = metrics.device || {};
    
    return (
      <Row className="mb-4">
        <Col md={6} lg={3} className="mb-3">
          {renderMetricCard(
            'Response Time',
            deviceMetrics.responseTime?.toFixed(0),
            'ms',
            'fas fa-clock',
            deviceMetrics.responseTime > 1000 ? 'danger' : deviceMetrics.responseTime > 500 ? 'warning' : 'success'
          )}
        </Col>
        <Col md={6} lg={3} className="mb-3">
          {renderMetricCard(
            'Packet Loss',
            deviceMetrics.packetLoss?.toFixed(1),
            '%',
            'fas fa-exclamation-triangle',
            deviceMetrics.packetLoss > 5 ? 'danger' : deviceMetrics.packetLoss > 1 ? 'warning' : 'success'
          )}
        </Col>
        <Col md={6} lg={3} className="mb-3">
          {renderMetricCard(
            'Uptime',
            deviceMetrics.uptime ? Math.floor(deviceMetrics.uptime / 3600) : 'N/A',
            'hours',
            'fas fa-arrow-up',
            'success'
          )}
        </Col>
        <Col md={6} lg={3} className="mb-3">
          {renderMetricCard(
            'Interface Count',
            deviceMetrics.interfaceCount,
            '',
            'fas fa-ethernet',
            'info'
          )}
        </Col>
      </Row>
    );
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Performance Metrics</h2>
              <p className="text-muted mb-0">Monitor system and device performance</p>
            </div>
            <div className="d-flex align-items-center">
              <Form.Select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                style={{ width: '200px' }}
                className="me-3"
              >
                <option value="">Select Device</option>
                {devices.map(device => (
                  <option key={device._id} value={device._id}>
                    {device.name || device.hostname || device.ip}
                  </option>
                ))}
              </Form.Select>
              <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
                {connected ? 'Live' : 'Offline'}
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

      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading metrics...</span>
          </div>
          <p className="mt-2 text-muted">Fetching performance data...</p>
        </div>
      ) : (
        <>
          {/* System Metrics */}
          <div className="mb-4">
            <h5 className="mb-3">
              <i className="fas fa-server me-2 text-primary"></i>
              System Metrics
            </h5>
            {renderSystemMetrics()}
          </div>

          {/* Device Metrics */}
          {selectedDevice && (
            <div className="mb-4">
              <h5 className="mb-3">
                <i className="fas fa-chart-line me-2 text-success"></i>
                Device Metrics
                {devices.find(d => d._id === selectedDevice) && (
                  <small className="text-muted ms-2">
                    ({devices.find(d => d._id === selectedDevice).name || 
                      devices.find(d => d._id === selectedDevice).ip})
                  </small>
                )}
              </h5>
              {renderDeviceMetrics()}
            </div>
          )}

          {/* Performance Charts Placeholder */}
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent border-0">
                  <h5 className="mb-0">
                    <i className="fas fa-chart-area me-2"></i>
                    Network Traffic
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="text-center p-4">
                    <i className="fas fa-chart-line fs-1 text-muted mb-3"></i>
                    <p className="text-muted">Real-time traffic charts will be displayed here</p>
                    <small className="text-muted">
                      Integration with monitoring tools like Prometheus/Grafana coming soon
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6} className="mb-4">
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent border-0">
                  <h5 className="mb-0">
                    <i className="fas fa-chart-bar me-2"></i>
                    Resource Usage
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="text-center p-4">
                    <i className="fas fa-chart-bar fs-1 text-muted mb-3"></i>
                    <p className="text-muted">Historical resource usage charts will be displayed here</p>
                    <small className="text-muted">
                      CPU, Memory, and Disk usage trends over time
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Alerts and Thresholds */}
          <Row>
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent border-0">
                  <h5 className="mb-0">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Performance Alerts
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="text-center p-4">
                    <i className="fas fa-bell fs-1 text-muted mb-3"></i>
                    <p className="text-muted">Performance threshold alerts will be displayed here</p>
                    <small className="text-muted">
                      Configure thresholds to receive alerts when metrics exceed limits
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default Metrics;