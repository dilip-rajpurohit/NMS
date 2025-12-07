#!/usr/bin/env node

/**
 * Database Index Fixer Script
 * Ensures proper database indexes for the Device collection
 * Fixes issues with old 'ip' indexes and ensures sparse macAddress indexes
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fixDatabaseIndexes() {
  try {
    console.log('🔧 Starting database index fix...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('devices');

    // Get current indexes
    const indexes = await collection.indexes();
    console.log('📊 Current indexes:', indexes.map(idx => idx.name));

    // Drop problematic old indexes if they exist
    const problematicIndexes = ['ip_1'];
    for (const indexName of problematicIndexes) {
      try {
        await collection.dropIndex(indexName);
        console.log(`🗑️  Dropped problematic index: ${indexName}`);
      } catch (error) {
        if (error.codeName === 'IndexNotFound') {
          console.log(`ℹ️  Index ${indexName} not found (already removed)`);
        } else {
          console.warn(`⚠️  Could not drop index ${indexName}:`, error.message);
        }
      }
    }

    // Recreate macAddress index as sparse if needed
    try {
      await collection.dropIndex('macAddress_1');
      console.log('🗑️  Dropped non-sparse macAddress index');
    } catch (error) {
      if (error.codeName !== 'IndexNotFound') {
        console.warn('⚠️  Could not drop macAddress index:', error.message);
      }
    }

    // Create proper sparse macAddress index
    await collection.createIndex(
      { macAddress: 1 }, 
      { unique: true, sparse: true, name: 'macAddress_1' }
    );
    console.log('✅ Created sparse macAddress index');

    // Ensure ipAddress index exists (should be created by Mongoose)
    const ipAddressIndexExists = indexes.some(idx => idx.key && idx.key.ipAddress);
    if (!ipAddressIndexExists) {
      await collection.createIndex(
        { ipAddress: 1 }, 
        { unique: true, name: 'ipAddress_1' }
      );
      console.log('✅ Created ipAddress index');
    } else {
      console.log('ℹ️  ipAddress index already exists');
    }

    // Verify final index state
    const finalIndexes = await collection.indexes();
    console.log('📊 Final indexes:', finalIndexes.map(idx => `${idx.name} (${JSON.stringify(idx.key)})`));

    console.log('✅ Database index fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
if (require.main === module) {
  fixDatabaseIndexes().then(() => {
    console.log('🎉 Index fix script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Index fix script failed:', error);
    process.exit(1);
  });
}

module.exports = fixDatabaseIndexes;