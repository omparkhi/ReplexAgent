export class ContextEngine {
  /**
   * @param {object} dependencies
   * @param {import('../../domain/interfaces/context.interface.js').ContextCollector[]} dependencies.collectors
   * @param {import('../../domain/interfaces/context.interface.js').ContextProjector} dependencies.projector
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} dependencies.logger
   */
  constructor(dependencies) {
    this.collectors = dependencies.collectors;
    this.projector = dependencies.projector;
    this.logger = dependencies.logger;
  }

  /**
   * @param {import('../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @returns {Promise<import('../../domain/interfaces/context.interface.js').AgentContext>}
   */
  async create(input) {
    /** @type {import('../../domain/interfaces/context.interface.js').PartialAgentContext[]} */
    const fragments = [];
    /** @type {import('../../domain/interfaces/context.interface.js').ContextAssemblySourceStatus[]} */
    const sources = [];

    for (const collector of this.collectors) {
      const startedAt = performance.now();

      try {
        const result = await collector.collect(input);
        fragments.push(result.context);
        sources.push({
          name: collector.name,
          status: Object.keys(result.context).length > 0 ? 'collected' : 'skipped',
          durationMs: Math.round(performance.now() - startedAt),
          reason: result.reason
        });
      } catch (error) {
        sources.push({
          name: collector.name,
          status: 'failed',
          durationMs: Math.round(performance.now() - startedAt),
          reason: error instanceof Error ? error.message : 'Unknown context collector failure'
        });
        this.logger.warn({ error, collector: collector.name }, 'Context collector failed');
      }
    }

    return this.projector.project(input, fragments, {
      version: 'agent-context.v1',
      collectedAt: new Date(),
      sources
    });
  }
}
