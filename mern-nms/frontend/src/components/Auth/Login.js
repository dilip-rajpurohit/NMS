import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import ErrorHandler from '../../utils/ErrorHandler';
import * as feather from 'feather-icons';

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
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rateLimitReached, setRateLimitReached] = useState(false);

  const { login, register, loading, error } = useAuth();

  // Initialize feather icons
  useEffect(() => {
    feather.replace();
  }, []);

  // Security: Rate limiting for failed attempts
  useEffect(() => {
    if (rateLimitReached) {
      const timer = setTimeout(() => {
        setRateLimitReached(false);
        setLocalError('');
      }, 300000); // 5 minutes
      return () => clearTimeout(timer);
    }
  }, [rateLimitReached]);

  // Security: Clear form data on unmount
  useEffect(() => {
    return () => {
      setFormData({ username: '', password: '', rememberMe: false });
      setRegisterData({
        username: '', email: '', password: '', confirmPassword: '', firstName: '', lastName: ''
      });
    };
  }, []);

  const handleLoginSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (submitting || rateLimitReached) return;
    
    try {
      setSubmitting(true);
      setLocalError('');
      setValidationErrors({});
      
      if (!validateFormEnhanced()) {
        return;
      }
      
      const result = await login(formData.username, formData.password, formData.rememberMe);
      
      if (!result.success) {
        // Security: Implement rate limiting after multiple failures
        const failCount = parseInt(sessionStorage.getItem('login_fail_count') || '0') + 1;
        sessionStorage.setItem('login_fail_count', failCount.toString());
        
        if (failCount >= 5) {
          setRateLimitReached(true);
          setLocalError('Too many failed attempts. Please wait 5 minutes before trying again.');
          sessionStorage.removeItem('login_fail_count');
        } else {
          setLocalError(result.error || 'Login failed');
        }
      } else {
        // Clear failure count on success
        sessionStorage.removeItem('login_fail_count');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'Login failed');
      setLocalError('Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [formData, login, submitting, rateLimitReached]);

  const handleRegisterSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (submitting) return;
    
    try {
      setSubmitting(true);
      setLocalError('');
      setValidationErrors({});
      
      if (!validateRegisterFormEnhanced()) {
        return;
      }
      
      const { confirmPassword, ...userData } = registerData;
      const result = await register(userData);
      
      if (!result.success) {
        setLocalError(result.error || 'Registration failed');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'Registration failed');
      setLocalError('Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [registerData, register, submitting]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    // Security: Sanitize input
    const sanitizedValue = type === 'checkbox' ? checked : value.replace(/[<>]/g, '');
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    // Clear validation errors when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [validationErrors]);

  const handleRegisterChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Security: Sanitize input
    const sanitizedValue = value.replace(/[<>]/g, '');
    
    setRegisterData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(sanitizedValue));
    }

    // Clear validation errors when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [validationErrors]);

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

  // Password strength calculator - matching UsersManagement
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;
    let strength = 0;
    
    // Length scoring
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 15;
    if (password.length >= 12) strength += 10;
    
    // Character type scoring
    if (/[a-z]/.test(password)) strength += 15; // lowercase
    if (/[A-Z]/.test(password)) strength += 15; // uppercase
    if (/[0-9]/.test(password)) strength += 10; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10; // special chars
    
    return Math.min(strength, 100);
  };

  // Enhanced register form validation - WITH PASSWORD STRENGTH CHECK
  const validateRegisterFormEnhanced = () => {
    const errors = {};
    
    if (!registerData.username.trim()) {
      errors.username = 'Username is required';
    } else if (registerData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!registerData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!registerData.password.trim()) {
      errors.password = 'Password is required';
    } else if (registerData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else {
      // CHECK PASSWORD STRENGTH - block weak passwords
      const strength = calculatePasswordStrength(registerData.password);
      if (strength < 50) { // Below 50 is considered "Weak" 
        errors.password = 'Password is too weak. Please use a stronger password with uppercase, lowercase, numbers, or special characters.';
      }
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

  // Get password strength color and text - matching UsersManagement
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 30) return 'danger';
    if (passwordStrength < 50) return 'warning';
    if (passwordStrength < 70) return 'info';
    if (passwordStrength < 90) return 'success';
    return 'success';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 30) return 'Very Weak';
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 70) return 'Fair';
    if (passwordStrength < 90) return 'Good';
    return 'Strong';
  };

  return (
    <>
      <style>
        {`
          .btn-no-hover:hover {
            background-color: #f8f9fa !important;
            border-color: #ced4da !important;
            color: #6c757d !important;
            transform: none !important;
            box-shadow: none !important;
          }
          .btn-no-hover:focus {
            background-color: #f8f9fa !important;
            border-color: #ced4da !important;
            color: #6c757d !important;
            box-shadow: none !important;
          }
        `}
      </style>
      <Container fluid className="d-flex align-items-center justify-content-center auth-container">
      <Row className="justify-content-center w-100">
        <Col md={6} lg={4}>
          <Card className="auth-card shadow-lg border-0">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold text-primary d-flex align-items-center justify-content-center gap-2 mb-2">
                  <i data-feather="activity" style={{fontSize:'32px', color:'#2563eb', width: '32px', height: '32px'}}></i>
                  <span style={{letterSpacing:'1px', color:'#2563eb'}}>NetWatch</span>
                </h2>
                <p className="text-muted mb-0" style={{fontSize:'0.9rem'}}>Network Management System</p>
              </div>

              {(error || localError) && (
                <Alert variant="danger" className="mb-3">
                  {localError || error}
                </Alert>
              )}
              
              {rateLimitReached && (
                <Alert variant="warning" className="mb-3">
                  <i className="fas fa-shield-alt me-2"></i>
                  Account temporarily locked. Please wait 5 minutes before trying again.
                </Alert>
              )}

              {!showRegister ? (
                // Enhanced Login Form
                <Form onSubmit={handleLoginSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-user me-2"></i>Username
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Enter username"
                      required
                      disabled={loading || rateLimitReached}
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
                        onChange={handleChange}
                        placeholder="Enter password"
                        required
                        disabled={loading || rateLimitReached}
                        isInvalid={!!validationErrors.password}
                        className="py-2"
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading || rateLimitReached}
                        style={{
                          border: '1px solid #ced4da',
                          backgroundColor: '#f8f9fa',
                          color: '#6c757d',
                          minWidth: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        className="btn-no-hover"
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
                      onChange={handleChange}
                      label="Remember me"
                      disabled={loading || rateLimitReached}
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 mb-3 py-2"
                    disabled={loading || submitting || rateLimitReached}
                    size="lg"
                  >
                    {(loading || submitting) ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing in...
                      </>
                    ) : rateLimitReached ? (
                      <>
                        <i className="fas fa-lock me-2"></i>
                        Account Locked
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
                      disabled={loading || rateLimitReached}
                      className="text-decoration-none"
                    >
                      Don't have an account? <strong>Sign Up</strong>
                    </Button>
                  </div>
                </Form>
              ) : (
                // Enhanced Register Form
                <Form onSubmit={handleRegisterSubmit}>
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
                          onChange={handleRegisterChange}
                          placeholder="First name"
                          disabled={loading || submitting}
                          isInvalid={!!validationErrors.firstName}
                          className="py-2"
                        />
                        <Form.Control.Feedback type="invalid">
                          {validationErrors.firstName}
                        </Form.Control.Feedback>
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
                          onChange={handleRegisterChange}
                          placeholder="Last name"
                          disabled={loading || submitting}
                          isInvalid={!!validationErrors.lastName}
                          className="py-2"
                        />
                        <Form.Control.Feedback type="invalid">
                          {validationErrors.lastName}
                        </Form.Control.Feedback>
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
                      onChange={handleRegisterChange}
                      placeholder="Choose a username"
                      required
                      disabled={loading || submitting}
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
                      onChange={handleRegisterChange}
                      placeholder="Enter email address"
                      required
                      disabled={loading || submitting}
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
                        onChange={handleRegisterChange}
                        placeholder="Enter password (min 6 characters)"
                        required
                        disabled={loading || submitting}
                        isInvalid={!!validationErrors.password}
                        className="py-2"
                        autoComplete="new-password"
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        disabled={loading || submitting}
                        style={{
                          border: '1px solid #ced4da',
                          backgroundColor: '#f8f9fa',
                          color: '#6c757d',
                          minWidth: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        className="btn-no-hover"
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
                        {passwordStrength < 50 && (
                          <small className="text-danger mt-1 d-block">
                            <i className="fas fa-exclamation-circle me-1"></i>
                            Password must be stronger to create account. Add uppercase, lowercase, numbers, or special characters.
                          </small>
                        )}
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
                      onChange={handleRegisterChange}
                      placeholder="Re-enter password"
                      required
                      disabled={loading || submitting}
                      isInvalid={!!validationErrors.confirmPassword}
                      className="py-2"
                      autoComplete="new-password"
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.confirmPassword}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 mb-3 py-2"
                    disabled={loading || submitting || (registerData.password && passwordStrength < 50)}
                    size="lg"
                  >
                    {(loading || submitting) ? (
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
    </>
  );
};

export default Login;