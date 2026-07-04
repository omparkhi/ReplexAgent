import { randomUUID } from 'node:crypto';

/**
 * @typedef {import('../../domain/interfaces/reasoning.interface.js').ReasoningInput} ReasoningInput
 * @typedef {import('../../domain/interfaces/reasoning.interface.js').ReasoningResult} ReasoningResult
 * @typedef {import('../../domain/interfaces/reasoning.interface.js').ReasoningStep} ReasoningStep
 * @typedef {import('../../domain/interfaces/reasoning.interface.js').ReasoningOutput} ReasoningOutput
 * @typedef {import('../../domain/interfaces/reasoning.interface.js').ReasoningEvidence} ReasoningEvidence
 */

/**
 * @typedef {object} ParsedLlmReasoning
 * @property {{thought: string, evidence: unknown, source: string, confidence: number}[]} [reasoningSteps]
 * @property {string} [answer]
 * @property {number} [confidence]
 * @property {ReasoningEvidence[]} [evidence]
 * @property {string[]} [recommendations]
 * @property {string[]} [uncertainties]
 */

/**
 * @typedef {object} ConductReasoningResult
 * @property {ReasoningStep[]} steps
 * @property {string} answer
 * @property {number} confidence
 * @property {ReasoningEvidence[]} evidence
 * @property {string[]} recommendations
 * @property {string[]} uncertainties
 */

export class ReasoningEngine {
  /**
   * @param {object} dependencies
   * @param {import('../../domain/interfaces/llm-provider.interface.js').LlmProvider} dependencies.llmProvider
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} dependencies.logger
   * @param {object} [dependencies.validator]
   * @param {(output: unknown) => ReasoningOutput} dependencies.validator.validate
   * @param {number} [dependencies.defaultMaxSteps]
   * @param {number} [dependencies.defaultConfidenceThreshold]
   */
  constructor(dependencies) {
    this.llmProvider = dependencies.llmProvider;
    this.logger = dependencies.logger;
    this.validator = dependencies.validator;
    this.defaultMaxSteps = dependencies.defaultMaxSteps ?? 5;
    this.defaultConfidenceThreshold = dependencies.defaultConfidenceThreshold ?? 0.3;
  }

  /**
   * @param {ReasoningInput} input
   * @returns {Promise<ReasoningResult>}
   */
  async reason(input) {
    const startTime = Date.now();
    /** @type {ReasoningStep[]} */
    const steps = [];

    this.logger.debug({ query: input.query, strategy: input.strategy }, 'Reasoning started');

    try {
      const structuredInput = this.#formatStructuredInput(input);

      const reasoning = await this.#conductReasoning(structuredInput, steps, input.maxSteps ?? this.defaultMaxSteps);

      let output = this.#buildOutput(reasoning);

      if (this.validator) {
        output = this.validator.validate(output);
      }

      if (output.confidence < this.defaultConfidenceThreshold) {
        output.uncertainties = [
          ...output.uncertainties,
          `Low confidence (${(output.confidence * 100).toFixed(1)}%). Results may be unreliable.`
        ];
      }

      const durationMs = Date.now() - startTime;

      this.logger.debug({
        query: input.query,
        confidence: output.confidence,
        stepCount: reasoning.steps.length,
        durationMs
      }, 'Reasoning completed');

      return {
        success: true,
        output,
        steps: reasoning.steps,
        durationMs,
        strategy: input.strategy ?? 'deductive',
        metadata: {
          queryLength: input.query.length,
          contextKeys: input.context ? Object.keys(input.context) : [],
          memoryCount: input.memory?.length ?? 0,
          toolResultCount: input.toolResults?.length ?? 0
        }
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const err = /** @type {Error} */ (error);

      this.logger.error({ error: err.message, query: input.query }, 'Reasoning failed');

      return {
        success: false,
        output: {
          answer: 'Reasoning failed due to an internal error.',
          confidence: 0,
          evidence: [],
          sources: [],
          recommendations: ['Try rephrasing the query.', 'Provide more context.'],
          uncertainties: ['Internal error occurred during reasoning.']
        },
        steps,
        durationMs,
        strategy: input.strategy ?? 'deductive',
        metadata: { error: err.message }
      };
    }
  }

  /**
   * Format input into structured data for reasoning (never raw text).
   * @param {ReasoningInput} input
   * @returns {Record<string, unknown>}
   */
  #formatStructuredInput(input) {
    const structured = {
      query: input.query,
      context: input.context ?? {},
      memory: (input.memory ?? []).map(m => ({
        key: m.key,
        type: m.type,
        value: m.value,
        tags: m.tags ?? []
      })),
      toolResults: (input.toolResults ?? []).map(t => ({
        tool: t.tool,
        success: t.success,
        data: t.data,
        durationMs: t.durationMs
      })),
      metadata: input.metadata ?? {}
    };

    return structured;
  }

