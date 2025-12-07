const mongoose = require('mongoose');

// MongoDB connection
const mongoURI = 'mongodb://admin:mongo123@mongodb:27017/nms_db?authSource=admin';

// User schema (simplified version for updating admin)
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function updateAdminEmail() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find the admin user
    console.log('🔍 Finding admin user...');
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('❌ No admin user found in database');
      return;
    }

    console.log(`📧 Current admin email: ${adminUser.email}`);
    console.log(`👤 Admin username: ${adminUser.username}`);

    // Update the email
    const newEmail = 'g76697024@gmail.com';
    adminUser.email = newEmail;
    
    await adminUser.save();
    
    console.log(`✅ Admin email successfully updated to: ${newEmail}`);
    console.log('🎉 Update completed!');
    
  } catch (error) {
    console.error('❌ Error updating admin email:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

updateAdminEmail();
