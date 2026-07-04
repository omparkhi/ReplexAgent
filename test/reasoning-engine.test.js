import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ReasoningEngine } from '../src/application/reasoning/ReasoningEngine.js';
import { ReasoningValidator } from '../src/application/reasoning/ReasoningValidator.js';
import { ValidationError } from '../src/domain/errors/ValidationError.js';

/** @type {any} */
const logger = {
  info() {},
  warn() {},
  error() {},
  debug() {}
};

/** @param {any} responseContent */
const createMockLlmProvider = (responseContent) => ({
  id: 'mock-llm',
  complete: async () => ({
    content: typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent),
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    metadata: { provider: 'mock', model: 'test-model', durationMs: 100 }
  })
});

const validReasoningResponse = {
  reasoningSteps: [
    { thought: 'Analyzed context data', evidence: { finding: 'test' }, source: 'context', confidence: 0.8 },
    { thought: 'Cross-referenced memory', evidence: { memory: 'test' }, source: 'memory', confidence: 0.7 },
    { thought: 'Final conclusion reached', evidence: {}, source: 'inference', confidence: 0.85 }
  ],
  answer: 'Based on analysis, the answer is X',
  confidence: 0.85,
  evidence: [
    { claim: 'Context shows X', source: 'context', sourceType: 'context', reliability: 0.9 },
    { claim: 'Memory confirms Y', source: 'memory', sourceType: 'memory', reliability: 0.8 }
  ],
  recommendations: ['Action 1', 'Action 2'],
  uncertainties: []
};

describe('ReasoningEngine', () => {
  /** @type {any} */
  let validator;

  beforeEach(() => {
    validator = new ReasoningValidator();
  });

  it('produces reasoning result from structured input', async () => {
    const engine = new ReasoningEngine({
      llmProvider: createMockLlmProvider(validReasoningResponse),
      logger,
      validator,
      defaultMaxSteps: 5,
      defaultConfidenceThreshold: 0.3
    });

    const result = await engine.reason({
      query: 'Analyze the codebase for security issues',
      context: { project: { name: 'test-project' }, findings: [{ id: '1', title: 'XSS', severity: 'high' }] },
      memory: [{ key: 'm1', type: 'context', value: { info: 'previous finding' } }],
      toolResults: [{ tool: 'scanner', success: true, data: { issues: 3 } }]
    });

    assert.equal(result.success, true);
    assert.equal(typeof result.output.answer, 'string');
    assert.ok(result.output.confidence >= 0 && result.output.confidence <= 1);
    assert.ok(Array.isArray(result.output.evidence));
    assert.ok(Array.isArray(result.output.sources));
    assert.ok(Array.isArray(result.output.recommendations));
    assert.ok(Array.isArray(result.output.uncertainties));
    assert.ok(result.steps.length > 0);
    assert.ok(result.durationMs >= 0);
    assert.equal(result.strategy, 'deductive');
  });

  it('handles low confidence with uncertainties', async () => {
    const lowConfidenceResponse = {
      ...validReasoningResponse,
      confidence: 0.2,
      uncertainties: ['Insufficient data']
    };

    const engine = new ReasoningEngine({
      llmProvider: createMockLlmProvider(lowConfidenceResponse),
      logger,
      validator,
      defaultConfidenceThreshold: 0.3
    });

    const result = await engine.reason({
      query: 'What is the meaning of life?',
      context: {}
    });

    assert.equal(result.success, true);
    assert.ok(result.output.confidence < 0.3);
    assert.ok(result.output.uncertainties.some(u => u.includes('Low confidence')));
  });

  it('handles LLM returning invalid JSON gracefully', async () => {
    const engine = new ReasoningEngine({
      llmProvider: createMockLlmProvider('This is not JSON at all'),
      logger,
      validator,
      defaultMaxSteps: 5
    });

    const result = await engine.reason({
      query: 'Analyze something',
      context: {}
    });

    assert.equal(result.success, true);
    assert.equal(typeof result.output.answer, 'string');
    assert.ok(result.output.uncertainties.some(u => u.includes('Failed to parse')));
  });

  it('handles LLM provider errors gracefully', async () => {
    const failingProvider = {
      id: 'failing',
      complete: async () => { throw new Error('LLM unavailable'); }
    };

    const engine = new ReasoningEngine({
      llmProvider: failingProvider,
      logger,
      validator,
      defaultMaxSteps: 5
    });

    const result = await engine.reason({
      query: 'Analyze something',
      context: {}
    });

    assert.equal(result.success, false);
    assert.equal(result.output.confidence, 0);
    assert.ok(result.output.uncertainties.some(u => u.includes('Internal error')));
  });

  it('formats structured input correctly', async () => {
    /** @type {any} */
    let capturedInput;
    const capturingProvider = {
      id: 'capturing',
      complete: async (/** @type {any} */ input) => {
        capturedInput = input;
        return {
          content: JSON.stringify(validReasoningResponse),
          metadata: { provider: 'capturing' }
        };
      }
    };

    const engine = new ReasoningEngine({
      llmProvider: capturingProvider,
      logger,
      validator,
      defaultMaxSteps: 5
    });

    await engine.reason({
      query: 'Test query',
      context: { project: { name: 'test' } },
      memory: [{ key: 'm1', type: 'context', value: { data: 1 } }],
      toolResults: [{ tool: 'echo', success: true, data: 'hello' }]
    });

    const userMessage = capturedInput.messages.find((/** @type {any} */ m) => m.role === 'user');
    const parsed = JSON.parse(userMessage.content);

    assert.equal(parsed.query, 'Test query');
    assert.deepEqual(parsed.context, { project: { name: 'test' } });
    assert.ok(Array.isArray(parsed.memory));
    assert.equal(parsed.memory[0].key, 'm1');
    assert.ok(Array.isArray(parsed.toolResults));
    assert.equal(parsed.toolResults[0].tool, 'echo');
  });

  it('includes reasoning metadata in result', async () => {
    const engine = new ReasoningEngine({
      llmProvider: createMockLlmProvider(validReasoningResponse),
      logger,
      validator
    });

    const result = await engine.reason({
      query: 'Test',
      context: { project: { name: 'x' } },
      memory: [{ key: 'm1', type: 'context', value: {} }],
      toolResults: [{ tool: 't1', success: true, data: {} }],
      metadata: { extra: 'info' }
    });

    assert.equal(result.metadata?.queryLength, 4);
    assert.ok(/** @type {any} */ (result.metadata?.contextKeys).includes('project'));
    assert.equal(result.metadata?.memoryCount, 1);
    assert.equal(result.metadata?.toolResultCount, 1);
  });

  it('masks internal reasoning steps from output', async () => {
    const engine = new ReasoningEngine({
      llmProvider: createMockLlmProvider(validReasoningResponse),
      logger,
      validator
    });

    const result = await engine.reason({
      query: 'Analyze code',
      context: {}
    });

    assert.ok(!result.output.answer.includes('Analyzed context data'));
    assert.ok(!result.output.answer.includes('Cross-referenced memory'));
    assert.equal(result.output.answer, validReasoningResponse.answer);
  });
});

