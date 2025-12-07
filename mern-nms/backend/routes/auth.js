const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Rate limiting for login attempts - Increased for testing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased to 50 attempts per window per IP for testing
  message: {
    error: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists with this email or username'
      });
    }

    // Create new user with profile information
    const userData = {
      username,
      email,
      password,
      role: role || 'operator'
    };

    // Add profile information if provided
    if (firstName || lastName) {
      userData.profile = {};
      if (firstName) userData.profile.firstName = firstName;
      if (lastName) userData.profile.lastName = lastName;
    }

    const user = new User(userData);

    await user.save();

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'JWT_SECRET environment variable is required' });
    }
    
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Login user
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'JWT_SECRET environment variable is required' });
    }
    
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// GET /api/auth/profile

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    
    // req.user is already the user object from the middleware
    const user = req.user;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences || {
          theme: 'light',
          language: 'en',
          notifications: {
            email: true,
            browser: true,
            sms: false
          }
        },
        profile: user.profile || {
          firstName: '',
          lastName: '',
          department: '',
          phone: '',
          avatar: ''
        },
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message
    });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // req.user is already the full user object from middleware
    const user = req.user;
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({
      error: 'Token verification failed',
      message: error.message
    });
  }
});

// Get user profile (exact test component structure)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return in exact format expected by test components
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        phone: user.phone,
        companyName: user.companyName,
        role: user.role,
        isDarkTheme: user.isDarkTheme,
        emailNotifications: user.emailNotifications,
        browserNotifications: user.browserNotifications,
        smsNotifications: user.smsNotifications,
        activeMonitors: user.activeMonitors,
        alertsResolved: user.alertsResolved,
        criticalIncidents: user.criticalIncidents,
        avatar: user.avatar,
        profileImage: user.profileImage,
        twoFactorAuth: user.twoFactorAuth,
        backupCodes: user.backupCodes
      }
    });
  } catch (error) {
    logger.error('Profile get error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile (exact test component data format)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updateData = req.body;
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update all fields from test component formData
    if (updateData.firstName !== undefined) user.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
    if (updateData.department !== undefined) user.department = updateData.department;
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.companyName !== undefined) user.companyName = updateData.companyName;
    if (updateData.role !== undefined) user.role = updateData.role;
    
    // Update theme and notifications exactly as in test
    if (updateData.isDarkTheme !== undefined) user.isDarkTheme = updateData.isDarkTheme;
    if (updateData.emailNotifications !== undefined) user.emailNotifications = updateData.emailNotifications;
    if (updateData.browserNotifications !== undefined) user.browserNotifications = updateData.browserNotifications;
    if (updateData.smsNotifications !== undefined) user.smsNotifications = updateData.smsNotifications;
    
    // Update profile stats
    if (updateData.activeMonitors !== undefined) user.activeMonitors = updateData.activeMonitors;
    if (updateData.alertsResolved !== undefined) user.alertsResolved = updateData.alertsResolved;
    if (updateData.criticalIncidents !== undefined) user.criticalIncidents = updateData.criticalIncidents;
    
    // Update avatar/image
    if (updateData.avatar !== undefined) user.avatar = updateData.avatar;
    if (updateData.profileImage !== undefined) user.profileImage = updateData.profileImage;

    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

// Update user preferences (exact test component format)
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update preferences exactly as in test components
    const { isDarkTheme, emailNotifications, browserNotifications, smsNotifications } = req.body;
    
    if (isDarkTheme !== undefined) user.isDarkTheme = isDarkTheme;
    if (emailNotifications !== undefined) user.emailNotifications = emailNotifications;
    if (browserNotifications !== undefined) user.browserNotifications = browserNotifications;
    if (smsNotifications !== undefined) user.smsNotifications = smsNotifications;

    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    logger.error('Preferences update error:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      message: error.message
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    // req.user is already the user object from middleware, but we need to reload for password operations
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: error.message
    });
  }
});

module.exports = router;