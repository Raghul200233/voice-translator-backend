const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Import routes
const transcriptionRoutes = require('./routes/transcriptionRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/webm', 'audio/m4a'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.log('⚠️  Continuing without database... Transcriptions will not be saved');
  }
};

// Connect to database
connectDB();

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Transcription routes
app.use('/api/transcriptions', transcriptionRoutes);

// Upload and transcribe endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // This is a placeholder - Whisper API will be integrated on Day 4
    // For now, we'll return a mock transcription
    const mockTranscription = `This is a mock transcription for testing. File: ${req.file.filename}. 
    The actual Whisper API integration will be implemented on Day 4. 
    For now, the file has been uploaded successfully and would be transcribed by AI.`;

    // Save to database if MongoDB is connected
    let savedTranscription = null;
    if (mongoose.connection.readyState === 1) {
      const Transcription = require('./models/Transcription');
      savedTranscription = new Transcription({
        text: mockTranscription,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        duration: null,
        confidence: null
      });
      await savedTranscription.save();
      console.log('Transcription saved to database:', savedTranscription._id);
    }

    res.json({
      success: true,
      transcription: mockTranscription,
      file: {
        name: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      },
      savedToDatabase: savedTranscription ? true : false,
      transcriptionId: savedTranscription?._id
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all transcriptions from database
app.get('/api/transcriptions', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database not connected. Please check MongoDB connection.' 
      });
    }
    
    const Transcription = require('./models/Transcription');
    const transcriptions = await Transcription.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: transcriptions
    });
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎤 Transcribe endpoint: http://localhost:${PORT}/api/transcribe`);
  console.log(`📝 Transcriptions: http://localhost:${PORT}/api/transcriptions\n`);
});