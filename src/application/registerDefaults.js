import { RuntimeAgent } from './RuntimeAgent.js';
import { WebsiteAuditAgent } from './WebsiteAuditAgent.js';
import { ReportAgent } from './ReportAgent.js';
import { getBuiltinTools } from '../infrastructure/tools/builtin/index.js';

/**
 * @param {import('../infrastructure/di/Container.js').Container} container
 */
export function registerDefaultModules(container) {
  const agentRegistry = container.resolve('agentRegistry');
  const runtimeAgent = new RuntimeAgent({
    contextProvider: container.resolve('contextProvider'),
    promptBuilder: container.resolve('promptBuilder'),
    llmProvider: container.resolve('llmProvider'),
    memoryStore: container.resolve('memoryStore'),
    ragProvider: container.resolve('ragProvider'),
    logger: container.resolve('logger'),
    reasoningEngine: container.resolve('reasoningEngine')
  });

  agentRegistry.register(runtimeAgent);

  const websiteAuditAgent = new WebsiteAuditAgent({
    contextProvider: container.resolve('contextProvider'),
    promptBuilder: container.resolve('promptBuilder'),
    llmProvider: container.resolve('llmProvider'),
    memoryStore: container.resolve('memoryStore'),
    ragProvider: container.resolve('ragProvider'),
    logger: container.resolve('logger')
  });

  agentRegistry.register(websiteAuditAgent);

  const reportAgent = new ReportAgent({
    logger: container.resolve('logger')
  });

  agentRegistry.register(reportAgent);

  const toolRegistry = container.resolve('toolRegistry');
  for (const tool of getBuiltinTools()) {
    toolRegistry.register(tool);
  }
}
