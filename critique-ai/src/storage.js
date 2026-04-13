'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.CRITIQUE_DATA_DIR || path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

/**
 * Ensure the data directory and history file exist.
 */
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

/**
 * Read all history entries from disk.
 * @returns {Array}
 */
function readHistory() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Write the history array to disk atomically via a temp file.
 * @param {Array} entries
 */
function writeHistory(entries) {
  ensureStorage();
  const tmp = HISTORY_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2), 'utf8');
  fs.renameSync(tmp, HISTORY_FILE);
}

/**
 * Save a new critique entry.
 * @param {object} params
 * @param {string} params.title - Short title for the entry.
 * @param {string} params.content - Original content that was critiqued.
 * @param {object} params.result - Structured AI result.
 * @param {object} params.settings - Critique settings used.
 * @returns {object} The saved entry with id and timestamps.
 */
function saveEntry({ title, content, result, settings }) {
  const entries = readHistory();
  const entry = {
    id: uuidv4(),
    title: title || 'Untitled',
    content,
    result,
    settings,
    createdAt: new Date().toISOString(),
  };
  entries.unshift(entry);
  writeHistory(entries);
  return entry;
}

/**
 * Return all history entries (newest first), with content omitted for list view.
 * @returns {Array}
 */
function listEntries() {
  return readHistory().map(({ content: _content, ...rest }) => rest);
}

/**
 * Return a single history entry by id.
 * @param {string} id
 * @returns {object|null}
 */
function getEntry(id) {
  return readHistory().find((e) => e.id === id) ?? null;
}

/**
 * Delete a history entry by id.
 * @param {string} id
 * @returns {boolean} True if deleted, false if not found.
 */
function deleteEntry(id) {
  const entries = readHistory();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) return false;
  writeHistory(filtered);
  return true;
}

module.exports = { saveEntry, listEntries, getEntry, deleteEntry };
