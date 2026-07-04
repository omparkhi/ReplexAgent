// @ts-nocheck
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer } from '../src/infrastructure/di/createContainer.js';
import { createApp } from '../src/presentation/http/app.js';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

/** @type {import('node:http').Server} */
let server;
/** @type {string} */
let baseUrl;

describe('agent runtime http api', () => {
  before(async () => {
    const app = createApp(createContainer());
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = /** @type {import('node:net').AddressInfo} */ (server.address());
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve(undefined));
    });
  });

  it('returns health status', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.environment, 'test');
  });

  it('lists registered agents', async () => {
    const response = await fetch(`${baseUrl}/api/agents`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.agents));
    assert.ok(body.agents.length >= 2);
    const agentIds = body.agents.map(a => a.id);
    assert.ok(agentIds.includes('runtime-agent'));
    assert.ok(agentIds.includes('website-audit-agent'));
  });

  it('runs the default orchestration agent', async () => {
    const response = await fetch(`${baseUrl}/api/agents/runtime-agent/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: 'hello runtime' })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.output, 'hello runtime');
    assert.equal(body.metadata.agentId, 'runtime-agent');
    assert.equal(typeof body.metadata.requestId, 'string');
  });

  it('exposes memory APIs', async () => {
    const saveResponse = await fetch(`${baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        key: 'report-1',
        type: 'report',
        value: { summary: 'weekly report' },
        namespace: 'workspace-1',
        tags: ['report'],
        metadata: { title: 'Weekly Report' }
      })
    });
    const saveBody = await saveResponse.json();

    const searchResponse = await fetch(`${baseUrl}/api/memory/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ namespace: 'workspace-1', type: 'report' })
    });
    const searchBody = await searchResponse.json();

    const recentResponse = await fetch(`${baseUrl}/api/memory/recent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ namespace: 'workspace-1', limit: 1 })
    });
    const recentBody = await recentResponse.json();

    const deleteResponse = await fetch(`${baseUrl}/api/memory/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'report-1' })
    });
    const deleteBody = await deleteResponse.json();

    assert.equal(saveResponse.status, 201);
    assert.equal(saveBody.memory.key, 'report-1');
    assert.equal(searchBody.memories.length, 1);
    assert.equal(recentBody.memories.length, 1);
    assert.equal(deleteBody.deletedCount, 1);
  });

  it('counts memories via API', async () => {
    await fetch(`${baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'count-a', type: 'report', value: 'a', namespace: 'count-ws' })
    });
    await fetch(`${baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'count-b', type: 'preference', value: 'b', namespace: 'count-ws' })
    });

    const countResponse = await fetch(`${baseUrl}/api/memory/count`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ namespace: 'count-ws' })
    });
    const countBody = await countResponse.json();

    assert.equal(countResponse.status, 200);
    assert.equal(countBody.stats.total, 2);
    assert.equal(countBody.stats.byType.report, 1);
    assert.equal(countBody.stats.byType.preference, 1);
    assert.equal(countBody.stats.byNamespace['count-ws'], 2);

    await fetch(`${baseUrl}/api/memory/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: { namespace: 'count-ws' } })
    });
  });

  it('bulk saves memories via API', async () => {
    const bulkResponse = await fetch(`${baseUrl}/api/memory/bulk`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        records: [
          { key: 'bulk-a', type: 'report', value: { item: 1 } },
          { key: 'bulk-b', type: 'conversation_history', value: { item: 2 } }
        ]
      })
    });
    const bulkBody = await bulkResponse.json();

    assert.equal(bulkResponse.status, 201);
    assert.equal(bulkBody.count, 2);
    assert.equal(bulkBody.saved.length, 2);

    await fetch(`${baseUrl}/api/memory/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: { filter: { key: 'bulk-a' } } })
    });
    await fetch(`${baseUrl}/api/memory/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: { filter: { key: 'bulk-b' } } })
    });
  });

  it('returns 400 for invalid memory save', async () => {
    const response = await fetch(`${baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value: 'missing type' })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('returns 400 for delete without key or query', async () => {
    const response = await fetch(`${baseUrl}/api/memory/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('returns 400 for empty bulk save', async () => {
    const response = await fetch(`${baseUrl}/api/memory/bulk`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ records: [] })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });
});
