const Transcription = require('../models/Transcription');
const fs = require('fs');
const path = require('path');

// Create new transcription
const createTranscription = async (req, res) => {
  try {
    const { text, fileName, fileType, fileSize, duration, language, confidence } = req.body;
    
    const transcription = new Transcription({
      text,
      fileName,
      fileType,
      fileSize,
      duration,
      language,
      confidence,
      userId: req.userId || null // Will be set when authentication is implemented
    });
    
    await transcription.save();
    
    res.status(201).json({
      success: true,
      message: 'Transcription saved successfully',
      data: transcription
    });
  } catch (error) {
    console.error('Error saving transcription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all transcriptions
const getAllTranscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const query = req.userId ? { userId: req.userId } : {};
    
    const transcriptions = await Transcription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Transcription.countDocuments(query);
    
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single transcription by ID
const getTranscriptionById = async (req, res) => {
  try {
    const transcription = await Transcription.findById(req.params.id);
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }
    
    // Check if user owns this transcription (if authentication is enabled)
    if (req.userId && transcription.userId && transcription.userId.toString() !== req.userId) {
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
    const { text } = req.body;
    
    const transcription = await Transcription.findById(req.params.id);
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }
    
    transcription.text = text || transcription.text;
    transcription.updatedAt = Date.now();
    
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
    const transcription = await Transcription.findById(req.params.id);
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
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

// Get transcription statistics
const getStatistics = async (req, res) => {
  try {
    const query = req.userId ? { userId: req.userId } : {};
    
    const totalTranscriptions = await Transcription.countDocuments(query);
    const recentTranscriptions = await Transcription.find(query)
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get last 7 days data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyData = await Transcription.aggregate([
      { $match: { ...query, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalTranscriptions,
        recentTranscriptions,
        weeklyData
      }
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
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
  getStatistics
};