describe('ReasoningValidator', () => {
  /** @type {any} */
  let validator;

  beforeEach(() => {
    validator = new ReasoningValidator();
  });

  it('validates correct output structure', () => {
    const input = {
      answer: 'The answer is 42',
      confidence: 0.85,
      evidence: [
        { claim: 'Data shows 42', source: 'context', sourceType: 'context', reliability: 0.9 }
      ],
      sources: ['context', 'memory'],
      recommendations: ['Do X'],
      uncertainties: []
    };

    const result = validator.validate(input);
    assert.equal(result.answer, 'The answer is 42');
    assert.equal(result.confidence, 0.85);
    assert.equal(result.evidence.length, 1);
    assert.equal(result.sources.length, 2);
  });

  it('clamps confidence to 0-1 range', () => {
    assert.equal(validator.validate({ confidence: 1.5, answer: 'x', evidence: [], sources: [], recommendations: [], uncertainties: [] }).confidence, 1);
    assert.equal(validator.validate({ confidence: -0.5, answer: 'x', evidence: [], sources: [], recommendations: [], uncertainties: [] }).confidence, 0);
    assert.equal(validator.validate({ confidence: NaN, answer: 'x', evidence: [], sources: [], recommendations: [], uncertainties: [] }).confidence, 0);
  });

  it('normalizes missing fields', () => {
    const result = validator.validate({});
    assert.equal(result.answer, 'No answer produced.');
    assert.equal(result.confidence, 0);
    assert.deepEqual(result.evidence, []);
    assert.deepEqual(result.sources, []);
    assert.deepEqual(result.recommendations, []);
    assert.deepEqual(result.uncertainties, []);
  });

  it('normalizes invalid evidence entries', () => {
    const result = validator.validate({
      answer: 'x',
      confidence: 0.5,
      evidence: [null, 'bad', { claim: 'good', source: 'test', sourceType: 'invalid', reliability: 2 }],
      sources: [],
      recommendations: [],
      uncertainties: []
    });

    assert.equal(result.evidence.length, 3);
    assert.equal(result.evidence[0].claim, 'Unknown evidence');
    assert.equal(result.evidence[1].claim, 'bad');
    assert.equal(result.evidence[2].sourceType, 'external');
    assert.equal(result.evidence[2].reliability, 1);
  });

  it('filters invalid sources and recommendations', () => {
    const result = validator.validate({
      answer: 'x',
      confidence: 0.5,
      evidence: [],
      sources: ['valid', '', null, 123],
      recommendations: ['valid', '', null],
      uncertainties: ['valid', '']
    });

    assert.deepEqual(result.sources, ['valid']);
    assert.deepEqual(result.recommendations, ['valid']);
    assert.deepEqual(result.uncertainties, ['valid']);
  });

  it('throws ValidationError for non-object input', () => {
    assert.throws(() => validator.validate(null), ValidationError);
    assert.throws(() => validator.validate('string'), ValidationError);
    assert.throws(() => validator.validate(42), ValidationError);
  });

  it('normalizes evidence with invalid sourceType', () => {
    const result = validator.validate({
      answer: 'x',
      confidence: 0.5,
      evidence: [{ claim: 'test', source: 'x', sourceType: 'bogus' }],
      sources: [],
      recommendations: [],
      uncertainties: []
    });

    assert.equal(result.evidence[0].sourceType, 'external');
  });

  it('handles evidence with missing fields', () => {
    const result = validator.validate({
      answer: 'x',
      confidence: 0.5,
      evidence: [{}],
      sources: [],
      recommendations: [],
      uncertainties: []
    });

    assert.equal(result.evidence[0].claim, 'Unspecified claim');
    assert.equal(result.evidence[0].source, 'unknown');
    assert.equal(result.evidence[0].sourceType, 'external');
    assert.equal(result.evidence[0].reliability, 0);
  });
});
