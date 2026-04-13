'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  sidebarOpen: window.innerWidth > 768,
  currentEntryId: null,
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const mainEl = document.querySelector('.main');
const openSidebarBtn = document.getElementById('openSidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const historyList = document.getElementById('historyList');

const titleInput = document.getElementById('titleInput');
const contentInput = document.getElementById('contentInput');
const charCount = document.getElementById('charCount');
const critiqueTypeSelect = document.getElementById('critiqueType');
const toneSelect = document.getElementById('tone');
const detailLevelSelect = document.getElementById('detailLevel');
const extraContextInput = document.getElementById('extraContext');

const critiqueBtn = document.getElementById('critiqueBtn');
const critiqueBtnText = document.getElementById('critiqueBtnText');
const critiqueBtnSpinner = document.getElementById('critiqueBtnSpinner');
const newCritiqueBtn = document.getElementById('newCritiqueBtn');

const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');
const errorDismiss = document.getElementById('errorDismiss');

const inputSection = document.getElementById('inputSection');
const resultsSection = document.getElementById('resultsSection');

const resultsTitle = document.getElementById('resultsTitle');
const resultsMeta = document.getElementById('resultsMeta');
const exportBtn = document.getElementById('exportBtn');
const scoreValue = document.getElementById('scoreValue');
const scoreCircle = document.getElementById('scoreCircle');
const scoreSummary = document.getElementById('scoreSummary');
const dimensionBars = document.getElementById('dimensionBars');
const strengthsList = document.getElementById('strengthsList');
const weaknessesList = document.getElementById('weaknessesList');
const suggestionsList = document.getElementById('suggestionsList');

// ── Sidebar ────────────────────────────────────────────────────────────────

function openSidebar() {
  state.sidebarOpen = true;
  sidebar.classList.remove('closed');
  if (window.innerWidth > 768) {
    mainEl.classList.remove('sidebar-closed');
  }
}

function closeSidebar() {
  state.sidebarOpen = false;
  sidebar.classList.add('closed');
  mainEl.classList.add('sidebar-closed');
}

openSidebarBtn.addEventListener('click', openSidebar);
sidebarToggle.addEventListener('click', closeSidebar);

if (window.innerWidth <= 768) closeSidebar();

// ── Config from server ─────────────────────────────────────────────────────

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    // Populate critique type options
    critiqueTypeSelect.innerHTML = '';
    for (const t of data.critiqueTypes) {
      const opt = document.createElement('option');
      opt.value = t.key;
      opt.textContent = t.label;
      critiqueTypeSelect.appendChild(opt);
    }
  } catch (err) {
    console.warn('Could not load config:', err.message);
  }
}

// ── Character count ────────────────────────────────────────────────────────

contentInput.addEventListener('input', () => {
  const len = contentInput.value.length;
  charCount.textContent = `${len.toLocaleString()} / 10,000`;
  charCount.className = 'char-count';
  if (len >= 9500) charCount.classList.add('limit');
  else if (len >= 8000) charCount.classList.add('warn');
});

// ── Error display ──────────────────────────────────────────────────────────

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove('hidden');
  errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  errorBanner.classList.add('hidden');
  errorMessage.textContent = '';
}

errorDismiss.addEventListener('click', hideError);

// ── Run Critique ───────────────────────────────────────────────────────────

critiqueBtn.addEventListener('click', runCritique);

async function runCritique() {
  hideError();

  const content = contentInput.value.trim();
  if (content.length < 10) {
    showError('Please enter at least 10 characters of content to critique.');
    contentInput.focus();
    return;
  }

  setLoading(true);

  try {
    const res = await fetch('/api/critique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        title: titleInput.value.trim() || undefined,
        critiqueType: critiqueTypeSelect.value,
        tone: toneSelect.value,
        detailLevel: detailLevelSelect.value,
        extraContext: extraContextInput.value.trim() || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Something went wrong. Please try again.');
      return;
    }

    state.currentEntryId = data.entryId;
    renderResults(data.result, titleInput.value.trim());
    await loadHistory();
  } catch (err) {
    showError('Network error. Is the server running?');
    console.error(err);
  } finally {
    setLoading(false);
  }
}

function setLoading(loading) {
  critiqueBtn.disabled = loading;
  critiqueBtnText.classList.toggle('hidden', loading);
  critiqueBtnSpinner.classList.toggle('hidden', !loading);
}

// ── Render Results ─────────────────────────────────────────────────────────

