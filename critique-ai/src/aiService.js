'use strict';

const OpenAI = require('openai');

const CRITIQUE_TYPES = {
  writing: {
    label: 'Writing',
    dimensions: ['clarity', 'structure', 'grammar', 'style', 'engagement'],
    systemPrompt:
      'You are an expert writing coach and editor. Provide thorough, constructive critique of written content.',
  },
  code: {
    label: 'Code',
    dimensions: ['readability', 'correctness', 'efficiency', 'maintainability', 'documentation'],
    systemPrompt:
      'You are a senior software engineer conducting a code review. Provide detailed, actionable feedback.',
  },
  design: {
    label: 'Design',
    dimensions: ['usability', 'aesthetics', 'consistency', 'accessibility', 'innovation'],
    systemPrompt:
      'You are a UX/UI design expert. Critique the described design work with a focus on user experience.',
  },
  essay: {
    label: 'Essay / Academic',
    dimensions: ['argument', 'evidence', 'clarity', 'structure', 'originality'],
    systemPrompt:
      'You are an experienced academic tutor and writing instructor. Evaluate the essay critically and fairly.',
  },
  creative: {
    label: 'Creative Work',
    dimensions: ['originality', 'execution', 'emotional_impact', 'coherence', 'style'],
    systemPrompt:
      'You are a seasoned creative director and artistic critic. Give honest, constructive feedback.',
  },
  general: {
    label: 'General',
    dimensions: ['quality', 'clarity', 'effectiveness', 'originality', 'execution'],
    systemPrompt:
      'You are a thoughtful, expert critic. Analyze the provided content and give balanced, actionable feedback.',
  },
};

const TONES = {
  constructive: 'Be encouraging and supportive while still being honest about weaknesses.',
  strict: 'Be rigorous and demanding. Hold the work to the highest professional standard.',
  balanced: 'Be fair and balanced, neither overly positive nor overly harsh.',
};

const DETAIL_LEVELS = {
  brief: 'Keep feedback concise — 1–2 sentences per point.',
  detailed: 'Give thorough, in-depth feedback with clear explanations and examples.',
  standard: 'Provide clear feedback with enough detail to be actionable.',
};

/**
 * Build the user prompt sent to the model.
 * @param {string} content - The content to critique.
 * @param {string} critiqueType - Key from CRITIQUE_TYPES.
 * @param {string} tone - Key from TONES.
 * @param {string} detailLevel - Key from DETAIL_LEVELS.
 * @param {string} [extraContext] - Optional context or specific focus areas from the user.
 * @returns {string}
 */
function buildUserPrompt(content, critiqueType, tone, detailLevel, extraContext) {
  const type = CRITIQUE_TYPES[critiqueType] || CRITIQUE_TYPES.general;
  const dimensionsStr = type.dimensions.join(', ');

  const contextSection = extraContext
    ? `\n\nAdditional context / focus areas provided by the author:\n${extraContext}`
    : '';

  return `Please critique the following ${type.label.toLowerCase()} content.

${TONES[tone] || TONES.balanced}
${DETAIL_LEVELS[detailLevel] || DETAIL_LEVELS.standard}

Score each of these dimensions on a scale of 1–10: ${dimensionsStr}.
Also provide an overall score (1–10).

Respond ONLY with valid JSON in exactly this shape — no markdown, no extra text:
{
  "overall_score": <number 1-10>,
  "summary": "<2–3 sentence overview>",
  "strengths": ["<strength 1>", "..."],
  "weaknesses": ["<weakness 1>", "..."],
  "suggestions": ["<actionable suggestion 1>", "..."],
  "dimension_scores": {
    ${type.dimensions.map((d) => `"${d}": <number 1-10>`).join(',\n    ')}
  }
}${contextSection}

---
CONTENT TO CRITIQUE:
${content}`;
}

/**
 * Parse and validate AI JSON response.
 * @param {string} raw
 * @param {string} critiqueType
 * @returns {object}
 */
function parseAIResponse(raw, critiqueType) {
  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error('AI returned non-JSON response. Please try again.');
  }

  const required = ['overall_score', 'summary', 'strengths', 'weaknesses', 'suggestions', 'dimension_scores'];
  for (const field of required) {
    if (!(field in parsed)) {
      throw new Error(`AI response missing field: ${field}`);
    }
  }

  const type = CRITIQUE_TYPES[critiqueType] || CRITIQUE_TYPES.general;
  for (const dim of type.dimensions) {
    if (!(dim in parsed.dimension_scores)) {
      parsed.dimension_scores[dim] = null;
    }
  }

  return parsed;
}

class AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.');
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = 'gpt-4o';
  }

  /**
   * Run a critique on the provided content.
   * @param {object} params
   * @param {string} params.content
   * @param {string} [params.critiqueType='general']
   * @param {string} [params.tone='balanced']
   * @param {string} [params.detailLevel='standard']
   * @param {string} [params.extraContext='']
   * @returns {Promise<object>} Structured critique result.
   */
  async critique({ content, critiqueType = 'general', tone = 'balanced', detailLevel = 'standard', extraContext = '' }) {
    const type = CRITIQUE_TYPES[critiqueType] || CRITIQUE_TYPES.general;

    const userPrompt = buildUserPrompt(content, critiqueType, tone, detailLevel, extraContext);

    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: type.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const result = parseAIResponse(raw, critiqueType);

    return {
      ...result,
      critiqueType,
      tone,
      detailLevel,
      model: this.model,
      promptTokens: response.usage?.prompt_tokens ?? null,
      completionTokens: response.usage?.completion_tokens ?? null,
    };
  }
}

module.exports = { AIService, CRITIQUE_TYPES, TONES, DETAIL_LEVELS, buildUserPrompt, parseAIResponse };
