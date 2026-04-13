'use strict';

const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Stub OpenAI and storage before loading the app
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overall_score: 8,
                  summary: 'Solid work overall.',
                  strengths: ['Clear prose'],
                  weaknesses: ['Repetition'],
                  suggestions: ['Vary sentence length'],
                  dimension_scores: {
                    quality: 8,
                    clarity: 8,
                    effectiveness: 7,
                    originality: 8,
                    execution: 8,
                  },
                }),
              },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      },
    },
  }));
});

// Use a temporary history file for tests
const TMP_HISTORY = path.join(__dirname, '..', 'data', 'test-history.json');
jest.mock('../src/storage', () => {
  const { v4: uuidv4 } = require('uuid');
  let store = [];
  return {
    saveEntry: ({ title, content, result, settings }) => {
      const entry = {
        id: uuidv4(),
        title,
        content,
        result,
        settings,
        createdAt: new Date().toISOString(),
      };
      store.unshift(entry);
      return entry;
    },
    listEntries: () => store.map(({ content: _c, ...rest }) => rest),
    getEntry: (id) => store.find((e) => e.id === id) ?? null,
    deleteEntry: (id) => {
      const before = store.length;
      store = store.filter((e) => e.id !== id);
      return store.length < before;
    },
    __resetStore: () => { store = []; },
  };
});

process.env.OPENAI_API_KEY = 'test-key';

const app = require('../src/server');
const storage = require('../src/storage');

beforeEach(() => {
  storage.__resetStore();
});

describe('GET /api/config', () => {
  it('returns critique types, tones, detail levels', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.critiqueTypes)).toBe(true);
    expect(Array.isArray(res.body.tones)).toBe(true);
    expect(Array.isArray(res.body.detailLevels)).toBe(true);
    expect(res.body.critiqueTypes.length).toBeGreaterThan(0);
  });
});

describe('POST /api/critique', () => {
  it('returns critique result for valid input', async () => {
    const res = await request(app)
      .post('/api/critique')
      .send({ content: 'This is a test content that is long enough for critique.' });

    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
    expect(typeof res.body.result.overall_score).toBe('number');
    expect(typeof res.body.result.summary).toBe('string');
    expect(Array.isArray(res.body.result.strengths)).toBe(true);
    expect(Array.isArray(res.body.result.suggestions)).toBe(true);
    expect(res.body.entryId).toBeTruthy();
  });

  it('returns 400 for content that is too short', async () => {
    const res = await request(app)
      .post('/api/critique')
      .send({ content: 'Short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 for content that is too long', async () => {
    const res = await request(app)
      .post('/api/critique')
      .send({ content: 'a'.repeat(10001) });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid critiqueType', async () => {
    const res = await request(app)
      .post('/api/critique')
      .send({ content: 'Valid content for testing purposes.', critiqueType: 'invalid_type' });
    expect(res.status).toBe(400);
  });

  it('accepts all valid critique types', async () => {
    const { CRITIQUE_TYPES } = require('../src/aiService');
    for (const type of Object.keys(CRITIQUE_TYPES)) {
      const res = await request(app)
        .post('/api/critique')
        .send({ content: 'Valid content for testing purposes here.', critiqueType: type });
      expect(res.status).toBe(200);
    }
  });

  it('does not save when save=false', async () => {
    const res = await request(app)
      .post('/api/critique')
      .send({ content: 'Valid content that should not be saved at all.', save: false });
    expect(res.status).toBe(200);
    expect(res.body.entryId).toBeNull();
    const histRes = await request(app).get('/api/history');
    expect(histRes.body).toHaveLength(0);
  });
});

describe('GET /api/history', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('lists entries after running a critique', async () => {
    await request(app)
      .post('/api/critique')
      .send({ content: 'Some content to critique and save in history.' });

    const res = await request(app).get('/api/history');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].content).toBeUndefined(); // content stripped from list
  });
});

describe('GET /api/history/:id', () => {
  it('returns full entry by id', async () => {
    const critiqueRes = await request(app)
      .post('/api/critique')
      .send({ content: 'Full content should appear in single entry fetch.' });
    const id = critiqueRes.body.entryId;

    const res = await request(app).get(`/api/history/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(typeof res.body.content).toBe('string');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/history/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await request(app).get('/api/history/not-a-uuid');
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/history/:id', () => {
  it('deletes an entry by id', async () => {
    const critiqueRes = await request(app)
      .post('/api/critique')
      .send({ content: 'Entry to be deleted from history soon.' });
    const id = critiqueRes.body.entryId;

    const delRes = await request(app).delete(`/api/history/${id}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const getRes = await request(app).get(`/api/history/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting non-existent entry', async () => {
    const res = await request(app).delete('/api/history/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
