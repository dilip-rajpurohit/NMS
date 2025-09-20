import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge, Alert, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const UsersManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
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

      const userData = {
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        profile: {
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          department: userForm.department,
          phone: userForm.phone
        },
        isActive: userForm.isActive
      };

      if (editingUser) {
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
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to save user' 
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
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
              <h4 className="mb-0">
                <i className="fas fa-users me-2"></i>
                Users Management
              </h4>
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
                      filteredUsers.map(user => (
                        <tr key={user._id}>
                          <td>
                            <div>
                              <strong>{user.username}</strong>
                              {user.profile?.firstName && user.profile?.lastName && (
                                <>
                                  <br />
                                  <small className="text-muted">
                                    {user.profile.firstName} {user.profile.lastName}
                                  </small>
                                </>
                              )}
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>{getRoleBadge(user.role)}</td>
                          <td>{user.profile?.department || '-'}</td>
                          <td>{getStatusBadge(user.isActive)}</td>
                          <td>
                            <small>
                              {user.lastLogin 
                                ? new Date(user.lastLogin).toLocaleDateString()
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
                                <Dropdown.Item onClick={() => handleEditUser(user)}>
                                  <i className="fas fa-edit me-1"></i>
                                  Edit
                                </Dropdown.Item>
                                <Dropdown.Item 
                                  onClick={() => handleToggleStatus(user._id, user.isActive)}
                                >
                                  <i className={`fas ${user.isActive ? 'fa-ban' : 'fa-check'} me-1`}></i>
                                  {user.isActive ? 'Deactivate' : 'Activate'}
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item 
                                  className="text-danger"
                                  onClick={() => handleDeleteUser(user._id)}
                                  disabled={user._id === user._id} // Prevent self-deletion
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
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Password {!editingUser && '*'}</Form.Label>
                  <Form.Control
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to keep current password' : ''}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role *</Form.Label>
                  <Form.Select
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                    required
                  >
                    <option value="viewer">Viewer</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
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
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="user-active"
                label="Active User"
                checked={userForm.isActive}
                onChange={(e) => setUserForm(prev => ({ ...prev, isActive: e.target.checked }))}
              />
            </Form.Group>
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