require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Schema
const transcriptionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

const Transcription = mongoose.model('Transcription', transcriptionSchema);

// MongoDB Connection with better options
const connectDB = async () => {
    try {
        // Try to connect to local MongoDB first
        const mongoURI = process.env.MONGODB_URI;
        
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });
        
        console.log('✅ MongoDB Connected Successfully');
        return true;
    } catch (error) {
        console.log('⚠️ MongoDB not available, using in-memory storage');
        return false;
    }
};

// In-memory fallback
let inMemoryTranscriptions = [];

// Initialize Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/m4a'];
        cb(null, allowedTypes.includes(file.mimetype));
    }
});

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1;
    res.json({
        status: 'OK',
        database: dbStatus ? 'connected' : 'disconnected',
        storage: dbStatus ? 'MongoDB' : 'In-Memory',
        groq: !!process.env.GROQ_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// Transcribe endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        console.log(`🎤 Processing: ${req.file.originalname}`);

        // Call Groq Whisper API
        const audioStream = fs.createReadStream(req.file.path);
        const transcription = await groq.audio.transcriptions.create({
            file: audioStream,
            model: "whisper-large-v3-turbo",
            language: "en",
            response_format: "json",
        });

        console.log(`✅ Transcribed: ${transcription.text.substring(0, 50)}...`);

        let savedDoc = null;
        let dbUsed = false;

        // Try to save to MongoDB if connected
        if (mongoose.connection.readyState === 1) {
            try {
                savedDoc = await Transcription.create({
                    text: transcription.text,
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                });
                dbUsed = true;
                console.log(`💾 Saved to MongoDB: ${savedDoc._id}`);
            } catch (dbError) {
                console.log('MongoDB save failed, using in-memory');
            }
        }

        // Fallback to in-memory
        if (!savedDoc) {
            savedDoc = {
                id: Date.now(),
                text: transcription.text,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                createdAt: new Date(),
            };
            inMemoryTranscriptions.unshift(savedDoc);
            console.log(`💾 Saved to memory: ${savedDoc.id}`);
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            transcription: transcription.text,
            savedToDatabase: dbUsed,
            storage: dbUsed ? 'MongoDB' : 'In-Memory',
            id: savedDoc._id || savedDoc.id
        });

    } catch (error) {
        console.error('Error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Get transcriptions endpoint
app.get('/api/transcriptions', async (req, res) => {
    try {
        let transcriptions = [];
        
        // Try to get from MongoDB first
        if (mongoose.connection.readyState === 1) {
            transcriptions = await Transcription.find().sort({ createdAt: -1 }).limit(50);
        } else {
            transcriptions = inMemoryTranscriptions;
        }
        
        res.json({
            success: true,
            data: transcriptions,
            count: transcriptions.length,
            storage: mongoose.connection.readyState === 1 ? 'MongoDB' : 'In-Memory'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete transcription endpoint
app.delete('/api/transcriptions/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        if (mongoose.connection.readyState === 1) {
            await Transcription.findByIdAndDelete(id);
        } else {
            const index = inMemoryTranscriptions.findIndex(t => t.id == id);
            if (index !== -1) inMemoryTranscriptions.splice(index, 1);
        }
        
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 5003;

// Connect to database and start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log('\n' + '='.repeat(50));
        console.log('🎙️ Speech-to-Text Server');
        console.log('='.repeat(50));
        console.log(`📍 http://localhost:${PORT}`);
        console.log(`✅ Groq API Ready`);
        console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'MongoDB Connected' : 'In-Memory Mode'}`);
        console.log('='.repeat(50) + '\n');
    });
});