import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ContextEngine } from '../src/application/context/ContextEngine.js';
import { DefaultContextProjector } from '../src/application/context/DefaultContextProjector.js';
import { createDefaultContextCollectors } from '../src/infrastructure/context/collectors/createDefaultContextCollectors.js';

const logger = {
  info() {},
  warn() {},
  error() {},
  debug() {}
};

describe('ContextEngine', () => {
  it('assembles an AgentContext from supported context sections', async () => {
    const engine = new ContextEngine({
      collectors: createDefaultContextCollectors(),
      projector: new DefaultContextProjector(),
      logger
    });

    const context = await engine.create({
      agentId: 'repo-agent',
      input: 'inspect repository',
      conversationId: 'conversation-1',
      metadata: {
        traceId: 'trace-1',
        project: {
          id: 'project-1',
          name: 'Runtime',
          branch: 'main'
        },
        audit: {
          actorId: 'user-1',
          permissions: ['read'],
          events: [{ type: 'request.created' }]
        },
        website: {
          url: 'https://example.test',
          title: 'Example'
        },
        findings: [
          { id: 'finding-1', title: 'Missing test', severity: 'medium' }
        ],
        userSettings: {
          locale: 'en-US',
          timezone: 'UTC',
          preferences: { verbosity: 'concise' }
        },
        conversation: {
          messages: [{ role: 'user', content: 'Please inspect this repo' }]
        },
        businessRules: [
          { id: 'rule-1', description: 'Do not modify generated files' }
        ]
      }
    });

    assert.equal(context.agentId, 'repo-agent');
    assert.equal(context.input, 'inspect repository');
    assert.equal(context.metadata.traceId, 'trace-1');
    assert.equal(context.project.name, 'Runtime');
    assert.equal(context.audit.actorId, 'user-1');
    assert.equal(context.website.url, 'https://example.test');
    assert.equal(context.findings[0].severity, 'medium');
    assert.equal(context.userSettings.preferences.verbosity, 'concise');
    assert.equal(context.conversation.id, 'conversation-1');
    assert.equal(context.conversation.messages[0].content, 'Please inspect this repo');
    assert.equal(context.businessRules[0].enabled, true);
    assert.equal(context.assembly.version, 'agent-context.v1');
    assert.equal(context.assembly.sources.every((source) => source.status === 'collected'), true);
  });

  it('returns stable defaults when optional sections are absent', async () => {
    const engine = new ContextEngine({
      collectors: createDefaultContextCollectors(),
      projector: new DefaultContextProjector(),
      logger
    });

    const context = await engine.create({
      agentId: 'repo-agent',
      input: 'hello'
    });

    assert.deepEqual(context.project, {});
    assert.deepEqual(context.audit.events, []);
    assert.deepEqual(context.website, {});
    assert.deepEqual(context.findings, []);
    assert.deepEqual(context.userSettings.preferences, {});
    assert.deepEqual(context.conversation.messages, []);
    assert.deepEqual(context.businessRules, []);
    assert.equal(context.assembly.sources.length, 8);
  });
});
