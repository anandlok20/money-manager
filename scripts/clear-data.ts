/**
 * Clear Data Script for Money Manager
 * 
 * Run with: npm run seed:clear
 * 
 * This will clear ALL data for the test user
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function clearData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Get test user
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: 'test@example.com' });
    
    if (!user) {
      console.log('⚠️ Test user not found. Nothing to clear.');
      return;
    }

    const userId = user._id;
    console.log(`👤 Clearing data for user: ${user.email} (${userId})`);

    // Collections to clear
    const collections = [
      'members',
      'categories',
      'bankaccounts',
      'cards',
      'investments',
      'transactions',
      'budgets',
      'goals',
      'trips',
      'scheduledpayments',
      'vehicles',
      'documents',
    ];

    console.log('\n🧹 Clearing collections...');
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const result = await collection.deleteMany({ userId });
        console.log(`   ✅ ${collectionName}: ${result.deletedCount} documents deleted`);
      } catch {
        console.log(`   ⚠️ ${collectionName}: collection may not exist`);
      }
    }

    console.log('\n🎉 Data cleared successfully!');

  } catch (error) {
    console.error('❌ Clear failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the clear
clearData().catch(console.error);
