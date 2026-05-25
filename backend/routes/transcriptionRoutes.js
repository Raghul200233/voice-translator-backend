const express = require('express');
const router = express.Router();
const {
  createTranscription,
  getAllTranscriptions,
  getTranscriptionById,
  updateTranscription,
  deleteTranscription,
  getStatistics
} = require('../controllers/transcriptionController');

// Middleware for authentication (will be implemented on Day 10)
const authMiddleware = (req, res, next) => {
  req.userId = null;
  next();
};

// Routes
router.post('/', authMiddleware, createTranscription);
router.get('/', authMiddleware, getAllTranscriptions);
router.get('/statistics', authMiddleware, getStatistics);
router.get('/:id', authMiddleware, getTranscriptionById);
router.put('/:id', authMiddleware, updateTranscription);
router.delete('/:id', authMiddleware, deleteTranscription);

module.exports = router;