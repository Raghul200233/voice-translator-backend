const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  
  // User Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    defaultLanguage: {
      type: String,
      default: 'en'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    emailSummaries: {
      type: Boolean,
      default: false
    },
    itemsPerPage: {
      type: Number,
      default: 10,
      min: 5,
      max: 100
    }
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['user', 'premium', 'admin'],
    default: 'user'
  },
  
  // Usage Statistics
  usageStats: {
    totalTranscriptions: {
      type: Number,
      default: 0
    },
    totalAudioMinutes: {
      type: Number,
      default: 0
    },
    totalStorageUsed: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    apiCalls: {
      type: Number,
      default: 0
    }
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Subscription (for premium features)
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free'
    },
    expiresAt: Date,
    features: {
      maxTranscriptionsPerMonth: {
        type: Number,
        default: 10
      },
      maxFileSize: {
        type: Number,
        default: 10 * 1024 * 1024 // 10MB
      },
      allowedLanguages: [String],
      apiAccess: {
        type: Boolean,
        default: false
      }
    }
  }
  
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ 'usageStats.lastActive': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last active timestamp
userSchema.methods.updateLastActive = async function() {
  this.usageStats.lastActive = new Date();
  await this.save();
};

// Increment API calls
userSchema.methods.incrementApiCalls = async function() {
  this.usageStats.apiCalls += 1;
  await this.save();
};

// Check if user has premium feature
userSchema.methods.hasFeature = function(feature) {
  const features = {
    apiAccess: this.subscription.plan !== 'free',
    bulkExport: ['pro', 'enterprise'].includes(this.subscription.plan),
    advancedAnalytics: ['pro', 'enterprise'].includes(this.subscription.plan),
    teamSharing: this.subscription.plan === 'enterprise'
  };
  return features[feature] || false;
};

// Virtual for subscription status
userSchema.virtual('subscriptionStatus').get(function() {
  if (!this.subscription.expiresAt) return 'active';
  return this.subscription.expiresAt > new Date() ? 'active' : 'expired';
});

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [
              { $gte: ['$usageStats.lastActive', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
              1, 0
            ]
          }
        },
        premiumUsers: {
          $sum: {
            $cond: [{ $ne: ['$subscription.plan', 'free'] }, 1, 0]
          }
        },
        totalTranscriptions: { $sum: '$usageStats.totalTranscriptions' }
      }
    }
  ]);
  return stats[0] || {};
};

const EnhancedUser = mongoose.model('EnhancedUser', userSchema);

module.exports = EnhancedUser;