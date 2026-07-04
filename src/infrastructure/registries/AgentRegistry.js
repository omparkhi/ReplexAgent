import { NotFoundError } from '../../domain/errors/NotFoundError.js';

export class AgentRegistry {
  constructor() {
    /** @type {Map<string, import('../../domain/interfaces/agent.interface.js').Agent>} */
    this.agents = new Map();
  }

  /**
   * @param {import('../../domain/interfaces/agent.interface.js').Agent} agent
   */
  register(agent) {
    this.agents.set(agent.id, agent);
  }

  /**
   * @param {string} agentId
   * @returns {import('../../domain/interfaces/agent.interface.js').Agent}
   */
  get(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new NotFoundError(`Agent not found: ${agentId}`);
    }

    return agent;
  }

  /**
   * @returns {{ id: string, name: string }[]}
   */
  list() {
    return Array.from(this.agents.values()).map((agent) => ({
      id: agent.id,
      name: agent.name
    }));
  }
}
