const mongoose = require('mongoose');
require('dotenv').config();

const testDatabase = async () => {
  try {
    console.log('Testing MongoDB connection...');
    console.log('Connection string:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected to MongoDB successfully!');
    
    // Test creating a collection
    const testSchema = new mongoose.Schema({
      test: String,
      date: { type: Date, default: Date.now }
    });
    
    const Test = mongoose.model('Test', testSchema);
    const testDoc = new Test({ test: 'Hello MongoDB!' });
    await testDoc.save();
    
    console.log('✅ Successfully created test document');
    console.log('Test document ID:', testDoc._id);
    
    // Clean up
    await Test.deleteMany({});
    console.log('✅ Test document cleaned up');
    
    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure MongoDB is installed and running');
    console.log('2. For local MongoDB: Run "mongod" or "brew services start mongodb-community"');
    console.log('3. For MongoDB Atlas: Check your internet connection and credentials');
    console.log('4. Verify your .env file has the correct MONGODB_URI');
    process.exit(1);
  }
};

testDatabase();