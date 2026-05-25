const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  console.log('🔄 Testing MongoDB Atlas connection...');
  console.log('📡 Connection string (hidden password):', 
    process.env.MONGODB_URI?.replace(/:[^:@]*@/, ':****@'));
  
  try {
    // Add connection options for better reliability
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    // Get connection info
    const db = mongoose.connection;
    console.log(`📚 Database name: ${db.name}`);
    console.log(`🔗 Host: ${db.host}`);
    
    // Test creating a collection
    const testSchema = new mongoose.Schema({
      testMessage: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const TestModel = mongoose.model('ConnectionTest', testSchema);
    
    // Insert test document
    const testDoc = new TestModel({ testMessage: 'Hello from Speech-to-Text App!' });
    await testDoc.save();
    console.log('✅ Test document created with ID:', testDoc._id);
    
    // Retrieve test document
    const found = await TestModel.findById(testDoc._id);
    console.log('✅ Test document retrieved:', found.testMessage);
    
    // Clean up
    await TestModel.deleteMany({});
    console.log('✅ Test data cleaned up');
    
    // Close connection
    await mongoose.disconnect();
    console.log('🔌 Connection closed');
    console.log('\n🎉 MongoDB Atlas is working perfectly!');
    console.log('\n📝 Next steps:');
    console.log('1. Run `npm run dev` to start the server');
    console.log('2. Start frontend with `cd ../frontend && npm run dev`');
    console.log('3. Upload audio files and see them saved to database');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    
    if (error.message.includes('bad auth')) {
      console.log('\n🔑 Authentication Error:');
      console.log('   - Check username and password in connection string');
      console.log('   - Make sure the database user exists in MongoDB Atlas');
      console.log('   - Verify password is correct (no special characters need encoding)');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('\n🌐 Network Error:');
      console.log('   - Check your internet connection');
      console.log('   - Verify the cluster name is correct');
      console.log('   - Make sure you\'re not behind a firewall');
    }
    
    if (error.message.includes('timed out')) {
      console.log('\n⏱️  Timeout Error:');
      console.log('   - Check Network Access in MongoDB Atlas');
      console.log('   - Add your IP address to whitelist');
      console.log('   - Or enable "Allow Access from Anywhere"');
    }
    
    console.log('\n🔧 Quick Fixes:');
    console.log('1. Go to MongoDB Atlas -> Network Access -> Add IP Address');
    console.log('2. Add 0.0.0.0/0 (Allow from anywhere) for testing');
    console.log('3. Verify database user has read/write permissions');
    console.log('4. Check that cluster is active (not paused)');
    
    process.exit(1);
  }
};

testConnection();