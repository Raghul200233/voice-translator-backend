const mongoose = require('mongoose');
require('dotenv').config();

const testConnections = async () => {
  const connections = [
    {
      name: 'Standard TCP (Recommended)',
      uri: 'mongodb://rahulsls332002_db_user:IdMUF9FUExROdtvs@cluster0.qkuysrk.mongodb.net:27017/voice-to-text?authSource=admin&retryWrites=true&w=majority'
    },
    {
      name: 'With replicaSet',
      uri: 'mongodb://rahulsls332002_db_user:IdMUF9FUExROdtvs@cluster0.qkuysrk.mongodb.net:27017,cluster0.qkuysrk.mongodb.net:27018,cluster0.qkuysrk.mongodb.net:27019/voice-to-text?authSource=admin&replicaSet=atlas-xyz&retryWrites=true&w=majority'
    },
    {
      name: 'Direct connection',
      uri: 'mongodb://rahulsls332002_db_user:IdMUF9FUExROdtvs@cluster0-shard-00-00.qkuysrk.mongodb.net:27017,cluster0-shard-00-01.qkuysrk.mongodb.net:27017,cluster0-shard-00-02.qkuysrk.mongodb.net:27017/voice-to-text?authSource=admin&replicaSet=atlas-xyz&ssl=true&retryWrites=true&w=majority'
    }
  ];
  
  for (const conn of connections) {
    console.log(`\n🔄 Testing: ${conn.name}`);
    console.log(`📡 URI: ${conn.uri.replace(/:[^:@]*@/, ':****@')}`);
    
    try {
      await mongoose.connect(conn.uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });
      
      console.log(`✅ SUCCESS! Connected to: ${mongoose.connection.name}`);
      console.log(`📚 Database: ${mongoose.connection.db.databaseName}`);
      
      await mongoose.disconnect();
      console.log(`\n🎉 WORKING CONNECTION STRING:\n${conn.uri}\n`);
      process.exit(0);
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      await mongoose.disconnect().catch(() => {});
    }
  }
  
  console.log('\n⚠️  All connection attempts failed.');
  console.log('\n💡 ALTERNATIVE SOLUTION: Use the server with in-memory storage');
  console.log('   Your server will still work without MongoDB!\n');
};

testConnections();