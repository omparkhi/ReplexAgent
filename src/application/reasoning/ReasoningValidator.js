import { ValidationError } from '../../domain/errors/ValidationError.js';

/**
 * @typedef {import('../../domain/interfaces/reasoning.interface.js').ReasoningOutput} ReasoningOutput
 * @typedef {import('../../domain/interfaces/reasoning.interface.js').ReasoningEvidence} ReasoningEvidence
 */

/**
 * Validates and normalizes ReasoningOutput structures.
 */
export class ReasoningValidator {
  /**
   * Validate and normalize a reasoning output.
   * @param {unknown} raw
   * @returns {ReasoningOutput}
   */
  validate(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new ValidationError('Reasoning output must be an object');
    }

    const output = /** @type {Record<string, unknown>} */ (raw);

    if (typeof output.answer !== 'string' || output.answer.trim().length === 0) {
      output.answer = 'No answer produced.';
    }

    output.confidence = this.#clampNumber(output.confidence, 0, 1);

    if (!Array.isArray(output.evidence)) {
      output.evidence = [];
    }
    output.evidence = /** @type {unknown[]} */ (output.evidence).map(e => this.#normalizeEvidence(e));

    if (!Array.isArray(output.sources)) {
      output.sources = [];
    }
    output.sources = /** @type {unknown[]} */ (output.sources).filter(s => typeof s === 'string' && s.length > 0);

    if (!Array.isArray(output.recommendations)) {
      output.recommendations = [];
    }
    output.recommendations = /** @type {unknown[]} */ (output.recommendations).filter(r => typeof r === 'string' && r.length > 0);

    if (!Array.isArray(output.uncertainties)) {
      output.uncertainties = [];
    }
    output.uncertainties = /** @type {unknown[]} */ (output.uncertainties).filter(u => typeof u === 'string' && u.length > 0);

    return /** @type {ReasoningOutput} */ (output);
  }

  /**
   * Normalize a single evidence entry.
   * @param {unknown} raw
   * @returns {ReasoningEvidence}
   */
  #normalizeEvidence(raw) {
    if (!raw || typeof raw !== 'object') {
      return {
        claim: String(raw ?? 'Unknown evidence'),
        source: 'unknown',
        sourceType: 'external',
        reliability: 0.5
      };
    }

    const entry = /** @type {Record<string, unknown>} */ (raw);
    const validSourceTypes = ['context', 'memory', 'tool', 'inference', 'external'];
    const sourceType = typeof entry.sourceType === 'string' && validSourceTypes.includes(entry.sourceType)
      ? /** @type {'context' | 'memory' | 'tool' | 'inference' | 'external'} */ (entry.sourceType)
      : 'external';

    return {
      claim: typeof entry.claim === 'string' ? entry.claim : 'Unspecified claim',
      source: typeof entry.source === 'string' ? entry.source : 'unknown',
      sourceType,
      reliability: this.#clampNumber(entry.reliability, 0, 1)
    };
  }

  /**
   * Clamp a number between min and max.
   * @param {unknown} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  #clampNumber(value, min, max) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return min;
    }
    return Math.min(max, Math.max(min, value));
  }
}
