const EnhancedTranscription = require('../models/EnhancedTranscription');
const { transcriptionValidationSchema, updateTranscriptionSchema } = require('../validators/transcriptionValidator');
const mongoose = require('mongoose');

// Create new transcription
const createTranscription = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = transcriptionValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    // Add user ID if authenticated
    const transcriptionData = {
      ...value,
      userId: req.userId || null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      processingTime: Date.now() - (req.startTime || Date.now())
    };
    
    const transcription = new EnhancedTranscription(transcriptionData);
    await transcription.save();
    
    res.status(201).json({
      success: true,
      message: 'Transcription saved successfully',
      data: transcription
    });
  } catch (error) {
    console.error('Error creating transcription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all transcriptions with advanced filtering
const getAllTranscriptions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      language,
      isFavorite,
      search,
      tag,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = {};
    
    if (req.userId) query.userId = req.userId;
    if (category) query.category = category;
    if (language) query.language = language;
    if (isFavorite === 'true') query.isFavorite = true;
    if (tag) query.tags = tag;
    
    // Text search
    if (search) {
      query.$text = { $search: search };
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const [transcriptions, total] = await Promise.all([
      EnhancedTranscription.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name email'),
      EnhancedTranscription.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: transcriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: { category, language, isFavorite, search, tag }
    });
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single transcription
const getTranscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transcription ID'
      });
    }
    
    const transcription = await EnhancedTranscription.findById(id)
      .populate('userId', 'name email');
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }
    
    // Check authorization
    if (transcription.userId && req.userId && transcription.userId._id.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: transcription
    });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update transcription
const updateTranscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateTranscriptionSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const transcription = await EnhancedTranscription.findById(id);
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }
    
    // Check authorization
    if (transcription.userId && req.userId && transcription.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Save old text for history if updating text
    if (value.text && value.text !== transcription.text) {
      await transcription.addToHistory(transcription.text);
    }
    
    // Update fields
    Object.assign(transcription, value);
    await transcription.save();
    
    res.json({
      success: true,
      message: 'Transcription updated successfully',
      data: transcription
    });
  } catch (error) {
    console.error('Error updating transcription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete transcription
const deleteTranscription = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transcription = await EnhancedTranscription.findById(id);
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }
    
    // Check authorization
    if (transcription.userId && req.userId && transcription.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    await transcription.deleteOne();
    
    res.json({
      success: true,
      message: 'Transcription deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transcription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get statistics
const getStatistics = async (req, res) => {
  try {
    const stats = await EnhancedTranscription.getStatistics(req.userId || null);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Bulk operations
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: ids array required'
      });
    }
    
    const query = {
      _id: { $in: ids }
    };
    
    if (req.userId) query.userId = req.userId;
    
    const result = await EnhancedTranscription.deleteMany(query);
    
    res.json({
      success: true,
      message: `${result.deletedCount} transcriptions deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Share transcription
const shareTranscription = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transcription = await EnhancedTranscription.findById(id);
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }
    
    const shareToken = transcription.generateShareToken();
    await transcription.save();
    
    const shareUrl = `${req.protocol}://${req.get('host')}/api/shared/${shareToken}`;
    
    res.json({
      success: true,
      shareUrl,
      shareToken
    });
  } catch (error) {
    console.error('Error sharing transcription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createTranscription,
  getAllTranscriptions,
  getTranscriptionById,
  updateTranscription,
  deleteTranscription,
  getStatistics,
  bulkDelete,
  shareTranscription
};