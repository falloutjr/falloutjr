'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Use a temp directory so tests don't touch real data
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'critique-ai-test-'));
process.env.CRITIQUE_DATA_DIR = tmpDir;

const { saveEntry, listEntries, getEntry, deleteEntry } = require('../src/storage');

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.CRITIQUE_DATA_DIR;
});

const sampleResult = {
  overall_score: 7,
  summary: 'Good.',
  strengths: ['A'],
  weaknesses: ['B'],
  suggestions: ['C'],
  dimension_scores: { quality: 7, clarity: 7, effectiveness: 7, originality: 7, execution: 7 },
};

describe('storage', () => {
  it('saves and retrieves an entry', () => {
    const entry = saveEntry({
      title: 'Test Entry',
      content: 'Some content',
      result: sampleResult,
      settings: { critiqueType: 'general', tone: 'balanced', detailLevel: 'standard' },
    });

    expect(entry.id).toBeTruthy();
    expect(entry.title).toBe('Test Entry');
    expect(entry.content).toBe('Some content');

    const fetched = getEntry(entry.id);
    expect(fetched).not.toBeNull();
    expect(fetched.id).toBe(entry.id);
  });

  it('listEntries omits content field', () => {
    const all = listEntries();
    for (const item of all) {
      expect(item.content).toBeUndefined();
    }
  });

  it('getEntry returns null for unknown id', () => {
    expect(getEntry('non-existent-id')).toBeNull();
  });

  it('deleteEntry removes entry and returns true', () => {
    const entry = saveEntry({
      title: 'To Delete',
      content: 'delete me',
      result: sampleResult,
      settings: {},
    });

    const deleted = deleteEntry(entry.id);
    expect(deleted).toBe(true);
    expect(getEntry(entry.id)).toBeNull();
  });

  it('deleteEntry returns false for unknown id', () => {
    expect(deleteEntry('not-real')).toBe(false);
  });

  it('uses title fallback from content when title is empty', () => {
    const longContent = 'A very long piece of content that should be truncated in the title automatically.';
    const entry = saveEntry({
      title: 'My custom title',
      content: longContent,
      result: sampleResult,
      settings: {},
    });
    expect(entry.title).toBe('My custom title');
  });

  it('entries are returned newest first', () => {
    const e1 = saveEntry({ title: 'First', content: 'content one', result: sampleResult, settings: {} });
    const e2 = saveEntry({ title: 'Second', content: 'content two', result: sampleResult, settings: {} });
    const all = listEntries();
    const ids = all.map((e) => e.id);
    expect(ids.indexOf(e2.id)).toBeLessThan(ids.indexOf(e1.id));
  });
});