  /**
   * Conduct multi-step reasoning using LLM.
   * @param {Record<string, unknown>} structuredInput
   * @param {ReasoningStep[]} steps
   * @param {number} maxSteps
   * @returns {Promise<ConductReasoningResult>}
   */
  async #conductReasoning(structuredInput, steps, maxSteps) {
    const reasoningPrompt = this.#buildReasoningPrompt(structuredInput, steps);

    const completion = await this.llmProvider.complete({
      messages: [
        {
          role: 'system',
          content: `You are a reasoning engine. Analyze the provided structured data and produce a chain of thought.
Output ONLY valid JSON matching this schema:
{
  "reasoningSteps": [
    {
      "thought": "string - your reasoning step",
      "evidence": {} - supporting evidence,
      "source": "context|memory|tool|inference",
      "confidence": 0.0-1.0
    }
  ],
  "answer": "string - final answer",
  "confidence": 0.0-1.0,
  "evidence": [{"claim": "string", "source": "string", "sourceType": "context|memory|tool|inference|external", "reliability": 0.0-1.0}],
  "recommendations": ["string"],
  "uncertainties": ["string"]
}

Rules:
- Never expose internal reasoning chain in the answer.
- Base reasoning ONLY on provided structured data.
- If confidence is low (<0.5), acknowledge uncertainties.
- Cite evidence sources explicitly.`
        },
        {
          role: 'user',
          content: JSON.stringify(structuredInput, null, 2)
        }
      ],
      options: {
        temperature: 0.3,
        maxTokens: 2000,
        jsonMode: true
      }
    });

    /** @type {ParsedLlmReasoning} */
    let parsed;
    try {
      parsed = JSON.parse(completion.content);
    } catch {
      parsed = {
        reasoningSteps: [{ thought: completion.content, confidence: 0.5, evidence: {}, source: 'inference' }],
        answer: completion.content,
        confidence: 0.5,
        evidence: [],
        recommendations: [],
        uncertainties: ['Failed to parse structured reasoning output.']
      };
    }

    if (parsed.reasoningSteps) {
      for (const step of parsed.reasoningSteps) {
        steps.push({
          id: randomUUID(),
          thought: step.thought,
          evidence: /** @type {Record<string, unknown> | undefined} */ (step.evidence),
          source: step.source ?? 'inference',
          confidence: typeof step.confidence === 'number' ? step.confidence : 0.5
        });
      }
    }

    return {
      steps,
      answer: parsed.answer ?? 'No answer produced.',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : []
    };
  }

  /**
   * Build reasoning prompt from structured input.
   * @param {Record<string, unknown>} structuredInput
   * @param {ReasoningStep[]} previousSteps
   * @returns {string}
   */
  #buildReasoningPrompt(structuredInput, previousSteps) {
    let prompt = `Analyze the following structured data and reason about the query.\n\n`;
    prompt += `Query: ${String(structuredInput.query)}\n\n`;

    const ctx = /** @type {Record<string, unknown>} */ (structuredInput.context);
    if (ctx && typeof ctx === 'object' && Object.keys(ctx).length > 0) {
      prompt += `Context:\n${JSON.stringify(ctx, null, 2)}\n\n`;
    }

    const mem = /** @type {unknown[]} */ (structuredInput.memory);
    if (Array.isArray(mem) && mem.length > 0) {
      prompt += `Relevant Memory:\n${JSON.stringify(mem, null, 2)}\n\n`;
    }

    const tools = /** @type {unknown[]} */ (structuredInput.toolResults);
    if (Array.isArray(tools) && tools.length > 0) {
      prompt += `Tool Results:\n${JSON.stringify(tools, null, 2)}\n\n`;
    }

    if (previousSteps.length > 0) {
      prompt += `Previous Reasoning Steps:\n${JSON.stringify(previousSteps.map(s => ({ thought: s.thought, confidence: s.confidence })), null, 2)}\n\n`;
    }

    prompt += `Produce your reasoning as structured JSON.`;

    return prompt;
  }

  /**
   * Build structured output from reasoning result.
   * @param {ConductReasoningResult} reasoning
   * @returns {ReasoningOutput}
   */
  #buildOutput(reasoning) {
    if (reasoning.steps.length === 0) {
      return {
        answer: 'No reasoning steps produced.',
        confidence: 0,
        evidence: [],
        sources: [],
        recommendations: [],
        uncertainties: ['Reasoning produced no steps.']
      };
    }

    const sources = [...new Set(reasoning.steps.map(s => s.source ?? 'inference'))];

    return {
      answer: reasoning.answer,
      confidence: reasoning.confidence,
      evidence: reasoning.evidence,
      sources,
      recommendations: reasoning.recommendations,
      uncertainties: [
        ...reasoning.uncertainties,
        ...reasoning.steps
          .filter(s => s.confidence < 0.5)
          .map(s => `Low confidence in step: "${s.thought.slice(0, 50)}..."`)
      ]
    };
  }
}
