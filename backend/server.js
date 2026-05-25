const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Import models and routes
const EnhancedTranscription = require('./models/EnhancedTranscription');
const enhancedTranscriptionRoutes = require('./routes/enhancedTranscriptionRoutes');

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📚 Database: ${mongoose.connection.name}`);
    
    // Create indexes
    await EnhancedTranscription.init();
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

connectDB();

// Setup uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/m4a'];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'OK',
    version: '2.0',
    database: dbStatus,
    features: ['categories', 'tags', 'favorites', 'search', 'statistics', 'sharing'],
    timestamp: new Date().toISOString()
  });
});

// Transcribe endpoint with enhanced metadata
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
    
    // Mock transcription (will be replaced with Whisper API on Day 4)
    const mockTranscription = `This is a simulated transcription for "${req.file.originalname}" at ${new Date().toLocaleString()}. 
    The OpenAI Whisper API will be integrated on Day 4 for accurate speech recognition.`;
    
    // Create enhanced transcription document
    const transcription = new EnhancedTranscription({
      text: mockTranscription,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      language: 'en',
      category: 'other',
      tags: ['upload', 'pending'],
      processingTime: Date.now() - startTime,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    await transcription.save();
    
    res.json({
      success: true,
      transcription: mockTranscription,
      metadata: {
        wordCount: transcription.wordCount,
        uniqueWords: transcription.uniqueWords,
        processingTime: transcription.processingTime,
        category: transcription.category,
        tags: transcription.tags
      },
      savedToDatabase: true,
      transcriptionId: transcription._id
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shared transcription
app.get('/api/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const transcription = await EnhancedTranscription.findOne({ 
      shareToken: token,
      isPublic: true 
    });
    
    if (!transcription) {
      return res.status(404).json({ error: 'Shared transcription not found' });
    }
    
    res.json({
      success: true,
      data: {
        text: transcription.text,
        fileName: transcription.fileName,
        createdAt: transcription.createdAt,
        wordCount: transcription.wordCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Use enhanced routes
app.use('/api/enhanced/transcriptions', enhancedTranscriptionRoutes);

// Legacy endpoint for backward compatibility
app.get('/api/transcriptions', async (req, res) => {
  try {
    const transcriptions = await EnhancedTranscription.find({})
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      data: transcriptions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 ENHANCED SPEECH-TO-TEXT SERVER (MongoDB)');
  console.log('='.repeat(60));
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`✅ Database: MongoDB with Enhanced Schema`);
  console.log(`📊 Features:`);
  console.log(`   - Categories & Tags Organization`);
  console.log(`   - Favorites & Color Coding`);
  console.log(`   - Full-Text Search`);
  console.log(`   - Statistics & Analytics`);
  console.log(`   - Pagination & Filtering`);
  console.log(`   - Bulk Operations`);
  console.log(`   - Shareable Links`);
  console.log(`   - Edit History Tracking`);
  console.log('='.repeat(60) + '\n');
});