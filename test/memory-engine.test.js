import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../src/application/memory/MemoryEngine.js';
import { InMemoryStore } from '../src/infrastructure/memory/InMemoryStore.js';
import { ValidationError } from '../src/domain/errors/ValidationError.js';

const logger = {
  info() {},
  warn() {},
  error() {},
  debug() {}
};

function createEngine() {
  return new MemoryEngine({
    repository: new InMemoryStore(),
    logger
  });
}

describe('MemoryEngine', () => {
  it('saves and searches supported memory categories', async () => {
    const engine = createEngine();

    const saved = await engine.saveMemory({
      key: 'conversation-1',
      type: 'conversation_history',
      value: { message: 'hello' },
      namespace: 'workspace-1',
      agentId: 'runtime-agent',
      conversationId: 'thread-1',
      userId: 'user-1',
      tags: ['chat'],
      metadata: { title: 'Greeting' },
      vector: { indexName: 'future-index', externalId: 'conversation-1' }
    });

    const results = await engine.searchMemory({
      namespace: 'workspace-1',
      type: 'conversation_history',
      tags: ['chat'],
      text: 'hello'
    });

    assert.equal(saved.key, 'conversation-1');
    assert.equal(saved.type, 'conversation_history');
    assert.equal(saved.vector?.indexName, 'future-index');
    assert.equal(results.length, 1);
    assert.equal(results[0].metadata.title, 'Greeting');
  });

  it('returns recent memories and deletes by query', async () => {
    const engine = createEngine();

    await engine.saveMemory({ key: 'audit-1', type: 'previous_audit', value: 'audit', userId: 'user-1' });
    await engine.saveMemory({ key: 'recommendation-1', type: 'previous_recommendation', value: 'recommendation', userId: 'user-1' });

    const recent = await engine.getRecent({ userId: 'user-1', limit: 2 });
    const deleted = await engine.deleteMemory({ query: { userId: 'user-1' } });
    const remaining = await engine.searchMemory({ userId: 'user-1' });

    assert.equal(recent.length, 2);
    assert.equal(deleted.deletedCount, 2);
    assert.equal(remaining.length, 0);
  });

  it('throws ValidationError when saving without type', async () => {
    const engine = createEngine();

    await assert.rejects(
      () => engine.saveMemory(/** @type {any} */ ({ value: 'test' })),
      ValidationError
    );
  });

  it('throws ValidationError when saving without value', async () => {
    const engine = createEngine();

    await assert.rejects(
      () => engine.saveMemory(/** @type {any} */ ({ type: 'report' })),
      ValidationError
    );
  });

  it('throws ValidationError when deleting without key or query', async () => {
    const engine = createEngine();

    await assert.rejects(
      () => engine.deleteMemory(/** @type {any} */ ({})),
      ValidationError
    );
  });

  it('counts memories by type and namespace', async () => {
    const engine = createEngine();

    await engine.saveMemory({ key: 'c1', type: 'conversation_history', value: 'a', namespace: 'ws-1' });
    await engine.saveMemory({ key: 'c2', type: 'conversation_history', value: 'b', namespace: 'ws-1' });
    await engine.saveMemory({ key: 'r1', type: 'report', value: 'c', namespace: 'ws-2' });

    const stats = await engine.countMemory();

    assert.equal(stats.total, 3);
    assert.equal(stats.byType.conversation_history, 2);
    assert.equal(stats.byType.report, 1);
    assert.equal(stats.byNamespace['ws-1'], 2);
    assert.equal(stats.byNamespace['ws-2'], 1);
  });

  it('counts memories with filter', async () => {
    const engine = createEngine();

    await engine.saveMemory({ key: 'c1', type: 'conversation_history', value: 'a', namespace: 'ws-1' });
    await engine.saveMemory({ key: 'c2', type: 'conversation_history', value: 'b', namespace: 'ws-2' });
    await engine.saveMemory({ key: 'r1', type: 'report', value: 'c', namespace: 'ws-1' });

    const stats = await engine.countMemory({ namespace: 'ws-1' });

    assert.equal(stats.total, 2);
    assert.equal(stats.byType.conversation_history, 1);
    assert.equal(stats.byType.report, 1);
  });

  it('bulk saves multiple records', async () => {
    const engine = createEngine();

    const result = await engine.bulkSaveMemory({
      records: [
        { key: 'bulk-1', type: 'report', value: 'report 1' },
        { key: 'bulk-2', type: 'conversation_history', value: 'chat 2' },
        { key: 'bulk-3', type: 'preference', value: { theme: 'dark' } }
      ]
    });

    assert.equal(result.count, 3);
    assert.equal(result.saved.length, 3);
    assert.equal(result.saved[0].key, 'bulk-1');
    assert.equal(result.saved[1].key, 'bulk-2');
    assert.equal(result.saved[2].key, 'bulk-3');

    const all = await engine.searchMemory({});
    assert.equal(all.length, 3);
  });

  it('throws ValidationError for empty bulk save', async () => {
    const engine = createEngine();

    await assert.rejects(
      () => engine.bulkSaveMemory({ records: [] }),
      ValidationError
    );
  });

  it('get returns null for missing key', async () => {
    const engine = createEngine();
    const result = await engine.get('nonexistent');
    assert.equal(result, null);
  });

  it('get returns record for existing key', async () => {
    const engine = createEngine();
    await engine.saveMemory({ key: 'exists', type: 'preference', value: 'yes' });
    const result = await engine.get('exists');
    assert.equal(result?.key, 'exists');
    assert.equal(result?.value, 'yes');
  });

  it('delete by key removes single record', async () => {
    const engine = createEngine();
    await engine.saveMemory({ key: 'del-1', type: 'report', value: 'x' });
    await engine.saveMemory({ key: 'del-2', type: 'report', value: 'y' });

    await engine.delete('del-1');
    const remaining = await engine.searchMemory({});
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].key, 'del-2');
  });
});
