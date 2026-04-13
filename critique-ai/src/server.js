'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { AIService, CRITIQUE_TYPES, TONES, DETAIL_LEVELS } = require('./aiService');
const { saveEntry, listEntries, getEntry, deleteEntry } = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Global rate limiter – 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait before trying again.' },
});
app.use('/api', globalLimiter);

// Strict limiter for AI endpoint – 20 critiques per 15 minutes
const critiqueLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many critique requests. Please slow down.' },
});

// ─── Validation helpers ───────────────────────────────────────────────────────

const validCritiqueTypes = Object.keys(CRITIQUE_TYPES);
const validTones = Object.keys(TONES);
const validDetailLevels = Object.keys(DETAIL_LEVELS);

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return true;
  }
  return false;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/config
 * Returns available critique types, tones, and detail levels for the UI.
 */
app.get('/api/config', (_req, res) => {
  res.json({
    critiqueTypes: Object.entries(CRITIQUE_TYPES).map(([key, val]) => ({
      key,
      label: val.label,
      dimensions: val.dimensions,
    })),
    tones: Object.entries(TONES).map(([key, desc]) => ({ key, description: desc })),
    detailLevels: Object.entries(DETAIL_LEVELS).map(([key, desc]) => ({ key, description: desc })),
  });
});

/**
 * POST /api/critique
 * Run an AI critique on submitted content.
 *
 * Body:
 *   content       {string}  Required. Text to critique (10–10000 chars).
 *   title         {string}  Optional. Short title saved with history entry.
 *   critiqueType  {string}  Optional. Defaults to 'general'.
 *   tone          {string}  Optional. Defaults to 'balanced'.
 *   detailLevel   {string}  Optional. Defaults to 'standard'.
 *   extraContext  {string}  Optional. Extra context for the AI (max 500 chars).
 *   save          {boolean} Optional. Whether to save to history. Defaults true.
 */
app.post(
  '/api/critique',
  critiqueLimiter,
  [
    body('content')
      .isString()
      .trim()
      .isLength({ min: 10, max: 10000 })
      .withMessage('Content must be between 10 and 10,000 characters.'),
    body('title')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 120 })
      .withMessage('Title must be 120 characters or fewer.'),
    body('critiqueType')
      .optional()
      .isIn(validCritiqueTypes)
      .withMessage(`critiqueType must be one of: ${validCritiqueTypes.join(', ')}`),
    body('tone')
      .optional()
      .isIn(validTones)
      .withMessage(`tone must be one of: ${validTones.join(', ')}`),
    body('detailLevel')
      .optional()
      .isIn(validDetailLevels)
      .withMessage(`detailLevel must be one of: ${validDetailLevels.join(', ')}`),
    body('extraContext')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('extraContext must be 500 characters or fewer.'),
    body('save').optional().isBoolean().withMessage('save must be a boolean.'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;

    let aiService;
    try {
      aiService = new AIService();
    } catch (err) {
      return res.status(503).json({ error: err.message });
    }

    const {
      content,
      title = '',
      critiqueType = 'general',
      tone = 'balanced',
      detailLevel = 'standard',
      extraContext = '',
      save = true,
    } = req.body;

    let result;
    try {
      result = await aiService.critique({ content, critiqueType, tone, detailLevel, extraContext });
    } catch (err) {
      console.error('[critique] AI error:', err.message);
      return res.status(502).json({ error: 'AI service error. Please try again.', detail: err.message });
    }

    let entry = null;
    if (save !== false) {
      try {
        entry = saveEntry({
          title: title || content.slice(0, 60).trim() + (content.length > 60 ? '…' : ''),
          content,
          result,
          settings: { critiqueType, tone, detailLevel },
        });
      } catch (err) {
        console.error('[critique] Storage error:', err.message);
      }
    }

    res.json({ result, entryId: entry?.id ?? null });
  }
);

/**
 * GET /api/history
 * Return all critique history entries (content field omitted for brevity).
 */
app.get('/api/history', (_req, res) => {
  try {
    res.json(listEntries());
  } catch (err) {
    console.error('[history] Read error:', err.message);
    res.status(500).json({ error: 'Could not load history.' });
  }
});

/**
 * GET /api/history/:id
 * Return a single history entry (includes full content).
 */
app.get(
  '/api/history/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID.')],
  (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const entry = getEntry(req.params.id);
      if (!entry) return res.status(404).json({ error: 'Entry not found.' });
      res.json(entry);
    } catch (err) {
      console.error('[history] Read error:', err.message);
      res.status(500).json({ error: 'Could not load entry.' });
    }
  }
);

/**
 * DELETE /api/history/:id
 * Delete a history entry by id.
 */
app.delete(
  '/api/history/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID.')],
  (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const deleted = deleteEntry(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Entry not found.' });
      res.json({ success: true });
    } catch (err) {
      console.error('[history] Delete error:', err.message);
      res.status(500).json({ error: 'Could not delete entry.' });
    }
  }
);

// ─── 404 fallback ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ─── Error handler ────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Critique AI server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
