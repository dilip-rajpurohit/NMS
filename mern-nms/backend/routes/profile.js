const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/profile
// @desc    Get current user profile
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -security.passwordHistory');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure profile structure exists
    if (!user.profile) {
      user.profile = {};
    }
    if (!user.security) {
      user.security = { twoFactorAuth: { enabled: false } };
    }
    if (!user.preferences) {
      user.preferences = {
        theme: { isDarkTheme: true },
        notifications: { email: true, browser: true, sms: false }
      };
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/profile/personal
// @desc    Update personal information
// @access  Private
router.put('/personal', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, role, department, phone } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is trying to update role
    if (role !== undefined) {
      // Only admins can change roles, and they can't change their own role
      if (user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can change user roles.',
          field: 'role'
        });
      }
      
      // Prevent admin users from changing their own role (security protection)
      if (user._id.toString() === req.user.id) {
        return res.status(403).json({ 
          message: 'You cannot change your own role for security reasons.',
          field: 'role'
        });
      }
      
      // Admin changing another user's role
      user.role = role;
    }

    // Update nested profile fields (all users can update these)
    if (!user.profile) user.profile = {};
    
    if (firstName !== undefined) user.profile.firstName = firstName;
    if (lastName !== undefined) user.profile.lastName = lastName;
    if (department !== undefined) user.profile.department = department;
    if (phone !== undefined) user.profile.phone = phone;

    // Also update legacy fields for backward compatibility
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(req.user.id).select('-password -security.passwordHistory');
    res.json({ message: 'Personal information updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Update personal info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/profile/email
// @desc    Request email address change with verification
// @access  Private
router.put('/email', authenticateToken, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const crypto = require('crypto');
    const emailService = require('../utils/emailService');
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if new email is the same as current email
    if (user.email === newEmail.toLowerCase()) {
      return res.status(400).json({ message: 'New email must be different from current email' });
    }

    // Check if new email is already used by another user
    const existingUser = await User.findOne({ 
      email: newEmail.toLowerCase(),
      _id: { $ne: user._id }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'This email address is already associated with another account' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with pending email change
    user.security = user.security || {};
    user.security.emailVerification = {
      pendingEmail: newEmail.toLowerCase(),
      verificationToken,
      tokenExpires,
      requestedAt: new Date()
    };

    await user.save();

    // Try to send verification email
    try {
      // Auto-configure email service from environment
      if (!emailService.getStatus().isConfigured) {
        emailService.autoConfigureFromEnv();
      }

      // Send verification email to new email address
      await emailService.sendEmailVerification(
        user.email,
        newEmail.toLowerCase(),
        verificationToken,
        user.username
      );

      // Send notification to old email address
      await emailService.sendEmailChangeNotification(
        user.email,
        newEmail.toLowerCase(),
        user.username
      );

      res.json({
        success: true,
        message: 'Verification email sent successfully. Please check your new email address to complete the change.',
        pendingEmail: newEmail.toLowerCase(),
        expiresAt: tokenExpires
      });

    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      
      // Clear the pending verification since email failed
      user.security.emailVerification = undefined;
      await user.save();

      res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please ensure email service is configured properly.',
        error: emailError.message
      });
    }

  } catch (error) {
    console.error('Email change request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process email change request',
      error: error.message
    });
  }
});

// @route   POST /api/profile/verify-email
// @desc    Verify email change with token
// @access  Public
router.post('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Verification token and email are required'
      });
    }

    // Find user with matching pending email and token
    const user = await User.findOne({
      'security.emailVerification.pendingEmail': email.toLowerCase(),
      'security.emailVerification.verificationToken': token
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token or email address'
      });
    }

    // Check if token has expired
    const now = new Date();
    if (user.security.emailVerification.tokenExpires < now) {
      // Clean up expired verification data
      user.security.emailVerification = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Verification token has expired. Please request a new email change.'
      });
    }

    // Update user's email address
    const oldEmail = user.email;
    const newEmail = user.security.emailVerification.pendingEmail;
    
    user.email = newEmail;
    user.security.emailVerification = undefined; // Clear verification data
    
    await user.save();

    console.log(`Email successfully changed from ${oldEmail} to ${newEmail} for user ${user.username}`);

    res.json({
      success: true,
      message: 'Email address successfully updated!',
      newEmail: newEmail,
      updatedAt: new Date()
  });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email change',
      error: error.message
    });
  }
});

