import { asRecord } from '../../../application/context/contextGuards.js';

export class ProjectContextCollector {
  constructor() {
    this.name = 'project';
  }

  /**
   * @param {import('../../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @returns {Promise<import('../../../domain/interfaces/context.interface.js').ContextCollectorResult>}
   */
  async collect(input) {
    const project = asRecord(input.metadata?.project);
    return Object.keys(project).length > 0
      ? { context: { project } }
      : { context: {}, reason: 'No project context provided' };
  }
}
