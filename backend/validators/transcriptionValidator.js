const Joi = require('joi');

const transcriptionValidationSchema = Joi.object({
  text: Joi.string().required().min(1).max(10000),
  fileName: Joi.string().required().max(255),
  fileType: Joi.string().valid(
    'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/m4a', 'audio/mp4'
  ).required(),
  fileSize: Joi.number().required().max(10 * 1024 * 1024),
  duration: Joi.number().optional().min(0).max(3600),
  language: Joi.string().default('en'),
  confidence: Joi.number().optional().min(0).max(1),
  category: Joi.string().valid(
    'meeting', 'lecture', 'interview', 'note', 'research', 'personal', 'work', 'other'
  ).default('other'),
  tags: Joi.array().items(Joi.string().max(30)).default([]),
  isFavorite: Joi.boolean().default(false),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
  notes: Joi.string().max(500).default(''),
  isPublic: Joi.boolean().default(false)
});

const updateTranscriptionSchema = Joi.object({
  text: Joi.string().min(1).max(10000),
  category: Joi.string().valid('meeting', 'lecture', 'interview', 'note', 'research', 'personal', 'work', 'other'),
  tags: Joi.array().items(Joi.string().max(30)),
  isFavorite: Joi.boolean(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
  notes: Joi.string().max(500),
  isPublic: Joi.boolean()
}).min(1);

module.exports = {
  transcriptionValidationSchema,
  updateTranscriptionSchema
};