function renderResults(result, title) {
  // Title & meta badges
  resultsTitle.textContent = title || 'Critique Results';
  resultsMeta.innerHTML = '';
  for (const key of ['critiqueType', 'tone', 'detailLevel']) {
    if (result[key]) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = result[key].replace(/_/g, ' ');
      resultsMeta.appendChild(badge);
    }
  }

  // Score
  const score = Math.round(result.overall_score ?? 0);
  scoreValue.textContent = score;
  scoreValue.className = 'score-value score-' + score;
  scoreSummary.textContent = result.summary ?? '';

  // Dimension bars
  dimensionBars.innerHTML = '';
  if (result.dimension_scores) {
    for (const [dim, val] of Object.entries(result.dimension_scores)) {
      const pct = val != null ? (val / 10) * 100 : 0;
      const barColor = scoreColor(val ?? 0);
      const row = document.createElement('div');
      row.className = 'dim-row';
      row.innerHTML = `
        <span class="dim-name">${escHtml(dim.replace(/_/g, ' '))}</span>
        <div class="dim-bar-track">
          <div class="dim-bar-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <span class="dim-score">${val ?? '–'}</span>
      `;
      dimensionBars.appendChild(row);
    }
  }

  // Strengths / weaknesses
  renderList(strengthsList, result.strengths ?? []);
  renderList(weaknessesList, result.weaknesses ?? []);

  // Suggestions
  suggestionsList.innerHTML = '';
  for (const s of result.suggestions ?? []) {
    const li = document.createElement('li');
    li.textContent = s;
    suggestionsList.appendChild(li);
  }

  // Show results, scroll into view
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderList(ul, items) {
  ul.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.textContent = 'None listed.';
    li.style.color = 'var(--text-muted)';
    ul.appendChild(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
}

function scoreColor(val) {
  if (val <= 3) return '#f85149';
  if (val <= 5) return '#d29922';
  if (val <= 7) return '#58a6ff';
  return '#3fb950';
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── New Critique ───────────────────────────────────────────────────────────

newCritiqueBtn.addEventListener('click', () => {
  resultsSection.classList.add('hidden');
  titleInput.value = '';
  contentInput.value = '';
  extraContextInput.value = '';
  charCount.textContent = '0 / 10,000';
  charCount.className = 'char-count';
  state.currentEntryId = null;
  hideError();
  inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── Export ─────────────────────────────────────────────────────────────────

exportBtn.addEventListener('click', async () => {
  if (!state.currentEntryId) return;
  try {
    const res = await fetch(`/api/history/${state.currentEntryId}`);
    if (!res.ok) return;
    const entry = await res.json();
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `critique-${entry.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export failed:', err);
  }
});

// ── History ────────────────────────────────────────────────────────────────

async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    const entries = await res.json();
    renderHistory(entries);
  } catch (err) {
    console.warn('Could not load history:', err.message);
  }
}

function renderHistory(entries) {
  historyList.innerHTML = '';
  if (!entries.length) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = 'No critiques yet.';
    historyList.appendChild(li);
    return;
  }

  for (const entry of entries) {
    const li = document.createElement('li');
    li.className = 'history-item';

    const date = new Date(entry.createdAt);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const score = entry.result?.overall_score ?? '–';
    const typeLabel = entry.settings?.critiqueType ?? 'general';

    li.innerHTML = `
      <div style="display:flex;align-items:center;">
        <button class="history-item-btn" data-id="${escHtml(entry.id)}">
          <span class="history-item-title">${escHtml(entry.title)}</span>
          <span class="history-item-meta">
            <span class="history-score">${score}/10</span>
            <span>${escHtml(typeLabel)}</span>
            <span>${escHtml(dateStr)}</span>
          </span>
        </button>
        <button class="history-item-delete" data-id="${escHtml(entry.id)}" aria-label="Delete">✕</button>
      </div>
    `;
    historyList.appendChild(li);
  }
}

historyList.addEventListener('click', async (e) => {
  // Load entry
  const loadBtn = e.target.closest('.history-item-btn');
  if (loadBtn) {
    const id = loadBtn.dataset.id;
    await loadHistoryEntry(id);
    if (window.innerWidth <= 768) closeSidebar();
    return;
  }

  // Delete entry
  const delBtn = e.target.closest('.history-item-delete');
  if (delBtn) {
    const id = delBtn.dataset.id;
    await deleteHistoryEntry(id);
  }
});

async function loadHistoryEntry(id) {
  try {
    const res = await fetch(`/api/history/${id}`);
    if (!res.ok) { showError('Could not load history entry.'); return; }
    const entry = await res.json();

    titleInput.value = entry.title ?? '';
    contentInput.value = entry.content ?? '';
    contentInput.dispatchEvent(new Event('input'));
    critiqueTypeSelect.value = entry.settings?.critiqueType ?? 'general';
    toneSelect.value = entry.settings?.tone ?? 'balanced';
    detailLevelSelect.value = entry.settings?.detailLevel ?? 'standard';

    state.currentEntryId = entry.id;
    renderResults(entry.result, entry.title);
    hideError();
  } catch (err) {
    showError('Network error loading entry.');
    console.error(err);
  }
}

async function deleteHistoryEntry(id) {
  try {
    const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
    if (!res.ok) { showError('Could not delete entry.'); return; }
    if (state.currentEntryId === id) {
      resultsSection.classList.add('hidden');
      state.currentEntryId = null;
    }
    await loadHistory();
  } catch (err) {
    showError('Network error deleting entry.');
    console.error(err);
  }
}

// ── Init ───────────────────────────────────────────────────────────────────

(async () => {
  await Promise.all([loadConfig(), loadHistory()]);
})();
