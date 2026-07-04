export class RuntimeAgent {
  /**
   * @param {object} dependencies
   * @param {import('../domain/interfaces/context.interface.js').ContextProvider} dependencies.contextProvider
   * @param {import('../domain/interfaces/prompt-builder.interface.js').PromptBuilder} dependencies.promptBuilder
   * @param {import('../domain/interfaces/llm-provider.interface.js').LlmProvider} dependencies.llmProvider
   * @param {import('../domain/interfaces/memory.interface.js').MemoryStore} dependencies.memoryStore
   * @param {import('../domain/interfaces/rag.interface.js').RagProvider} dependencies.ragProvider
   * @param {import('../domain/interfaces/logger.interface.js').Logger} dependencies.logger
   * @param {import('./reasoning/ReasoningEngine.js').ReasoningEngine} [dependencies.reasoningEngine]
   */
  constructor(dependencies) {
    this.id = 'runtime-agent';
    this.name = 'Runtime Agent';
    this.contextProvider = dependencies.contextProvider;
    this.promptBuilder = dependencies.promptBuilder;
    this.llmProvider = dependencies.llmProvider;
    this.memoryStore = dependencies.memoryStore;
    this.ragProvider = dependencies.ragProvider;
    this.logger = dependencies.logger;
    this.reasoningEngine = dependencies.reasoningEngine;
  }

  /**
   * @param {import('../domain/interfaces/agent.interface.js').AgentRunInput} input
   * @returns {Promise<import('../domain/interfaces/agent.interface.js').AgentRunResult>}
   */
  async run(input) {
    const context = await this.contextProvider.create({
      agentId: this.id,
      input: input.input,
      conversationId: input.conversationId,
      metadata: input.metadata
    });

    const documents = await this.ragProvider.retrieve({
      query: input.input,
      limit: 5
    });

    const recentMemory = await this.memoryStore.search({
      text: input.input,
      limit: 5,
      namespace: this.id
    });

    let completion;
    /** @type {Record<string, unknown> | undefined} */
    let reasoningMetadata;

    if (this.reasoningEngine) {
      const reasoningResult = await this.reasoningEngine.reason({
        query: input.input,
        context: {
          project: context.project,
          audit: context.audit,
          website: context.website,
          findings: context.findings,
          businessRules: context.businessRules
        },
        memory: recentMemory.map(m => ({
          key: m.key,
          type: m.type,
          value: m.value,
          tags: m.tags
        })),
        toolResults: [],
        metadata: {
          requestId: context.requestId,
          conversationId: input.conversationId
        },
        strategy: 'deductive',
        maxSteps: 5
      });

      const messages = await this.promptBuilder.build({
        context,
        rag: { documents },
        reasoning: {
          answer: reasoningResult.output.answer,
          confidence: reasoningResult.output.confidence,
          evidence: reasoningResult.output.evidence,
          recommendations: reasoningResult.output.recommendations
        }
      });

      completion = await this.llmProvider.complete({
        messages,
        signal: input.signal
      });

      reasoningMetadata = {
        confidence: reasoningResult.output.confidence,
        strategy: reasoningResult.strategy,
        durationMs: reasoningResult.durationMs,
        stepCount: reasoningResult.steps.length,
        uncertainties: reasoningResult.output.uncertainties
      };
    } else {
      const messages = await this.promptBuilder.build({
        context,
        rag: { documents }
      });

      completion = await this.llmProvider.complete({
        messages,
        signal: input.signal
      });
    }

    await this.memoryStore.save({
      key: context.requestId,
      value: {
        input: input.input,
        output: completion.content
      },
      metadata: {
        agentId: this.id,
        conversationId: input.conversationId
      }
    });

    this.logger.info({ requestId: context.requestId, agentId: this.id }, 'Agent run completed');

    return {
      output: completion.content,
      metadata: {
        requestId: context.requestId,
        agentId: this.id,
        llm: completion.metadata,
        ...(reasoningMetadata ? { reasoning: reasoningMetadata } : {})
      }
    };
  }
}