// @route   PUT /api/profile/avatar
// @desc    Update profile avatar
// @access  Private
router.put('/avatar', authenticateToken, async (req, res) => {
  try {
    const { avatar } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update nested profile avatar
    if (!user.profile) user.profile = {};
    user.profile.avatar = avatar;

    // Also update legacy field
    user.avatar = avatar;

    await user.save();

    res.json({ message: 'Avatar updated successfully', avatar });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/profile/cover
// @desc    Update cover background
// @access  Private
router.put('/cover', authenticateToken, async (req, res) => {
  try {
    const { coverImage } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update nested profile cover
    if (!user.profile) user.profile = {};
    user.profile.coverImage = coverImage;

    await user.save();

    res.json({ message: 'Cover background updated successfully', coverImage });
  } catch (error) {
    console.error('Update cover error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/profile/password
// @desc    Change password
// @access  Private
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Store old password in history
    if (!user.security) user.security = {};
    if (!user.security.passwordHistory) user.security.passwordHistory = [];
    
    user.security.passwordHistory.push({
      hashedPassword: user.password,
      changedAt: new Date()
    });

    // Keep only last 5 passwords in history
    if (user.security.passwordHistory.length > 5) {
      user.security.passwordHistory = user.security.passwordHistory.slice(-5);
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/profile/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { theme, notifications, interface: interfaceSettings } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize preferences if not exists
    if (!user.preferences) user.preferences = {};

    // Update theme preferences
    if (theme) {
      if (!user.preferences.theme) user.preferences.theme = {};
      if (theme.isDarkTheme !== undefined) {
        user.preferences.theme.isDarkTheme = theme.isDarkTheme;
        user.isDarkTheme = theme.isDarkTheme; // Legacy compatibility
      }
    }

    // Update notification preferences
    if (notifications) {
      if (!user.preferences.notifications) user.preferences.notifications = {};
      if (notifications.email !== undefined) {
        user.preferences.notifications.email = notifications.email;
        user.emailNotifications = notifications.email; // Legacy compatibility
      }
      if (notifications.browser !== undefined) {
        user.preferences.notifications.browser = notifications.browser;
        user.browserNotifications = notifications.browser; // Legacy compatibility
      }
      if (notifications.sms !== undefined) {
        user.preferences.notifications.sms = notifications.sms;
        user.smsNotifications = notifications.sms; // Legacy compatibility
      }
    }

    // Update interface preferences
    if (interfaceSettings) {
      if (!user.preferences.interface) user.preferences.interface = {};
      Object.assign(user.preferences.interface, interfaceSettings);
    }

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password -security.passwordHistory');
    res.json({ message: 'Preferences updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status.json({ message: 'Server error' });
  }
});

// @route   PUT /api/profile/two-factor
// @desc    Enable/disable two-factor authentication
// @access  Private
router.put('/two-factor', authenticateToken, async (req, res) => {
  try {
    const { enabled, secret, backupCodes } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize security if not exists
    if (!user.security) user.security = {};
    if (!user.security.twoFactorAuth) user.security.twoFactorAuth = {};

    user.security.twoFactorAuth.enabled = enabled;
    user.twoFactorAuth = enabled; // Legacy compatibility

    if (enabled) {
      user.security.twoFactorAuth.secret = secret;
      user.security.twoFactorAuth.backupCodes = backupCodes;
      user.twoFactorSecret = secret; // Legacy compatibility
      user.backupCodes = backupCodes; // Legacy compatibility
    } else {
      user.security.twoFactorAuth.secret = undefined;
      user.security.twoFactorAuth.backupCodes = [];
      user.twoFactorSecret = undefined; // Legacy compatibility
      user.backupCodes = []; // Legacy compatibility
    }

    await user.save();

    res.json({ 
      message: enabled ? '2FA enabled successfully' : '2FA disabled successfully',
      enabled 
    });
  } catch (error) {
    console.error('Update 2FA error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/profile/login-sessions
// @desc    Get user login sessions
// @access  Private
router.get('/login-sessions', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('security.loginSessions');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const sessions = user.security && user.security.loginSessions 
      ? user.security.loginSessions.filter(session => session.isActive)
      : [];

    res.json(sessions);
  } catch (error) {
    console.error('Get login sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/profile/login-sessions/:sessionId
// @desc    Terminate a login session
// @access  Private
router.delete('/login-sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.security && user.security.loginSessions) {
      const session = user.security.loginSessions.find(s => s.sessionId === req.params.sessionId);
      if (session) {
        session.isActive = false;
        await user.save();
      }
    }

    res.json({ message: 'Session terminated successfully' });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/profile/stats
// @desc    Update profile stats
// @access  Private
router.put('/stats', authenticateToken, async (req, res) => {
  try {
    const { activeMonitors, alertsResolved, criticalIncidents } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize profile stats if not exists
    if (!user.profile) user.profile = {};
    if (!user.profile.stats) user.profile.stats = {};

    // Update stats
    if (activeMonitors !== undefined) {
      user.profile.stats.activeMonitors = activeMonitors;
      user.activeMonitors = activeMonitors; // Legacy compatibility
    }
    if (alertsResolved !== undefined) {
      user.profile.stats.alertsResolved = alertsResolved;
      user.alertsResolved = alertsResolved; // Legacy compatibility
    }
    if (criticalIncidents !== undefined) {
      user.profile.stats.criticalIncidents = criticalIncidents;
      user.criticalIncidents = criticalIncidents; // Legacy compatibility
    }

    await user.save();

    res.json({ message: 'Profile stats updated successfully', stats: user.profile.stats });
  } catch (error) {
    console.error('Update stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/profile/password/request-otp
// @desc    Request OTP for password change  
// @access  Private
router.post('/password/request-otp', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // Store OTP and new password temporarily (hashed once to avoid double hashing later)
    const tempPasswordHash = await bcrypt.hash(newPassword, 10);

    // Initialize security object if not exists
    if (!user.security) user.security = {};
    if (!user.security.passwordChange) user.security.passwordChange = {};

    user.security.passwordChange = {
      otp: await bcrypt.hash(otp, 10),
      otpExpires: otpExpires,
      newPasswordHash: tempPasswordHash, // Store pre-hashed password
      requestedAt: new Date()
    };

    console.log('🔧 Setting OTP session data:', {
      userId: req.user.id,
      hasOtpHash: !!user.security.passwordChange.otp,
      otpExpires: user.security.passwordChange.otpExpires,
      hasNewPasswordHash: !!user.security.passwordChange.newPasswordHash,
      requestedAt: user.security.passwordChange.requestedAt
    });

    console.log('💾 Saving OTP session for user:', req.user.id);
    
    // Mark the nested security object as modified to ensure it saves
    user.markModified('security');
    user.markModified('security.passwordChange');
    
    try {
      await user.save();
      console.log('✅ OTP session save completed successfully');
    } catch (saveError) {
      console.error('❌ Failed to save OTP session:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save OTP session. Please try again.'
      });
    }
    
    // Verify the save was successful with a fresh database query
    const savedUser = await User.findById(req.user.id);
    console.log('✅ OTP session verification:', {
      hasSecurity: !!savedUser.security,
      hasPasswordChange: !!savedUser.security?.passwordChange,
      hasOtp: !!savedUser.security?.passwordChange?.otp,
      hasNewPasswordHash: !!savedUser.security?.passwordChange?.newPasswordHash,
      expiresAt: savedUser.security?.passwordChange?.otpExpires
    });
    
    if (!savedUser.security?.passwordChange?.otp) {
      console.error('❌ OTP session verification failed - data not persisted');
      return res.status(500).json({
        success: false,
        message: 'Failed to create OTP session. Please try again.'
      });
    }

    // Send OTP email
    const emailService = require('../utils/emailService');
    try {
      await emailService.sendPasswordChangeOTP(user.email, user.username, otp);
      
      res.json({
        success: true,
        message: 'OTP sent to your email address. Please check your inbox.',
        expiresAt: otpExpires
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/profile/password/verify-otp
// @desc    Verify OTP and change password
// @access  Private
router.post('/password/verify-otp', authenticateToken, async (req, res) => {
  try {
    console.log('🔐 OTP Verification Request:', {
      userId: req.user?.id,
      hasOtp: !!req.body?.otp,
      otpLength: req.body?.otp?.length,
      timestamp: new Date().toISOString()
    });
    
    const { otp } = req.body;
    
    if (!otp) {
      console.log('❌ OTP verification failed: Missing OTP');
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('❌ OTP verification failed: User not found for ID:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('🔍 User found, checking security state:', {
      userId: user._id,
      hasSecurityObj: !!user.security,
      hasPasswordChange: !!user.security?.passwordChange,
      hasOtp: !!user.security?.passwordChange?.otp,
      hasExpiry: !!user.security?.passwordChange?.otpExpires,
      expiryTime: user.security?.passwordChange?.otpExpires,
      timeNow: new Date().toISOString()
    });

    // Check if there's a pending password change
    if (!user.security?.passwordChange?.otp) {
      console.log('❌ OTP verification failed: No pending password change request');
      return res.status(400).json({
        success: false,
        message: 'No pending password change request found'
      });
    }

    // Check if OTP has expired
    if (new Date() > user.security.passwordChange.otpExpires) {
      console.log('❌ OTP verification failed: OTP expired');
      // Clean up expired request
      user.security.passwordChange = undefined;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP
    const bcrypt = require('bcryptjs');
    const isOtpValid = await bcrypt.compare(otp, user.security.passwordChange.otp);
    console.log('🔍 OTP comparison result:', isOtpValid);
    
    if (!isOtpValid) {
      console.log('❌ OTP verification failed: Invalid OTP');
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    console.log('✅ OTP verification successful, updating password');

    // Store old password in history
    if (!user.security.passwordHistory) user.security.passwordHistory = [];
    
    user.security.passwordHistory.push({
      hashedPassword: user.password,
      changedAt: new Date()
    });

    // Keep only last 5 passwords in history
    if (user.security.passwordHistory.length > 5) {
      user.security.passwordHistory = user.security.passwordHistory.slice(-5);
    }

    // Use the pre-hashed password directly (no additional hashing needed)
    const hashedNewPassword = user.security.passwordChange.newPasswordHash;

    // Update password directly in MongoDB to bypass User model pre-save middleware
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashedNewPassword,
          'security.passwordHistory': user.security.passwordHistory
        },
        $unset: { 
          'security.passwordChange': '' 
        }
      }
    );

    console.log('✅ Password changed successfully for user:', req.user.id);

    res.json({
      success: true,
      message: 'Password changed successfully!'
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;