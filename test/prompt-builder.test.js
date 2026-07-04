import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TemplateRegistry } from '../src/infrastructure/prompts/TemplateRegistry.js';
import { DefaultPromptBuilder } from '../src/infrastructure/prompts/DefaultPromptBuilder.js';

const logger = {
  info() {},
  warn() {},
  error() {},
  debug() {}
};

/** @returns {import('../src/domain/interfaces/context.interface.js').AgentContext} */
function createMinimalContext() {
  return {
    requestId: 'req-1',
    agentId: 'runtime-agent',
    input: 'Hello agent',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    metadata: {},
    project: {},
    audit: { events: [] },
    website: {},
    findings: [],
    userSettings: { preferences: {} },
    conversation: { messages: [] },
    businessRules: [],
    assembly: { version: '1.0.0', collectedAt: new Date(), sources: [] }
  };
}

/** @returns {import('../src/domain/interfaces/prompt-builder.interface.js').PromptTemplate} */
function createSimpleTemplate() {
  return {
    agentId: 'test-agent',
    version: '1.0.0',
    defaults: { agentName: 'Test Agent' },
    sections: [
      { id: 'system', role: 'system', priority: 10, template: 'You are {{agentName}}.' },
      { id: 'user', role: 'user', priority: 100, template: '{{input}}' }
    ]
  };
}

describe('TemplateRegistry', () => {
  it('registers and retrieves templates by agent ID', () => {
    const registry = new TemplateRegistry();
    const template = createSimpleTemplate();

    registry.register(template);

    assert.equal(registry.has('test-agent'), true);
    assert.equal(registry.get('test-agent')?.version, '1.0.0');
  });

  it('returns undefined for unregistered agent', () => {
    const registry = new TemplateRegistry();
    assert.equal(registry.get('unknown'), undefined);
    assert.equal(registry.has('unknown'), false);
  });

  it('lists all registered agent IDs', () => {
    const registry = new TemplateRegistry();
    registry.register({ ...createSimpleTemplate(), agentId: 'agent-a' });
    registry.register({ ...createSimpleTemplate(), agentId: 'agent-b' });

    const ids = registry.listAgentIds();
    assert.deepEqual(ids.sort(), ['agent-a', 'agent-b']);
  });

  it('overrides existing template', () => {
    const registry = new TemplateRegistry();
    registry.register(createSimpleTemplate());
    registry.override('test-agent', { ...createSimpleTemplate(), version: '2.0.0' });

    assert.equal(registry.get('test-agent')?.version, '2.0.0');
  });

  it('throws when registering template without agentId', () => {
    const registry = new TemplateRegistry();
    assert.throws(
      () => registry.register(/** @type {any} */ ({ sections: [{ id: 's', role: 'system', template: 't' }] })),
      /agentId/
    );
  });

  it('throws when registering template without sections', () => {
    const registry = new TemplateRegistry();
    assert.throws(
      () => registry.register(/** @type {any} */ ({ agentId: 'x' })),
      /section/
    );
  });
});

