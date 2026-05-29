require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');
const mongoose = require('mongoose');

const app = express();
app.use(cors({
    origin: 'https://speech-to-text-chi-lac.vercel.app'
}));
app.use(express.json());

// ============ MONGODB SCHEMAS ============

// Transcription Schema with full features
const transcriptionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
    duration: { type: Number, default: null },
    language: { type: String, default: 'en' },
    category: { 
        type: String, 
        enum: ['meeting', 'lecture', 'interview', 'note', 'research', 'personal', 'work', 'other'],
        default: 'other' 
    },
    tags: [{ type: String }],
    isFavorite: { type: Boolean, default: false },
    wordCount: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
transcriptionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (this.text) {
        this.wordCount = this.text.trim().split(/\s+/).length;
    }
    next();
});

const Transcription = mongoose.model('Transcription', transcriptionSchema);

// ============ MONGODB CONNECTION ============

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            console.error('❌ MONGODB_URI not found in .env file');
            process.exit(1);
        }
        
        await mongoose.connect(mongoURI);
        
        console.log('✅ MongoDB Connected Successfully');
        console.log(`📚 Database: ${mongoose.connection.name}`);
        console.log(`🔗 Host: ${mongoose.connection.host}`);
        return true;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('⚠️  Please check your MONGODB_URI in .env file');
        process.exit(1);
    }
};

// ============ GROQ API SETUP ============

if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY not found in .env file');
    process.exit(1);
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});
console.log('✅ Groq API configured');

// ============ FILE UPLOAD SETUP ============

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/m4a', 'audio/mp4'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio files are allowed.'));
        }
    }
});

// ============ HELPER FUNCTIONS ============

function calculateWordCount(text) {
    return text.trim().split(/\s+/).length;
}

function estimateDuration(fileSize) {
    // Rough estimate: ~16KB per second for MP3
    return Math.round((fileSize * 8) / (128 * 1000));
}

// ============ API ENDPOINTS ============

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1;
    res.json({
        status: 'OK',
        message: 'Server is running',
        database: dbStatus ? 'connected' : 'disconnected',
        storage: 'MongoDB',
        groq: !!process.env.GROQ_API_KEY,
        version: '2.0.0',
        endpoints: {
            transcribe: 'POST /api/transcribe',
            transcriptions: 'GET /api/transcriptions',
            statistics: 'GET /api/statistics'
        },
        timestamp: new Date().toISOString()
    });
});

