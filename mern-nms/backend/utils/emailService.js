const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  // Configure email service with SMTP settings
  configure(smtpConfig) {
    try {
      const config = {
        host: smtpConfig.host || process.env.SMTP_HOST,
        port: smtpConfig.port || process.env.SMTP_PORT || 587,
        secure: smtpConfig.secure || (process.env.SMTP_SECURE === 'true'),
        auth: {
          user: smtpConfig.user || process.env.SMTP_USER,
          pass: smtpConfig.password || process.env.SMTP_PASSWORD
        }
      };

      // Validate required config
      if (!config.host || !config.auth.user || !config.auth.pass) {
        throw new Error('SMTP configuration incomplete: host, user, and password are required');
      }

      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      
      logger.info('Email service configured successfully');
      return true;
    } catch (error) {
      logger.error('Email service configuration failed:', error);
      this.isConfigured = false;
      return false;
    }
  }

  // Auto-configure from environment variables
  autoConfigureFromEnv() {
    const config = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD
    };

    return this.configure(config);
  }

  // Test email connection
  async testConnection() {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    try {
      await this.transporter.verify();
      logger.info('Email connection test successful');
      return true;
    } catch (error) {
      logger.error('Email connection test failed:', error);
      throw error;
    }
  }

  // Send verification email for email change
  async sendEmailVerification(userEmail, newEmail, verificationToken, username) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(newEmail)}`;
    
    const mailOptions = {
      from: `"NMS System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: newEmail,
      subject: 'Verify Your New Email Address - NMS System',
      html: this.generateVerificationEmailTemplate(username, userEmail, newEmail, verificationUrl),
      text: this.generateVerificationEmailText(username, userEmail, newEmail, verificationUrl)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent successfully to ${newEmail}`, { messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw error;
    }
  }

  // Send notification to old email about email change request
  async sendEmailChangeNotification(oldEmail, newEmail, username) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: `"NMS System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: oldEmail,
      subject: 'Email Change Request - NMS System',
      html: this.generateChangeNotificationTemplate(username, oldEmail, newEmail),
      text: this.generateChangeNotificationText(username, oldEmail, newEmail)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email change notification sent to ${oldEmail}`, { messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Failed to send email change notification:', error);
      throw error;
    }
  }

  // Generate HTML template for verification email
  generateVerificationEmailTemplate(username, oldEmail, newEmail, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your New Email Address</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .button { display: inline-block; background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
          .footer { background: #eee; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Email Verification Required</h1>
          </div>
          <div class="content">
            <h2>Hello ${username},</h2>
            <p>You have requested to change your email address in the NMS (Network Management System).</p>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
              <strong>Current Email:</strong> ${oldEmail}<br>
              <strong>New Email:</strong> ${newEmail}
            </div>
            
            <p>To complete this change, please click the verification button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="button">✅ Verify New Email Address</a>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This link will expire in 24 hours</li>
              <li>Your email will only be changed after verification</li>
              <li>If you didn't request this change, please ignore this email</li>
            </ul>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px;">${verificationUrl}</p>
          </div>
          <div class="footer">
            <p>This email was sent by NMS System. If you have questions, please contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate text version for verification email
  generateVerificationEmailText(username, oldEmail, newEmail, verificationUrl) {
    return `
Email Verification Required - NMS System

Hello ${username},

You have requested to change your email address in the NMS (Network Management System).

Current Email: ${oldEmail}
New Email: ${newEmail}

To complete this change, please visit the following link:
${verificationUrl}

Important:
- This link will expire in 24 hours
- Your email will only be changed after verification
- If you didn't request this change, please ignore this email

If you have any questions, please contact your system administrator.

---
This email was sent by NMS System
    `.trim();
  }

  // Generate HTML template for change notification
  generateChangeNotificationTemplate(username, oldEmail, newEmail) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Change Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .footer { background: #eee; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Email Change Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${username},</h2>
            <p>We're notifying you that a request was made to change the email address associated with your NMS account.</p>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0;">
              <strong>Current Email:</strong> ${oldEmail}<br>
              <strong>Requested New Email:</strong> ${newEmail}
            </div>
            
            <p>A verification email has been sent to the new email address. Your email will only be changed if the new address is verified.</p>
            
            <p><strong>If you didn't request this change:</strong></p>
            <ul>
              <li>Your account is secure - no changes will be made without verification</li>
              <li>Consider changing your password if you suspect unauthorized access</li>
              <li>Contact your system administrator if you have concerns</li>
            </ul>
          </div>
          <div class="footer">
            <p>This email was sent by NMS System. If you have questions, please contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send password change OTP email
  async sendPasswordChangeOTP(userEmail, username, otp) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: `"NMS System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: userEmail,
      subject: 'Password Change Verification - NMS System',
      html: this.generatePasswordOtpEmailTemplate(username, otp),
      text: this.generatePasswordOtpEmailText(username, otp)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Password change OTP sent successfully to ${userEmail}`, { messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Failed to send password change OTP email:', error);
      throw error;
    }
  }

  // Generate password change OTP email template
  generatePasswordOtpEmailTemplate(username, otp) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f8fafc; }
            .otp-box { background: #1f2937; color: #10b981; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🔒 Password Change Verification</h2>
            </div>
            <div class="content">
                <p>Hello <strong>${username}</strong>,</p>
                
                <p>You have requested to change your password for your NMS account. Please use the following One-Time Password (OTP) to complete the process:</p>
                
                <div class="otp-box">
                    ${otp}
                </div>
                
                <p><strong>This OTP will expire in 2 minutes.</strong></p>
                
                <div class="warning">
                    <h4>⚠️ Security Notice</h4>
                    <p>If you didn't request this password change:</p>
                    <ul>
                        <li>Do not share this OTP with anyone</li>
                        <li>Consider that someone may have access to your account</li>
                        <li>Contact your system administrator immediately</li>
                    </ul>
                </div>
                
                <p>For security reasons, please:</p>
                <ul>
                    <li>Keep this OTP confidential</li>
                    <li>Use it within the next 2 minutes</li>
                    <li>Do not forward this email</li>
                </ul>
            </div>
            <div class="footer">
                <p>This email was sent automatically by NMS System</p>
                <p>If you have any questions, please contact your system administrator</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Generate text version for password change OTP
  generatePasswordOtpEmailText(username, otp) {
    return `
Password Change Verification - NMS System

Hello ${username},

You have requested to change your password for your NMS account.

Your One-Time Password (OTP) is: ${otp}

This OTP will expire in 2 minutes.

SECURITY NOTICE:
If you didn't request this password change:
- Do not share this OTP with anyone
- Consider that someone may have access to your account
- Contact your system administrator immediately

For security reasons:
- Keep this OTP confidential
- Use it within the next 2 minutes
- Do not forward this email

---
This email was sent automatically by NMS System
If you have any questions, please contact your system administrator
    `.trim();
  }

  // Generate text version for change notification
  generateChangeNotificationText(username, oldEmail, newEmail) {
    return `
Email Change Request - NMS System

Hello ${username},

We're notifying you that a request was made to change the email address associated with your NMS account.

Current Email: ${oldEmail}
Requested New Email: ${newEmail}

A verification email has been sent to the new email address. Your email will only be changed if the new address is verified.

If you didn't request this change:
- Your account is secure - no changes will be made without verification
- Consider changing your password if you suspect unauthorized access
- Contact your system administrator if you have concerns

---
This email was sent by NMS System
    `.trim();
  }

  // Get service status
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      hasTransporter: !!this.transporter
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;