const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 25MB.'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected field. Please upload a file with field name "audio".'
    });
  }
  
  // File type validation
  if (err.message === 'Invalid file type. Only audio files are allowed.') {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  // Groq API errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Free tier allows 30 requests per minute. Please wait.'
    });
  }
  
  if (err.status === 401) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key. Please check your Groq API configuration.'
    });
  }
  
  // Database errors
  if (err.code === 'SQLITE_CORRUPT') {
    return res.status(500).json({
      success: false,
      error: 'Database is corrupted. Please contact support.'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.url}`,
    message: 'Endpoint not found'
  });
};

module.exports = { errorHandler, notFound };