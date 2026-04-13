# 🔍 Critique AI

A personal AI-powered critique tool built with Node.js, Express, and OpenAI. Paste or type any content — writing, code, essays, designs, or creative work — and get structured, actionable feedback in seconds.

---

## Features

- **Multiple critique types** — writing, code, essay/academic, design, creative, general
- **Configurable tone** — constructive, balanced, or strict
- **Configurable detail level** — brief, standard, or detailed
- **Structured output** — overall score (1–10), dimension scores, strengths, weaknesses, and suggestions
- **History** — all critiques are saved locally; browse, reload, or delete past entries
- **Export** — download any critique as JSON
- **Rate limiting** — built-in protection against runaway API usage
- **Input validation** — all inputs are sanitised before hitting the AI

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- An [OpenAI API key](https://platform.openai.com/api-keys)

---

## Setup

### 1. Clone or download this directory

```bash
git clone https://github.com/falloutjr/falloutjr.git
cd falloutjr/critique-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your API key

Copy the example environment file and fill in your key:

```bash
cp .env.example .env
```

Edit `.env`:

```
OPENAI_API_KEY=sk-...your-key-here...
PORT=3000
```

> **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## Running the app

### Development (auto-restart on file changes)

```bash
npm run dev
```

### Production

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

---

## Usage

1. **Paste your content** into the text area (10 – 10,000 characters).
2. Optionally add a **title** and any **extra context** (e.g. "target audience: beginners").
3. Choose a **Critique Type**, **Tone**, and **Detail Level**.
4. Click **✦ Run Critique**.
5. View your **score**, **dimension scores**, **strengths**, **weaknesses**, and **suggestions**.
6. All critiques are saved to **History** (sidebar). Click any entry to reload it, or ✕ to delete it.
7. Click **⬇ Export** to download the current critique as JSON.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Available critique types, tones, and detail levels |
| `POST` | `/api/critique` | Run a critique (see body schema below) |
| `GET` | `/api/history` | List all saved critiques (content omitted) |
| `GET` | `/api/history/:id` | Get full detail for one critique |
| `DELETE` | `/api/history/:id` | Delete a critique from history |

### POST `/api/critique` body

```json
{
  "content":      "string (required, 10–10,000 chars)",
  "title":        "string (optional, max 120 chars)",
  "critiqueType": "general | writing | code | essay | design | creative",
  "tone":         "balanced | constructive | strict",
  "detailLevel":  "standard | brief | detailed",
  "extraContext": "string (optional, max 500 chars)",
  "save":         true
}
```

### Response

```json
{
  "result": {
    "overall_score": 8,
    "summary": "...",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "suggestions": ["..."],
    "dimension_scores": { "clarity": 8, "...": 7 },
    "critiqueType": "writing",
    "tone": "balanced",
    "detailLevel": "standard",
    "model": "gpt-4o",
    "promptTokens": 420,
    "completionTokens": 210
  },
  "entryId": "uuid | null"
}
```

---

## Data storage

Critiques are saved as JSON in `data/history.json`. This file is created automatically on first use and is excluded from git. To reset your history, delete the file.

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *(required)* | Your OpenAI API key |
| `PORT` | `3000` | HTTP port to listen on |
| `NODE_ENV` | `development` | `production` disables verbose logging |

---

## Rate limits

| Endpoint | Limit |
|----------|-------|
| All `/api/*` routes | 100 requests / 15 min |
| `POST /api/critique` | 20 requests / 15 min |

Adjust these in `src/server.js` if needed.

---

## Running tests

```bash
npm test
```

Tests cover:

- **aiService** — prompt building and AI response parsing
- **storage** — save, list, get, and delete history entries
- **server** — all API endpoints with a mocked AI and in-memory storage

---

## Project structure

```
critique-ai/
├── src/
│   ├── server.js      # Express app and API routes
│   ├── aiService.js   # OpenAI wrapper, prompts, response parsing
│   └── storage.js     # Local JSON history storage
├── public/
│   ├── index.html     # Frontend UI
│   ├── style.css      # Dark-theme styles
│   └── app.js         # Frontend logic
├── tests/
│   ├── aiService.test.js
│   ├── server.test.js
│   └── storage.test.js
├── data/              # Auto-created; stores history.json (gitignored)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Security notes

- API key is read from `.env` — never hardcoded or logged.
- All user inputs are validated and length-limited before reaching the AI.
- Rate limiting prevents runaway OpenAI costs.
- History file contains only your own data and stays local.
