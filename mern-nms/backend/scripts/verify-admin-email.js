const mongoose = require('mongoose');

// MongoDB connection
const mongoURI = 'mongodb://admin:mongo123@mongodb:27017/nms_db?authSource=admin';

// User schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  role: String
});

const User = mongoose.model('User', userSchema);

async function verifyAdminEmail() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find the admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('❌ No admin user found');
      return;
    }

    console.log('📋 Admin User Details:');
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    
    if (adminUser.email === 'g76697024@gmail.com') {
      console.log('✅ Email update verified successfully!');
    } else {
      console.log('❌ Email was not updated correctly');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

verifyAdminEmail();