describe('DefaultPromptBuilder', () => {
  it('builds messages from template with variable interpolation', async () => {
    const registry = new TemplateRegistry();
    registry.register(createSimpleTemplate());
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: { ...createMinimalContext(), agentId: 'test-agent' }
    });

    assert.equal(messages.length, 2);
    assert.equal(messages[0].role, 'system');
    assert.equal(messages[0].content, 'You are Test Agent.');
    assert.equal(messages[1].role, 'user');
    assert.equal(messages[1].content, 'Hello agent');
  });

  it('skips sections when condition is falsy', async () => {
    const registry = new TemplateRegistry();
    registry.register({
      agentId: 'cond-agent',
      version: '1.0.0',
      sections: [
        { id: 'always', role: 'system', template: 'Always here' },
        { id: 'conditional', role: 'system', template: 'Conditional', condition: 'hasFindings' },
        { id: 'user', role: 'user', priority: 100, template: '{{input}}' }
      ]
    });
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: { ...createMinimalContext(), agentId: 'cond-agent', findings: [] }
    });

    assert.equal(messages.length, 2);
    assert.equal(messages[0].content, 'Always here');
    assert.equal(messages[1].content, 'Hello agent');
  });

  it('includes conditional section when condition is truthy', async () => {
    const registry = new TemplateRegistry();
    registry.register({
      agentId: 'cond2-agent',
      version: '1.0.0',
      sections: [
        { id: 'conditional', role: 'system', template: 'Found {{findingsCount}} items', condition: 'hasFindings' },
        { id: 'user', role: 'user', priority: 100, template: '{{input}}' }
      ]
    });
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: {
        ...createMinimalContext(),
        agentId: 'cond2-agent',
        findings: [{ id: 'f1', title: 'Bug', severity: 'high' }]
      }
    });

    assert.equal(messages.length, 2);
    assert.equal(messages[0].content, 'Found 1 items');
  });

  it('sorts sections by priority', async () => {
    const registry = new TemplateRegistry();
    registry.register({
      agentId: 'priority-agent',
      version: '1.0.0',
      sections: [
        { id: 'last', role: 'system', template: 'Second', priority: 200 },
        { id: 'first', role: 'system', template: 'First', priority: 10 },
        { id: 'user', role: 'user', priority: 300, template: '{{input}}' }
      ]
    });
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: { ...createMinimalContext(), agentId: 'priority-agent' }
    });

    assert.equal(messages[0].content, 'First');
    assert.equal(messages[1].content, 'Second');
    assert.equal(messages[2].content, 'Hello agent');
  });

  it('formats findings in template', async () => {
    const registry = new TemplateRegistry();
    registry.register({
      agentId: 'findings-agent',
      version: '1.0.0',
      sections: [
        { id: 'findings', role: 'system', template: '## Findings\n{{findingsSummary}}', condition: 'hasFindings' },
        { id: 'user', role: 'user', priority: 100, template: '{{input}}' }
      ]
    });
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: {
        ...createMinimalContext(),
        agentId: 'findings-agent',
        findings: [
          { id: 'f1', title: 'XSS Vulnerability', severity: 'critical', description: 'User input not sanitized' },
          { id: 'f2', title: 'Missing CSP', severity: 'medium' }
        ]
      }
    });

    const findingsMsg = messages[0].content;
    assert.ok(findingsMsg.includes('[CRITICAL] XSS Vulnerability'));
    assert.ok(findingsMsg.includes('[MEDIUM] Missing CSP'));
  });

  it('formats memory in template', async () => {
    const registry = new TemplateRegistry();
    registry.register({
      agentId: 'memory-agent',
      version: '1.0.0',
      sections: [
        { id: 'memory', role: 'system', template: '## Memory\n{{memorySummary}}', condition: 'hasMemory' },
        { id: 'user', role: 'user', priority: 100, template: '{{input}}' }
      ]
    });
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: { ...createMinimalContext(), agentId: 'memory-agent' },
      memory: { records: [{ type: 'preference', value: 'dark mode' }] }
    });

    assert.ok(messages[0].content.includes('[preference] dark mode'));
  });

  it('formats RAG documents in template', async () => {
    const registry = new TemplateRegistry();
    registry.register({
      agentId: 'rag-agent',
      version: '1.0.0',
      sections: [
        { id: 'rag', role: 'system', template: '## Docs\n{{ragSummary}}', condition: 'hasRag' },
        { id: 'user', role: 'user', priority: 100, template: '{{input}}' }
      ]
    });
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: { ...createMinimalContext(), agentId: 'rag-agent' },
      rag: { documents: [{ title: 'API Docs', content: 'Use /api/v1 for v1' }] }
    });

    assert.ok(messages[0].content.includes('### API Docs'));
    assert.ok(messages[0].content.includes('Use /api/v1 for v1'));
  });

  it('formats conversation history in template', async () => {
    const registry = new TemplateRegistry();
    registry.register({
      agentId: 'conv-agent',
      version: '1.0.0',
      sections: [
        { id: 'conv', role: 'system', template: '## History\n{{conversationSummary}}', condition: 'hasConversation' },
        { id: 'user', role: 'user', priority: 100, template: '{{input}}' }
      ]
    });
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: {
        ...createMinimalContext(),
        agentId: 'conv-agent',
        conversation: {
          messages: [
            { role: 'user', content: 'Hi' },
            { role: 'assistant', content: 'Hello!' }
          ]
        }
      }
    });

    assert.ok(messages[0].content.includes('user: Hi'));
    assert.ok(messages[0].content.includes('assistant: Hello!'));
  });

  it('uses fallback when no template is registered', async () => {
    const registry = new TemplateRegistry();
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: createMinimalContext()
    });

    assert.equal(messages.length, 2);
    assert.equal(messages[0].role, 'system');
    assert.equal(messages[1].role, 'user');
    assert.equal(messages[1].content, 'Hello agent');
  });

  it('formats project context in template', async () => {
    const registry = new TemplateRegistry();
    registry.register({
      agentId: 'proj-agent',
      version: '1.0.0',
      sections: [
        { id: 'project', role: 'system', template: '## Project\n{{project.name}} on {{project.branch}}', condition: 'hasProject' },
        { id: 'user', role: 'user', priority: 100, template: '{{input}}' }
      ]
    });
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: {
        ...createMinimalContext(),
        agentId: 'proj-agent',
        project: { name: 'ReplexAgent', branch: 'main' }
      }
    });

    assert.ok(messages[0].content.includes('ReplexAgent'));
    assert.ok(messages[0].content.includes('main'));
  });

  it('applies default variable values from template', async () => {
    const registry = new TemplateRegistry();
    registry.register({
      agentId: 'defaults-agent',
      version: '1.0.0',
      defaults: { agentName: 'Default Bot', maxItems: 5 },
      sections: [
        { id: 'system', role: 'system', template: 'You are {{agentName}}, max {{maxItems}} items.' },
        { id: 'user', role: 'user', priority: 100, template: '{{input}}' }
      ]
    });
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const messages = await builder.build({
      context: { ...createMinimalContext(), agentId: 'defaults-agent' }
    });

    assert.equal(messages[0].content, 'You are Default Bot, max 5 items.');
  });

  it('truncates long memory values', async () => {
    const registry = new TemplateRegistry();
    registry.register({
      agentId: 'long-mem-agent',
      version: '1.0.0',
      sections: [
        { id: 'memory', role: 'system', template: '{{memorySummary}}', condition: 'hasMemory' },
        { id: 'user', role: 'user', priority: 100, template: '{{input}}' }
      ]
    });
    const builder = new DefaultPromptBuilder({ templateRegistry: registry, logger });

    const longValue = 'x'.repeat(300);
    const messages = await builder.build({
      context: { ...createMinimalContext(), agentId: 'long-mem-agent' },
      memory: { records: [{ type: 'report', value: longValue }] }
    });

    assert.ok(messages[0].content.length < 300);
    assert.ok(messages[0].content.includes('...'));
  });
});
