'use strict';

const { buildUserPrompt, parseAIResponse, CRITIQUE_TYPES, TONES, DETAIL_LEVELS } = require('../src/aiService');

describe('buildUserPrompt', () => {
  it('includes the content to critique', () => {
    const prompt = buildUserPrompt('Hello world', 'general', 'balanced', 'standard', '');
    expect(prompt).toContain('Hello world');
  });

  it('includes all dimension names for the given type', () => {
    const type = CRITIQUE_TYPES.writing;
    const prompt = buildUserPrompt('test', 'writing', 'balanced', 'standard', '');
    for (const dim of type.dimensions) {
      expect(prompt).toContain(dim);
    }
  });

  it('includes tone instruction', () => {
    const prompt = buildUserPrompt('test', 'general', 'strict', 'standard', '');
    expect(prompt).toContain(TONES.strict);
  });

  it('includes detail level instruction', () => {
    const prompt = buildUserPrompt('test', 'general', 'balanced', 'brief', '');
    expect(prompt).toContain(DETAIL_LEVELS.brief);
  });

  it('includes extra context when provided', () => {
    const prompt = buildUserPrompt('test', 'general', 'balanced', 'standard', 'Focus on grammar');
    expect(prompt).toContain('Focus on grammar');
  });

  it('does not include extra context section when empty', () => {
    const prompt = buildUserPrompt('test', 'general', 'balanced', 'standard', '');
    expect(prompt).not.toContain('Additional context');
  });

  it('falls back to general type for unknown critiqueType', () => {
    const prompt = buildUserPrompt('test', 'unknown_type', 'balanced', 'standard', '');
    for (const dim of CRITIQUE_TYPES.general.dimensions) {
      expect(prompt).toContain(dim);
    }
  });
});

describe('parseAIResponse', () => {
  const validResponse = JSON.stringify({
    overall_score: 7,
    summary: 'Good overall.',
    strengths: ['Clear structure'],
    weaknesses: ['Some typos'],
    suggestions: ['Proofread again'],
    dimension_scores: {
      clarity: 8,
      structure: 7,
      grammar: 6,
      style: 7,
      engagement: 7,
    },
  });

  it('parses valid JSON response', () => {
    const result = parseAIResponse(validResponse, 'writing');
    expect(result.overall_score).toBe(7);
    expect(result.summary).toBe('Good overall.');
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(Array.isArray(result.weaknesses)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('throws on non-JSON response', () => {
    expect(() => parseAIResponse('This is not JSON', 'writing')).toThrow('AI returned non-JSON response');
  });

  it('throws if a required field is missing', () => {
    const bad = JSON.stringify({ overall_score: 5 });
    expect(() => parseAIResponse(bad, 'writing')).toThrow('AI response missing field');
  });

  it('fills null for missing dimension scores', () => {
    const partial = JSON.stringify({
      overall_score: 7,
      summary: 'ok',
      strengths: [],
      weaknesses: [],
      suggestions: [],
      dimension_scores: { clarity: 7 }, // missing other dimensions
    });
    const result = parseAIResponse(partial, 'writing');
    for (const dim of CRITIQUE_TYPES.writing.dimensions) {
      expect(dim in result.dimension_scores).toBe(true);
    }
  });

  it('handles whitespace around JSON', () => {
    const padded = `   ${validResponse}   `;
    const result = parseAIResponse(padded, 'writing');
    expect(result.overall_score).toBe(7);
  });
});
