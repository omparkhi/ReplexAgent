import { DefaultContextProjector } from '../../application/context/DefaultContextProjector.js';

export class DefaultContextProvider {
  constructor() {
    this.projector = new DefaultContextProjector();
  }

  /**
   * @param {import('../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @returns {Promise<import('../../domain/interfaces/context.interface.js').AgentContext>}
   */
  async create(input) {
    return this.projector.project(input, [], {
      version: 'agent-context.v1',
      collectedAt: new Date(),
      sources: []
    });
  }
}
