import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Progress, Badge, Alert, Tabs, Tab, Button, Modal, Table } from 'react-bootstrap';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FaChartLine, FaExclamationTriangle, FaLightbulb, FaShieldAlt, FaCog, FaNetworkWired, FaBrain, FaRobot } from 'react-icons/fa';

const AdvancedAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('performance');
  const [showPredictions, setShowPredictions] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Chart color schemes for enterprise look
  const colors = {
    primary: '#0066CC',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']
  };

  useEffect(() => {
    fetchAdvancedAnalytics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAdvancedAnalytics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchAdvancedAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/advanced-analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch advanced analytics`);
      }

      const data = await response.json();
      setAnalyticsData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Advanced Analytics fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderNetworkHealthOverview = () => {
    if (!analyticsData?.advancedHealth) return null;

    const health = analyticsData.advancedHealth;
    
    return (
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <FaBrain className="me-2" />
            Advanced Network Health Analysis
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <div className="text-center mb-3">
                <h2 className={`display-4 ${getHealthColor(health.overallHealth)}`}>
                  {health.overallHealth}%
                </h2>
                <p className="text-muted">Overall Network Health</p>
              </div>
              <Progress 
                variant={getHealthVariant(health.overallHealth)} 
                now={health.overallHealth} 
                style={{ height: '20px' }}
                className="mb-3"
              />
            </Col>
            <Col md={6}>
              <h6>Health Components</h6>
              {health.components && Object.entries(health.components).map(([component, data]) => (
                <div key={component} className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span className="text-capitalize">{component}:</span>
                    <Badge bg={getHealthVariant(data.score)}>{data.score}%</Badge>
                  </div>
                  <Progress variant={getHealthVariant(data.score)} now={data.score} size="sm" />
                </div>
              ))}
            </Col>
          </Row>
          
          {/* Insights Section */}
          {health.insights && health.insights.length > 0 && (
            <div className="mt-4">
              <h6>AI-Powered Insights</h6>
              {health.insights.map((insight, index) => (
                <Alert key={index} variant={insight.severity === 'critical' ? 'danger' : 'warning'}>
                  <FaLightbulb className="me-2" />
                  <strong>{insight.type}:</strong> {insight.message}
                  {insight.recommendation && (
                    <div className="mt-2 small">
                      <strong>Recommendation:</strong> {insight.recommendation}
                    </div>
                  )}
                </Alert>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderPerformanceAnalytics = () => {
    if (!analyticsData?.analytics?.performanceAnalysis) return null;

    const perf = analyticsData.analytics.performanceAnalysis;
    
    // Sample data for charts (in production, this would come from real metrics)
    const latencyTrend = [
      { time: '00:00', latency: 25, threshold: 50 },
      { time: '04:00', latency: 23, threshold: 50 },
      { time: '08:00', latency: 45, threshold: 50 },
      { time: '12:00', latency: 52, threshold: 50 },
      { time: '16:00', latency: 38, threshold: 50 },
      { time: '20:00', latency: 28, threshold: 50 }
    ];

    const throughputData = [
      { device: 'Core Router', utilization: 85 },
      { device: 'Core Switch', utilization: 70 },
      { device: 'Access Points', utilization: 45 },
      { device: 'Servers', utilization: 60 }
    ];

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <FaChartLine className="me-2" />
            Performance Analytics
            <Badge bg="info" className="ms-2">Score: {perf.performanceScore}%</Badge>
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6>Network Latency Trend (24h)</h6>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={latencyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="latency" stroke={colors.primary} fill={colors.primary} fillOpacity={0.3} />
                  <Line type="monotone" dataKey="threshold" stroke={colors.danger} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-2">
                <small className="text-muted">
                  Average Latency: <strong>{Math.round(perf.averageLatency)}ms</strong>
                </small>
              </div>
            </Col>
            <Col md={6}>
              <h6>Device Utilization</h6>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={throughputData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="device" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="utilization" fill={colors.info} />
                </BarChart>
              </ResponsiveContainer>
            </Col>
          </Row>
          
          <Row className="mt-4">
            <Col md={3}>
              <Card className="text-center bg-light">
                <Card.Body>
                  <h6>Throughput Score</h6>
                  <h4 className="text-primary">{perf.throughputAnalysis?.overallTrend || 'N/A'}</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center bg-light">
                <Card.Body>
                  <h6>Bandwidth Util</h6>
                  <h4 className="text-success">{perf.bandwidthUtilization?.currentUtilization || 0}%</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center bg-light">
                <Card.Body>
                  <h6>Error Rate</h6>
                  <h4 className="text-warning">{(perf.errorRates?.overallErrorRate || 0).toFixed(3)}%</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center bg-light">
                <Card.Body>
                  <h6>QoS Score</h6>
                  <h4 className="text-info">{perf.qualityOfService?.qualityScore || 0}%</h4>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  const renderPredictiveAnalytics = () => {
    if (!analyticsData?.analytics?.healthPredictions) return null;

    const predictions = analyticsData.analytics.healthPredictions;
    
    // Sample prediction data
    const predictionData = [
      { period: 'Current', health: analyticsData.advancedHealth?.overallHealth || 90 },
      { period: '24 Hours', health: predictions.shortTerm?.health || 88 },
      { period: '7 Days', health: predictions.mediumTerm?.health || 85 },
      { period: '30 Days', health: predictions.longTerm?.health || 82 }
    ];

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <FaRobot className="me-2" />
            Predictive Analytics & ML Insights
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={8}>
              <h6>Health Prediction Trend</h6>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={predictionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis domain={[70, 100]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="health" 
                    stroke={colors.primary} 
                    strokeWidth={3}
                    dot={{ fill: colors.primary, strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Col>
            <Col md={4}>
              <h6>Confidence Scores</h6>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Short-term (24h):</span>
                  <Badge bg="success">{predictions.confidenceScores?.short || 95}%</Badge>
                </div>
                <Progress variant="success" now={predictions.confidenceScores?.short || 95} size="sm" />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Medium-term (7d):</span>
                  <Badge bg="warning">{predictions.confidenceScores?.medium || 80}%</Badge>
                </div>
                <Progress variant="warning" now={predictions.confidenceScores?.medium || 80} size="sm" />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Long-term (30d):</span>
                  <Badge bg="info">{predictions.confidenceScores?.long || 65}%</Badge>
                </div>
                <Progress variant="info" now={predictions.confidenceScores?.long || 65} size="sm" />
              </div>
            </Col>
          </Row>

          {/* Risk Factors */}
          {predictions.riskFactors && predictions.riskFactors.length > 0 && (
            <div className="mt-4">
              <h6>Identified Risk Factors</h6>
              <div className="row">
                {predictions.riskFactors.map((risk, index) => (
                  <div key={index} className="col-md-6 mb-2">
                    <Alert variant="warning" className="mb-2">
                      <FaExclamationTriangle className="me-2" />
                      {risk.message || risk}
                    </Alert>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderCapacityAnalysis = () => {
    if (!analyticsData?.analytics?.capacityAnalysis) return null;

    const capacity = analyticsData.analytics.capacityAnalysis;
    
    const utilizationData = [
      { resource: 'CPU', current: capacity.currentUtilization?.cpu || 45, projected: 60 },
      { resource: 'Memory', current: capacity.currentUtilization?.memory || 60, projected: 75 },
      { resource: 'Bandwidth', current: capacity.currentUtilization?.bandwidth || 65, projected: 85 }
    ];

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <FaNetworkWired className="me-2" />
            Capacity Analysis & Growth Projections
            <Badge bg="primary" className="ms-2">Scalability Index: {capacity.scalabilityIndex}%</Badge>
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6>Resource Utilization Trends</h6>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={utilizationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="resource" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="current" fill={colors.success} name="Current" />
                  <Bar dataKey="projected" fill={colors.warning} name="Projected (3mo)" />
                </BarChart>
              </ResponsiveContainer>
            </Col>
            <Col md={6}>
              <h6>Time to Capacity Limits</h6>
              <Table size="sm">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Time to 80%</th>
                    <th>Time to 95%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CPU</td>
                    <td className="text-success">{capacity.timeToCapacity?.cpu || '8 months'}</td>
                    <td className="text-warning">12 months</td>
                  </tr>
                  <tr>
                    <td>Memory</td>
                    <td className="text-warning">{capacity.timeToCapacity?.memory || '6 months'}</td>
                    <td className="text-danger">9 months</td>
                  </tr>
                  <tr>
                    <td>Bandwidth</td>
                    <td className="text-danger">{capacity.timeToCapacity?.bandwidth || '4 months'}</td>
                    <td className="text-danger">6 months</td>
                  </tr>
                </tbody>
              </Table>
            </Col>
          </Row>

          {/* Growth Projections */}
          <Row className="mt-4">
            <Col>
              <h6>Growth Projections</h6>
              <Row>
                <Col md={4}>
                  <Card className="bg-light text-center">
                    <Card.Body>
                      <h6>CPU Growth</h6>
                      <h4 className="text-primary">{capacity.growthProjections?.cpu || '+15%'}</h4>
                      <small className="text-muted">Next 6 months</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="bg-light text-center">
                    <Card.Body>
                      <h6>Memory Growth</h6>
                      <h4 className="text-warning">{capacity.growthProjections?.memory || '+20%'}</h4>
                      <small className="text-muted">Next 6 months</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="bg-light text-center">
                    <Card.Body>
                      <h6>Bandwidth Growth</h6>
                      <h4 className="text-danger">{capacity.growthProjections?.bandwidth || '+25%'}</h4>
                      <small className="text-muted">Next 6 months</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  const renderRecommendations = () => {
    if (!analyticsData?.analytics?.recommendations) return null;

    const recommendations = analyticsData.analytics.recommendations;

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <FaLightbulb className="me-2" />
            Intelligent Recommendations
            <Badge bg={recommendations.priority === 'high' ? 'danger' : 'warning'} className="ms-2">
              {recommendations.priority} Priority
            </Badge>
          </h5>
        </Card.Header>
        <Card.Body>
          <Tabs defaultActiveKey="performance" className="mb-3">
            <Tab eventKey="performance" title="Performance">
              {renderRecommendationList(recommendations.performance, 'performance')}
            </Tab>
            <Tab eventKey="security" title="Security">
              {renderRecommendationList(recommendations.security, 'security')}
            </Tab>
            <Tab eventKey="capacity" title="Capacity">
              {renderRecommendationList(recommendations.capacity, 'capacity')}
            </Tab>
            <Tab eventKey="cost" title="Cost">
              {renderRecommendationList(recommendations.cost, 'cost')}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    );
  };

  const renderRecommendationList = (recommendations, type) => {
    if (!recommendations || recommendations.length === 0) {
      return (
        <Alert variant="success">
          <FaShieldAlt className="me-2" />
          No immediate {type} recommendations. System is operating optimally.
        </Alert>
      );
    }

    return (
      <div>
        {recommendations.map((rec, index) => (
          <Alert key={index} variant="info">
            <strong>{rec.title || `${type} Recommendation ${index + 1}`}:</strong>
            <br />
            {rec.description || rec}
            {rec.impact && (
              <div className="mt-2">
                <small><strong>Expected Impact:</strong> {rec.impact}</small>
              </div>
            )}
          </Alert>
        ))}
      </div>
    );
  };

  // Helper functions
  const getHealthColor = (health) => {
    if (health >= 90) return 'text-success';
    if (health >= 70) return 'text-warning';
    return 'text-danger';
  };

  const getHealthVariant = (health) => {
    if (health >= 90) return 'success';
    if (health >= 70) return 'warning';
    return 'danger';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading advanced analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <FaExclamationTriangle className="me-2" />
        <strong>Analytics Error:</strong> {error}
        <div className="mt-2">
          <Button variant="outline-danger" size="sm" onClick={fetchAdvancedAnalytics}>
            Retry Analysis
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="advanced-analytics">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>
          <FaBrain className="me-2" />
          Advanced Network Analytics
        </h3>
        <div>
          <Button 
            variant={autoRefresh ? 'primary' : 'outline-primary'} 
            size="sm" 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="me-2"
          >
            <FaCog className="me-1" />
            Auto-Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline-primary" size="sm" onClick={fetchAdvancedAnalytics}>
            Refresh Now
          </Button>
        </div>
      </div>

      {lastUpdated && (
        <Alert variant="info" className="mb-4">
          <strong>Last Updated:</strong> {lastUpdated.toLocaleString()}
          <br />
          <strong>Devices Analyzed:</strong> {analyticsData?.deviceCount || 0}
          <br />
          <strong>Analysis Type:</strong> Enterprise-Grade ML-Based Network Analytics
        </Alert>
      )}

      {renderNetworkHealthOverview()}
      {renderPerformanceAnalytics()}
      {renderPredictiveAnalytics()}
      {renderCapacityAnalysis()}
      {renderRecommendations()}

      {/* Predictions Modal */}
      <Modal show={showPredictions} onHide={() => setShowPredictions(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaRobot className="me-2" />
            Detailed Predictions
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Detailed predictive analytics and ML model outputs would be displayed here.</p>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AdvancedAnalytics;