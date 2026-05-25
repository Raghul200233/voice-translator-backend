const express = require('express');
const router = express.Router();
const {
  createTranscription,
  getAllTranscriptions,
  getTranscriptionById,
  updateTranscription,
  deleteTranscription,
  getStatistics,
  bulkDelete,
  shareTranscription
} = require('../controllers/enhancedTranscriptionController');

// Timing middleware
const timingMiddleware = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

// Auth middleware (temporary - will be implemented properly on Day 10)
const authMiddleware = (req, res, next) => {
  // TODO: Implement JWT authentication
  // For now, allow all requests
  req.userId = null;
  next();
};

// Routes
router.post('/', timingMiddleware, authMiddleware, createTranscription);
router.get('/', authMiddleware, getAllTranscriptions);
router.get('/statistics', authMiddleware, getStatistics);
router.post('/bulk-delete', authMiddleware, bulkDelete);
router.get('/:id', authMiddleware, getTranscriptionById);
router.put('/:id', authMiddleware, updateTranscription);
router.delete('/:id', authMiddleware, deleteTranscription);
router.post('/:id/share', authMiddleware, shareTranscription);

module.exports = router;