const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
  console.log('✅ Uploads directory created');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/m4a', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// In-memory storage for transcriptions
let transcriptions = [];

// ============= ROUTES =============

// Root route - This fixes the "Cannot GET /" error
app.get('/', (req, res) => {
  res.json({
    message: '🎙️ Speech-to-Text API Server',
    version: '1.0.0',
    status: 'Running',
    port: 5003,
    endpoints: {
      'API Information': {
        'GET /': 'This information',
        'GET /api/health': 'Check server health status'
      },
      'Transcription Endpoints': {
        'POST /api/transcribe': 'Upload audio file for transcription',
        'GET /api/transcriptions': 'Get all transcriptions',
        'GET /api/transcriptions/:id': 'Get specific transcription',
        'DELETE /api/transcriptions/:id': 'Delete a transcription'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running successfully!',
    port: 5003,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Transcribe endpoint - Upload audio
app.post('/api/transcribe', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No audio file uploaded' 
      });
    }

    // Create transcription text
    const transcriptionText = `[${new Date().toLocaleString()}] 
    Transcription for file: "${req.file.originalname}"
    File size: ${(req.file.size / 1024).toFixed(2)} KB
    File type: ${req.file.mimetype}
    
    This is a simulated transcription. The OpenAI Whisper API will be integrated on Day 4.
    The actual AI-powered transcription will provide accurate speech-to-text conversion.`;

    // Save to memory
    const newTranscription = {
      id: Date.now(),
      text: transcriptionText,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      createdAt: new Date().toISOString(),
      wordCount: transcriptionText.split(/\s+/).length
    };

    transcriptions.unshift(newTranscription);
    
    console.log(`✅ Transcription saved: ${req.file.originalname} (ID: ${newTranscription.id})`);
    console.log(`📊 Total transcriptions: ${transcriptions.length}`);

    res.json({
      success: true,
      message: 'Audio processed successfully',
      transcription: transcriptionText,
      metadata: {
        id: newTranscription.id,
        fileName: newTranscription.fileName,
        fileSize: (newTranscription.fileSize / 1024).toFixed(2) + ' KB',
        wordCount: newTranscription.wordCount,
        createdAt: newTranscription.createdAt
      }
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all transcriptions
app.get('/api/transcriptions', (req, res) => {
  res.json({
    success: true,
    count: transcriptions.length,
    data: transcriptions
  });
});

// Get single transcription by ID
app.get('/api/transcriptions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const transcription = transcriptions.find(t => t.id === id);
  
  if (!transcription) {
    return res.status(404).json({ 
      success: false, 
      error: 'Transcription not found' 
    });
  }
  
  res.json({
    success: true,
    data: transcription
  });
});

// Delete transcription by ID
app.delete('/api/transcriptions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = transcriptions.findIndex(t => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({ 
      success: false, 
      error: 'Transcription not found' 
    });
  }
  
  const deleted = transcriptions.splice(index, 1);
  res.json({
    success: true,
    message: 'Transcription deleted successfully',
    deleted: deleted[0]
  });
});

// Clear all transcriptions
app.delete('/api/transcriptions', (req, res) => {
  const count = transcriptions.length;
  transcriptions = [];
  res.json({
    success: true,
    message: `Cleared ${count} transcriptions`
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.url}`,
    availableEndpoints: {
      'GET /': 'API information',
      'GET /api/health': 'Health check',
      'POST /api/transcribe': 'Upload audio',
      'GET /api/transcriptions': 'Get all transcriptions',
      'GET /api/transcriptions/:id': 'Get one transcription',
      'DELETE /api/transcriptions/:id': 'Delete transcription',
      'DELETE /api/transcriptions': 'Clear all transcriptions'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
const PORT = 5003;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🎙️  SPEECH-TO-TEXT API SERVER');
  console.log('='.repeat(60));
  console.log(`✅ Server is running on port: ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log(`📡 API Info: http://localhost:${PORT}/`);
  console.log(`🎤 Upload: POST http://localhost:${PORT}/api/transcribe`);
  console.log(`📝 History: GET http://localhost:${PORT}/api/transcriptions`);
  console.log('='.repeat(60));
  console.log('✨ Ready to accept audio transcriptions!');
  console.log('='.repeat(60) + '\n');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.log('Please free up the port and try again.\n');
  } else {
    console.error('Server error:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;