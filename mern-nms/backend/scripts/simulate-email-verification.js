const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');

// MongoDB connection
const mongoURI = 'mongodb://admin:mongo123@mongodb:27017/nms_db?authSource=admin';

async function simulateEmailVerification() {
  try {
    console.log('🔧 Email Verification Simulation');
    console.log('================================\n');

    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('👤 Current admin details:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Username: ${adminUser.username}\n`);

    // Simulate email change request
    const newEmail = '02fe22bcs035@kletech.ac.in';
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with pending email change
    adminUser.security = adminUser.security || {};
    adminUser.security.emailVerification = {
      pendingEmail: newEmail,
      verificationToken,
      tokenExpires,
      requestedAt: new Date()
    };

    await adminUser.save();

    console.log('📧 EMAIL CHANGE REQUEST CREATED:');
    console.log(`   Current Email: ${adminUser.email}`);
    console.log(`   Pending Email: ${newEmail}`);
    console.log(`   Token: ${verificationToken}`);
    console.log(`   Expires: ${tokenExpires}\n`);

    // Generate verification URL
    const hostIP = process.env.IP || '10.125.226.235';
    const verificationUrl = `http://${hostIP}:3000/verify-email?token=${verificationToken}&email=${encodeURIComponent(newEmail)}`;

    console.log('🔗 EMAIL VERIFICATION LINK:');
    console.log(`${verificationUrl}\n`);

    console.log('📧 EMAIL CONTENT SIMULATION:');
    console.log('============================');
    console.log('TO: 02fe22bcs035@kletech.ac.in');
    console.log('FROM: NMS System');
    console.log('SUBJECT: Verify Your New Email Address - NMS System');
    console.log('');
    console.log('Hello admin,');
    console.log('');
    console.log('You have requested to change your email address in the NMS system.');
    console.log('');
    console.log(`Current Email: ${adminUser.email}`);
    console.log(`New Email: ${newEmail}`);
    console.log('');
    console.log('To complete this change, click the verification link below:');
    console.log(`${verificationUrl}`);
    console.log('');
    console.log('This link will expire in 24 hours.');
    console.log('Your email will only be changed after verification.');
    console.log('If you didn\'t request this change, please ignore this email.');
    console.log('');
    console.log('---');
    console.log('NMS System');
    console.log('');

    console.log('🧪 TO TEST VERIFICATION:');
    console.log('========================');
    console.log('1. Copy the verification link above');
    console.log('2. Open it in your browser, OR');
    console.log('3. Use the API endpoint directly:');
    console.log('');
    console.log('   curl -X POST http://' + hostIP + ':5000/api/email-verification/verify \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"token":"' + verificationToken + '","email":"' + newEmail + '"}\'');
    console.log('');
    console.log('🎯 VERIFICATION STATUS:');
    console.log('The email change is pending verification.');
    console.log('Email will be updated from:');
    console.log(`  ${adminUser.email} → ${newEmail}`);
    console.log('Only after clicking the verification link!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

simulateEmailVerification();