const validateFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
      message: 'Please select an audio file to transcribe'
    });
  }
  
  // Check file extension
  const allowedExtensions = ['.mp3', '.wav', '.webm', '.m4a', '.mp4'];
  const ext = require('path').extname(req.file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: `Supported formats: ${allowedExtensions.join(', ')}`
    });
  }
  
  next();
};

const validateTranscriptionId = (req, res, next) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
      message: 'Transcription ID must be a positive number'
    });
  }
  
  req.transcriptionId = id;
  next();
};

module.exports = { validateFile, validateTranscriptionId };