// Transcribe endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    const startTime = Date.now();
    
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No audio file uploaded' });
        }

        // Validate file size
        if (req.file.size > 25 * 1024 * 1024) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, error: 'File too large. Maximum size is 25MB.' });
        }

        console.log(`\n🎤 Processing: ${req.file.originalname}`);
        console.log(`📁 Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📝 Type: ${req.file.mimetype}`);

        // Call Groq Whisper API
        const audioStream = fs.createReadStream(req.file.path);
        const transcription = await groq.audio.transcriptions.create({
            file: audioStream,
            model: "whisper-large-v3-turbo",
            language: req.body.language || "en",
            response_format: "json",
            temperature: 0.0,
        });

        const processingTime = Date.now() - startTime;
        const wordCount = calculateWordCount(transcription.text);
        const duration = estimateDuration(req.file.size);

        console.log(`✅ Transcribed in ${processingTime}ms`);
        console.log(`📝 Text: ${transcription.text.substring(0, 100)}...`);
        console.log(`📊 Word count: ${wordCount}`);

        // Save to MongoDB
        const savedDoc = await Transcription.create({
            text: transcription.text,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            duration: duration,
            language: req.body.language || 'en',
            category: req.body.category || 'other',
            tags: req.body.tags ? req.body.tags.split(',') : [],
            isFavorite: req.body.isFavorite === 'true',
            wordCount: wordCount,
            notes: req.body.notes || ''
        });

        console.log(`💾 Saved to MongoDB: ${savedDoc._id}`);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            transcription: transcription.text,
            message: 'Audio transcribed successfully',
            metadata: {
                id: savedDoc._id,
                fileName: req.file.originalname,
                fileSize: (req.file.size / 1024 / 1024).toFixed(2) + ' MB',
                duration: duration + ' seconds',
                wordCount: wordCount,
                processingTime: processingTime + 'ms',
                language: req.body.language || 'en',
                category: req.body.category || 'other'
            }
        });

    } catch (error) {
        console.error('❌ Transcription error:', error.message);
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        if (error.status === 429) {
            res.status(429).json({
                success: false,
                error: 'Rate limit exceeded. Free tier allows 30 requests per minute. Please wait.'
            });
        } else if (error.status === 401) {
            res.status(401).json({
                success: false,
                error: 'Invalid API key. Please check your Groq API configuration.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
});

// Get all transcriptions with pagination and filters
app.get('/api/transcriptions', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const category = req.query.category;
        const isFavorite = req.query.favorite === 'true';
        const search = req.query.search;
        
        // Build query
        let query = {};
        
        if (category && category !== 'all') {
            query.category = category;
        }
        
        if (isFavorite) {
            query.isFavorite = true;
        }
        
        if (search) {
            query.text = { $regex: search, $options: 'i' };
        }
        
        // Get total count
        const total = await Transcription.countDocuments(query);
        
        // Get paginated results
        const transcriptions = await Transcription.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        res.json({
            success: true,
            data: transcriptions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching transcriptions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single transcription by ID
app.get('/api/transcriptions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid transcription ID' });
        }
        
        const transcription = await Transcription.findById(id);
        
        if (!transcription) {
            return res.status(404).json({ success: false, error: 'Transcription not found' });
        }
        
        res.json({
            success: true,
            data: transcription
        });
    } catch (error) {
        console.error('Error fetching transcription:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update transcription
app.put('/api/transcriptions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text, category, tags, isFavorite, notes } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid transcription ID' });
        }
        
        const updateData = {};
        if (text !== undefined) updateData.text = text;
        if (category !== undefined) updateData.category = category;
        if (tags !== undefined) updateData.tags = tags;
        if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
        if (notes !== undefined) updateData.notes = notes;
        updateData.updatedAt = Date.now();
        
        const transcription = await Transcription.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!transcription) {
            return res.status(404).json({ success: false, error: 'Transcription not found' });
        }
        
        res.json({
            success: true,
            message: 'Transcription updated successfully',
            data: transcription
        });
    } catch (error) {
        console.error('Error updating transcription:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete transcription
app.delete('/api/transcriptions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid transcription ID' });
        }
        
        const transcription = await Transcription.findByIdAndDelete(id);
        
        if (!transcription) {
            return res.status(404).json({ success: false, error: 'Transcription not found' });
        }
        
        res.json({
            success: true,
            message: 'Transcription deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting transcription:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get statistics
app.get('/api/statistics', async (req, res) => {
    try {
        const totalTranscriptions = await Transcription.countDocuments();
        const totalWords = await Transcription.aggregate([
            { $group: { _id: null, total: { $sum: '$wordCount' } } }
        ]);
        const favorites = await Transcription.countDocuments({ isFavorite: true });
        const categories = await Transcription.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        const recentActivity = await Transcription.find()
            .sort({ createdAt: -1 })
            .limit(5);
        
        res.json({
            success: true,
            data: {
                totalTranscriptions,
                totalWords: totalWords[0]?.total || 0,
                favorites,
                categories: categories.map(c => ({ name: c._id, count: c.count })),
                recentActivity
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk delete
app.post('/api/transcriptions/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid ids array' });
        }
        
        const result = await Transcription.deleteMany({ _id: { $in: ids } });
        
        res.json({
            success: true,
            message: `${result.deletedCount} transcriptions deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error in bulk delete:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Cannot ${req.method} ${req.url}`,
        message: 'Endpoint not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 25MB.'
        });
    }
    
    if (err.message === 'Invalid file type. Only audio files are allowed.') {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
    
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// ============ START SERVER ============

const PORT = process.env.PORT || 5003;

// Connect to MongoDB and start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log('\n' + '='.repeat(60));
        console.log('🎙️ SPEECH-TO-TEXT API SERVER (MongoDB)');
        console.log('='.repeat(60));
        console.log(`📍 Server: http://localhost:${PORT}`);
        console.log(`✅ Groq Whisper API: Ready`);
        console.log(`💾 Database: MongoDB (${mongoose.connection.name})`);
        console.log('='.repeat(60));
    });
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});