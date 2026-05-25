const mongoose = require('mongoose');

const transcriptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    default: null
  },
  language: {
    type: String,
    default: 'en'
  },
  confidence: {
    type: Number,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true // This automatically adds createdAt and updatedAt
});

// Index for faster queries
transcriptionSchema.index({ createdAt: -1 });
transcriptionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transcription', transcriptionSchema);