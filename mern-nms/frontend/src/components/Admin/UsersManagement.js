import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge, Alert, Dropdown, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const UsersManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    search: ''
  });

  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'viewer',
    firstName: '',
    lastName: '',
    department: '',
    phone: '',
    isActive: true
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  // Password strength calculator
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

  // Get password strength color and text
  const getPasswordStrengthInfo = (strength) => {
    if (strength < 30) return { color: 'danger', text: 'Very Weak' };
    if (strength < 50) return { color: 'warning', text: 'Weak' };
    if (strength < 70) return { color: 'info', text: 'Fair' };
    if (strength < 90) return { color: 'success', text: 'Good' };
    return { color: 'success', text: 'Strong' };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data || []);
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to load users' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Enhanced validation
      if (!userForm.username?.trim()) {
        setMessage({ type: 'danger', text: 'Username is required' });
        setLoading(false);
        return;
      }
      if (userForm.username.length < 3) {
        setMessage({ type: 'danger', text: 'Username must be at least 3 characters' });
        setLoading(false);
        return;
      }
      if (!userForm.email?.trim()) {
        setMessage({ type: 'danger', text: 'Email is required' });
        setLoading(false);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
        setMessage({ type: 'danger', text: 'Please enter a valid email address' });
        setLoading(false);
        return;
      }
      if (!editingUser && !userForm.password?.trim()) {
        setMessage({ type: 'danger', text: 'Password is required for new users' });
        setLoading(false);
        return;
      }
      if (!editingUser && userForm.password && userForm.password.length < 6) {
        setMessage({ type: 'danger', text: 'Password must be at least 6 characters' });
        setLoading(false);
        return;
      }
      // Basic password validation - very lenient
      if (!editingUser && userForm.password && userForm.password.length < 6) {
        setMessage({ type: 'danger', text: 'Password must be at least 6 characters' });
        setLoading(false);
        return;
      }
      if (!editingUser && confirmPassword !== userForm.password) {
        setMessage({ type: 'danger', text: 'Passwords do not match' });
        setLoading(false);
        return;
      }

      const userData = {
        username: userForm.username.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        role: userForm.role,
        profile: {
          firstName: userForm.firstName?.trim() || '',
          lastName: userForm.lastName?.trim() || '',
          department: userForm.department?.trim() || '',
          phone: userForm.phone?.trim() || ''
        },
        isActive: userForm.isActive
      };

      if (editingUser) {
        // Remove password if empty (keep existing password)
        if (!userData.password) {
          delete userData.password;
        }
        await api.put(`/admin/users/${editingUser._id}`, userData);
        setMessage({ type: 'success', text: 'User updated successfully!' });
      } else {
        await api.post('/admin/users', userData);
        setMessage({ type: 'success', text: 'User created successfully!' });
      }

      setShowModal(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('User creation/update failed:', error);
      
      let errorMessage = 'Failed to save user';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ 
        type: 'danger', 
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      department: user.profile?.department || '',
      phone: user.profile?.phone || '',
      isActive: user.isActive
    });
    setPasswordStrength(0);
    setShowPassword(false);
    setConfirmPassword('');
    setMessage({ type: '', text: '' });
    setShowModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        setLoading(true);
        await api.delete(`/admin/users/${userId}`);
        setMessage({ type: 'success', text: 'User deleted successfully!' });
        fetchUsers();
      } catch (error) {
        setMessage({ 
          type: 'danger', 
          text: error.response?.data?.error || 'Failed to delete user' 
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      setLoading(true);
      await api.patch(`/admin/users/${userId}/status`, { isActive: !currentStatus });
      setMessage({ 
        type: 'success', 
        text: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully!` 
      });
      fetchUsers();
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to update user status' 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserForm({
      username: '',
      email: '',
      password: '',
      role: 'viewer',
      firstName: '',
      lastName: '',
      department: '',
      phone: '',
      isActive: true
    });
    setPasswordStrength(0);
    setShowPassword(false);
    setConfirmPassword('');
    setMessage({ type: '', text: '' });
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = filters.role === 'all' || user.role === filters.role;
    const matchesStatus = filters.status === 'all' || 
                          (filters.status === 'active' && user.isActive) ||
                          (filters.status === 'inactive' && !user.isActive);
    const matchesSearch = !filters.search || 
                          user.username.toLowerCase().includes(filters.search.toLowerCase()) ||
                          user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
                          (user.profile?.firstName?.toLowerCase().includes(filters.search.toLowerCase())) ||
                          (user.profile?.lastName?.toLowerCase().includes(filters.search.toLowerCase()));
    
    return matchesRole && matchesStatus && matchesSearch;
  });

  const getRoleBadge = (role) => {
    const variants = {
      admin: 'danger',
      operator: 'warning',
      viewer: 'secondary'
    };
    return <Badge bg={variants[role] || 'secondary'}>{role}</Badge>;
  };

  const getStatusBadge = (isActive) => {
    return (
      <Badge bg={isActive ? 'success' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  if (user?.role !== 'admin') {
    return (
      <Container className="p-4">
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          You don't have permission to access this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
              <h2 className="mb-1">
                <i className="fas fa-users-cog me-2 text-primary"></i>
                Users Management
              </h2>
              <Button 
                variant="light" 
                size="sm"
                onClick={() => {
                  setEditingUser(null);
                  resetForm();
                  setShowModal(true);
                }}
              >
                <i className="fas fa-plus me-1"></i>
                Add User
              </Button>
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

              {/* Filters */}
              <Row className="mb-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Filter by Role</Form.Label>
                    <Form.Select
                      value={filters.role}
                      onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="operator">Operator</option>
                      <option value="viewer">Viewer</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Filter by Status</Form.Label>
                    <Form.Select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Search Users</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search by username, email, or name..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Users Table */}
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead className="table-dark">
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-muted">
                          {users.length === 0 ? 'No users found' : 'No users match the current filters'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(userItem => (
                        <tr key={userItem._id}>
                          <td>
                            <div>
                              <strong>{userItem.username}</strong>
                              {userItem.profile?.firstName && userItem.profile?.lastName && (
                                <>
                                  <br />
                                  <small className="text-muted">
                                    {userItem.profile.firstName} {userItem.profile.lastName}
                                  </small>
                                </>
                              )}
                            </div>
                          </td>
                          <td>{userItem.email}</td>
                          <td>{getRoleBadge(userItem.role)}</td>
                          <td>{userItem.profile?.department || '-'}</td>
                          <td>{getStatusBadge(userItem.isActive)}</td>
                          <td>
                            <small>
                              {userItem.lastLogin 
                                ? new Date(userItem.lastLogin).toLocaleDateString()
                                : 'Never'
                              }
                            </small>
                          </td>
                          <td>
                            <Dropdown>
                              <Dropdown.Toggle variant="outline-secondary" size="sm">
                                <i className="fas fa-ellipsis-v"></i>
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleEditUser(userItem)}>
                                  <i className="fas fa-edit me-1"></i>
                                  Edit
                                </Dropdown.Item>
                                <Dropdown.Item 
                                  onClick={() => handleToggleStatus(userItem._id, userItem.isActive)}
                                >
                                  <i className={`fas ${userItem.isActive ? 'fa-ban' : 'fa-check'} me-1`}></i>
                                  {userItem.isActive ? 'Deactivate' : 'Activate'}
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item 
                                  className="text-danger"
                                  onClick={() => handleDeleteUser(userItem._id)}
                                  disabled={user._id === userItem._id} // Prevent self-deletion
                                >
                                  <i className="fas fa-trash me-1"></i>
                                  Delete
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              )}

              {/* Statistics */}
              <Row className="mt-3">
                <Col>
                  <small className="text-muted">
                    Showing {filteredUsers.length} of {users.length} users
                  </small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit User Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingUser ? 'Edit User' : 'Add New User'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateUser}>
          <Modal.Body>
            {/* Basic Information Section */}
            <h6 className="text-muted mb-3 border-bottom pb-2">Basic Information</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Username *</Form.Label>
                  <Form.Control
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                    disabled={editingUser} // Username cannot be changed
                    placeholder="Enter username (min 3 characters)"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="Enter email address"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role *</Form.Label>
                  <Form.Select
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                    required
                  >
                    <option value="viewer">Viewer - Read-only access</option>
                    <option value="operator">Operator - Monitor and manage</option>
                    <option value="admin">Admin - Full system access</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="user-active"
                    label="Active User"
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <Form.Text className="text-muted">
                    Inactive users cannot log in to the system
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Security Section */}
            <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">Security</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Password {!editingUser && '*'}</Form.Label>
                  <div className="input-group">
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      value={userForm.password}
                      onChange={(e) => {
                        const newPassword = e.target.value;
                        setUserForm(prev => ({ ...prev, password: newPassword }));
                        setPasswordStrength(calculatePasswordStrength(newPassword));
                      }}
                      required={!editingUser}
                      placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password (min 6 characters)'}
                    />
                    <Button
                      variant="outline-secondary"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        border: '1px solid #ced4da',
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d',
                        minWidth: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                    </Button>
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Confirm Password {!editingUser && '*'}</Form.Label>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!editingUser}
                    placeholder={editingUser ? 'Confirm new password' : 'Re-enter password'}
                  />
                  {!editingUser && confirmPassword && (
                    <Form.Text className={confirmPassword === userForm.password ? 'text-success' : 'text-danger'}>
                      {confirmPassword === userForm.password ? (
                        <><i className="fas fa-check me-1"></i>Passwords match</>
                      ) : (
                        <><i className="fas fa-times me-1"></i>Passwords do not match</>
                      )}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            {!editingUser && userForm.password && (
              <Row>
                <Col md={12}>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <small className="text-muted">Password Strength</small>
                      <small className={`text-${getPasswordStrengthInfo(passwordStrength).color}`}>
                        {getPasswordStrengthInfo(passwordStrength).text}
                      </small>
                    </div>
                    <ProgressBar 
                      variant={getPasswordStrengthInfo(passwordStrength).color}
                      now={passwordStrength}
                      style={{ height: '4px' }}
                    />
                    <Form.Text className="text-muted">
                      Include uppercase, lowercase, numbers, and special characters for a stronger password
                    </Form.Text>
                  </div>
                </Col>
              </Row>
            )}

            {/* Personal Information Section */}
            <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">Personal Information <small>(Optional)</small></h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Control
                    type="text"
                    value={userForm.department}
                    onChange={(e) => setUserForm(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Enter department"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    value={userForm.phone}
                    onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  {editingUser ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <i className="fas fa-save me-1"></i>
                  {editingUser ? 'Update User' : 'Create User'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default UsersManagement;