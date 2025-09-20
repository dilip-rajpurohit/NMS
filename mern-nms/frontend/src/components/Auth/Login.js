import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  const { login, register, loading, error } = useAuth();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }
    
    await login(formData.username, formData.password);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateRegisterForm();
    if (validationError) {
      alert(validationError);
      return;
    }
    
    const { confirmPassword, ...userData } = registerData;
    await register(userData);
  };

  const handleInputChange = (e, isRegister = false) => {
    const { name, value } = e.target;
    if (isRegister) {
      setRegisterData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      return 'Username is required';
    }
    if (!formData.password.trim()) {
      return 'Password is required';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  const validateRegisterForm = () => {
    if (!registerData.username.trim()) {
      return 'Username is required';
    }
    if (registerData.username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (!registerData.email.trim()) {
      return 'Email is required';
    }
    if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      return 'Email is invalid';
    }
    if (!registerData.password.trim()) {
      return 'Password is required';
    }
    if (registerData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (registerData.password !== registerData.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  // Enhanced validation with detailed error tracking
  const validateFormEnhanced = () => {
    const errors = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Password strength calculator
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  // Enhanced register form validation
  const validateRegisterFormEnhanced = () => {
    const errors = {};
    
    if (!registerData.username.trim()) {
      errors.username = 'Username is required';
    } else if (registerData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!registerData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!registerData.password.trim()) {
      errors.password = 'Password is required';
    } else if (registerData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength < 60) {
      errors.password = 'Password is too weak. Include uppercase, lowercase, numbers, and symbols';
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle password change with strength calculation
  const handlePasswordChange = (e, isRegister = false) => {
    const { name, value } = e.target;
    
    if (isRegister) {
      setRegisterData(prev => ({
        ...prev,
        [name]: value
      }));
      
      if (name === 'password') {
        setPasswordStrength(calculatePasswordStrength(value));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear validation errors when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Enhanced login submit with better validation
  const handleLoginSubmitEnhanced = async (e) => {
    e.preventDefault();
    
    if (!validateFormEnhanced()) {
      return;
    }
    
    try {
      await login(formData.username, formData.password, formData.rememberMe);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Enhanced register submit
  const handleRegisterSubmitEnhanced = async (e) => {
    e.preventDefault();
    
    if (!validateRegisterFormEnhanced()) {
      return;
    }
    
    try {
      const { confirmPassword, ...userData } = registerData;
      await register(userData);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  // Get password strength color
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 30) return 'danger';
    if (passwordStrength < 60) return 'warning';
    if (passwordStrength < 80) return 'info';
    return 'success';
  };

  // Get password strength text
  const getPasswordStrengthText = () => {
    if (passwordStrength < 30) return 'Weak';
    if (passwordStrength < 60) return 'Fair';
    if (passwordStrength < 80) return 'Good';
    return 'Strong';
  };

  return (
    <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Row className="justify-content-center w-100">
        <Col md={6} lg={4}>
          <Card className="shadow-lg border-0" style={{ borderRadius: '15px' }}>
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold text-primary">
                  <i className="fas fa-network-wired me-2"></i>
                  NMS
                </h2>
                <p className="text-muted">Network Management System</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              {!showRegister ? (
                // Enhanced Login Form
                <Form onSubmit={handleLoginSubmitEnhanced}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-user me-2"></i>Username
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={(e) => handlePasswordChange(e)}
                      placeholder="Enter username"
                      required
                      disabled={loading}
                      isInvalid={!!validationErrors.username}
                      className="py-2"
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.username}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-lock me-2"></i>Password
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={(e) => handlePasswordChange(e)}
                        placeholder="Enter password"
                        required
                        disabled={loading}
                        isInvalid={!!validationErrors.password}
                        className="py-2"
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                      </Button>
                    </InputGroup>
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.password}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleCheckboxChange}
                      label="Remember me"
                      disabled={loading}
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 mb-3 py-2"
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Sign In
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <Button
                      variant="link"
                      onClick={() => setShowRegister(true)}
                      disabled={loading}
                      className="text-decoration-none"
                    >
                      Don't have an account? <strong>Sign Up</strong>
                    </Button>
                  </div>
                </Form>
              ) : (
                // Enhanced Register Form
                <Form onSubmit={handleRegisterSubmitEnhanced}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          <i className="fas fa-user me-2"></i>First Name
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={registerData.firstName}
                          onChange={(e) => handlePasswordChange(e, true)}
                          placeholder="First name"
                          disabled={loading}
                          className="py-2"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          <i className="fas fa-user me-2"></i>Last Name
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={registerData.lastName}
                          onChange={(e) => handlePasswordChange(e, true)}
                          placeholder="Last name"
                          disabled={loading}
                          className="py-2"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-user-circle me-2"></i>Username
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={registerData.username}
                      onChange={(e) => handlePasswordChange(e, true)}
                      placeholder="Choose a username"
                      required
                      disabled={loading}
                      isInvalid={!!validationErrors.username}
                      className="py-2"
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.username}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-envelope me-2"></i>Email
                    </Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={registerData.email}
                      onChange={(e) => handlePasswordChange(e, true)}
                      placeholder="Enter email address"
                      required
                      disabled={loading}
                      isInvalid={!!validationErrors.email}
                      className="py-2"
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-lock me-2"></i>Password
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showRegisterPassword ? "text" : "password"}
                        name="password"
                        value={registerData.password}
                        onChange={(e) => handlePasswordChange(e, true)}
                        placeholder="Choose a password"
                        required
                        disabled={loading}
                        isInvalid={!!validationErrors.password}
                        className="py-2"
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        disabled={loading}
                      >
                        <i className={`fas fa-eye${showRegisterPassword ? '-slash' : ''}`}></i>
                      </Button>
                    </InputGroup>
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.password}
                    </Form.Control.Feedback>
                    
                    {registerData.password && (
                      <div className="mt-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="text-muted">Password Strength:</small>
                          <small className={`text-${getPasswordStrengthColor()}`}>
                            {getPasswordStrengthText()}
                          </small>
                        </div>
                        <ProgressBar
                          now={passwordStrength}
                          variant={getPasswordStrengthColor()}
                          style={{ height: '4px' }}
                        />
                      </div>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>
                      <i className="fas fa-lock me-2"></i>Confirm Password
                    </Form.Label>
                    <Form.Control
                      type={showRegisterPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={registerData.confirmPassword}
                      onChange={(e) => handlePasswordChange(e, true)}
                      placeholder="Confirm your password"
                      required
                      disabled={loading}
                      isInvalid={!!validationErrors.confirmPassword}
                      className="py-2"
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.confirmPassword}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 mb-3 py-2"
                    disabled={loading || passwordStrength < 60}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating account...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus me-2"></i>
                        Create Account
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <Button
                      variant="link"
                      onClick={() => setShowRegister(false)}
                      disabled={loading}
                      className="text-decoration-none"
                    >
                      Already have an account? <strong>Sign In</strong>
                    </Button>
                  </div>
                </Form>
              )}

              <hr className="my-4" />
              
              <div className="text-center">
                <small className="text-muted">
                  <i className="fas fa-shield-alt me-1"></i>
                  Secure Network Management Platform
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;