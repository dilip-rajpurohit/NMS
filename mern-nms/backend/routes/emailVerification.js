const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');

const router = express.Router();

// @route   POST /api/email-verification/request-change
// @desc    Request email change and send verification email
// @access  Private
router.post('/request-change', authenticateToken, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const userId = req.user._id;

    if (!newEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'New email address and password are required'
      });
    }

    // Fetch user with password for verification
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify user's current password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password. Please enter your current password to change email.'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if new email is the same as current email
    if (user.email === newEmail.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'New email must be different from current email'
      });
    }

    // Check if new email is already used by another user
    const existingUser = await User.findOne({ 
      email: newEmail.toLowerCase(),
      _id: { $ne: user._id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email address is already associated with another account'
      });
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
        data: {
          pendingEmail: newEmail.toLowerCase(),
          expiresAt: tokenExpires
        }
      });

    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      
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
    logger.error('Email change request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process email change request',
      error: error.message
    });
  }
});

// @route   POST /api/email-verification/verify
// @desc    Verify email change with token
// @access  Public
router.post('/verify', async (req, res) => {
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

    logger.info(`Email successfully changed from ${oldEmail} to ${newEmail} for user ${user.username}`);

    res.json({
      success: true,
      message: 'Email address successfully updated!',
      data: {
        newEmail: newEmail,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email change',
      error: error.message
    });
  }
});

// @route   GET /api/email-verification/status
// @desc    Get current email verification status
// @access  Private
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const emailVerification = user.security?.emailVerification;

    if (!emailVerification || !emailVerification.pendingEmail) {
      return res.json({
        success: true,
        data: {
          hasPendingChange: false,
          currentEmail: user.email
        }
      });
    }

    // Check if token has expired
    const now = new Date();
    const isExpired = emailVerification.tokenExpires < now;

    if (isExpired) {
      // Clean up expired verification data
      user.security.emailVerification = undefined;
      await user.save();

      return res.json({
        success: true,
        data: {
          hasPendingChange: false,
          currentEmail: user.email
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasPendingChange: true,
        currentEmail: user.email,
        pendingEmail: emailVerification.pendingEmail,
        requestedAt: emailVerification.requestedAt,
        expiresAt: emailVerification.tokenExpires
      }
    });

  } catch (error) {
    logger.error('Email verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification status',
      error: error.message
    });
  }
});

// @route   DELETE /api/email-verification/cancel
// @desc    Cancel pending email change
// @access  Private
router.delete('/cancel', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.security?.emailVerification?.pendingEmail) {
      return res.status(400).json({
        success: false,
        message: 'No pending email change to cancel'
      });
    }

    // Clear verification data
    user.security.emailVerification = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email change request cancelled successfully'
    });

  } catch (error) {
    logger.error('Email verification cancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel email change',
      error: error.message
    });
  }
});

// @route   GET /api/email-verification/service-status
// @desc    Check email service configuration status (Admin only)
// @access  Private (Admin only)
router.get('/service-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = emailService.getStatus();
    
    // Test connection if configured
    let connectionTest = null;
    if (status.isConfigured) {
      try {
        await emailService.testConnection();
        connectionTest = { success: true, message: 'Connection successful' };
      } catch (error) {
        connectionTest = { success: false, message: error.message };
      }
    }

    res.json({
      success: true,
      data: {
        ...status,
        connectionTest,
        environmentConfig: {
          hasSmtpHost: !!process.env.SMTP_HOST,
          hasSmtpUser: !!process.env.SMTP_USER,
          hasSmtpPassword: !!process.env.SMTP_PASSWORD,
          smtpPort: process.env.SMTP_PORT || '587',
          smtpSecure: process.env.SMTP_SECURE || 'false'
        }
      }
    });

  } catch (error) {
    logger.error('Email service status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email service status',
      error: error.message
    });
  }
});

module.exports = router;