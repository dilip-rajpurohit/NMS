#!/usr/bin/env node
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

(async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nms_db';
    const username = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
    const newPassword = process.argv[3] || 'admin123';

    if (!newPassword || newPassword.length < 6) {
      console.error('New password must be at least 6 characters.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    const user = await User.findOne({ username });
    if (!user) {
      console.error(`User '${username}' not found.`);
      process.exit(1);
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    console.log(`✅ Password for user '${username}' has been reset.`);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting password:', err.message);
    process.exit(1);
  } finally {
    try { await mongoose.connection.close(); } catch (_) {}
  }
})();
