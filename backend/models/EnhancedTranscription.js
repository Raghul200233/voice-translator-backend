const mongoose = require('mongoose');

const transcriptionSchema = new mongoose.Schema({
  // Basic Information
  text: {
    type: String,
    required: [true, 'Transcription text is required'],
    trim: true,
    maxlength: [10000, 'Text cannot exceed 10000 characters']
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
    maxlength: [255, 'File name too long']
  },
  fileType: {
    type: String,
    required: true,
    enum: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/m4a', 'audio/mp4']
  },
  fileSize: {
    type: Number,
    required: true,
    max: [10 * 1024 * 1024, 'File size cannot exceed 10MB'] // 10MB limit
  },
  
  // Audio Metadata
  duration: {
    type: Number,
    min: 0,
    max: 3600, // Max 1 hour
    default: null
  },
  sampleRate: {
    type: Number,
    default: null
  },
  
  // Transcription Metadata
  language: {
    type: String,
    default: 'en',
    lowercase: true,
    trim: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  wordCount: {
    type: Number,
    default: 0
  },
  uniqueWords: {
    type: Number,
    default: 0
  },
  
  // Organization Features
  category: {
    type: String,
    enum: ['meeting', 'lecture', 'interview', 'note', 'research', 'personal', 'work', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isFavorite: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#6366f1', // Default indigo color
    match: /^#[0-9A-Fa-f]{6}$/ // Hex color validation
  },
  
  // Relationships
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  
  // System Fields
  processingTime: {
    type: Number, // milliseconds
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  
  // Notes and Comments
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Sharing
  isPublic: {
    type: Boolean,
    default: false
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Versioning for future edits
  version: {
    type: Number,
    default: 1
  },
  editHistory: [{
    text: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }]

}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
transcriptionSchema.index({ createdAt: -1 });
transcriptionSchema.index({ userId: 1, createdAt: -1 });
transcriptionSchema.index({ category: 1, userId: 1 });
transcriptionSchema.index({ tags: 1 });
transcriptionSchema.index({ isFavorite: 1 });
transcriptionSchema.index({ isPublic: 1 });
transcriptionSchema.index({ language: 1 });

// Text search index
transcriptionSchema.index({ text: 'text', fileName: 'text', notes: 'text' });

// Virtual for formatted date
transcriptionSchema.virtual('formattedDate').get(function() {
  return this.createdAt ? this.createdAt.toLocaleDateString() : null;
});

// Virtual for file size in KB/MB
transcriptionSchema.virtual('formattedFileSize').get(function() {
  if (!this.fileSize) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return `${(this.fileSize / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
});

// Pre-save middleware to calculate word counts
transcriptionSchema.pre('save', function(next) {
  if (this.text) {
    // Calculate word count
    this.wordCount = this.text.trim().split(/\s+/).length;
    
    // Calculate unique words
    const words = this.text.toLowerCase().match(/\b\w+\b/g);
    this.uniqueWords = words ? new Set(words).size : 0;
  }
  next();
});

// Method to add to edit history
transcriptionSchema.methods.addToHistory = async function(oldText) {
  this.editHistory.push({
    text: oldText,
    editedAt: new Date()
  });
  this.version += 1;
  await this.save();
};

// Static method to get statistics
transcriptionSchema.statics.getStatistics = async function(userId = null) {
  const matchStage = userId ? { userId: mongoose.Types.ObjectId(userId) } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $facet: {
        totalStats: [
          {
            $group: {
              _id: null,
              totalTranscriptions: { $sum: 1 },
              totalWords: { $sum: '$wordCount' },
              totalAudioSize: { $sum: '$fileSize' },
              avgConfidence: { $avg: '$confidence' },
              avgProcessingTime: { $avg: '$processingTime' },
              uniqueLanguages: { $addToSet: '$language' }
            }
          }
        ],
        categoryStats: [
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              totalWords: { $sum: '$wordCount' }
            }
          },
          { $sort: { count: -1 } }
        ],
        monthlyStats: [
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 12 }
        ],
        favoriteCount: [
          { $match: { isFavorite: true } },
          { $count: 'count' }
        ],
        languageDistribution: [
          {
            $group: {
              _id: '$language',
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);
  
  return stats[0];
};

// Method to generate share token
transcriptionSchema.methods.generateShareToken = function() {
  this.shareToken = Math.random().toString(36).substring(2, 15);
  this.isPublic = true;
  return this.shareToken;
};

const EnhancedTranscription = mongoose.model('EnhancedTranscription', transcriptionSchema);

module.exports = EnhancedTranscription;