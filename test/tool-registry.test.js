import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ToolRegistry } from '../src/infrastructure/registries/ToolRegistry.js';
import { ToolValidator } from '../src/infrastructure/tools/ToolValidator.js';
import { ToolExecutor } from '../src/infrastructure/tools/ToolExecutor.js';
import { PermissionChecker } from '../src/infrastructure/tools/PermissionChecker.js';
import { echoTool } from '../src/infrastructure/tools/builtin/index.js';

const logger = {
  info() {},
  warn() {},
  error() {},
  debug() {}
};

/** @returns {import('../src/domain/interfaces/tool.interface.js').Tool} */
function createTestTool(overrides = {}) {
  return {
    definition: {
      name: 'test-tool',
      description: 'A test tool',
      schema: {
        type: 'object',
        properties: {
          input: { type: 'string' }
        },
        required: ['input']
      },
      metadata: {
        timeout: 5000,
        tags: ['test']
      },
      ...overrides
    },
    async execute(input) {
      return { echo: input.args?.input };
    }
  };
}

describe('ToolValidator', () => {
  const validator = new ToolValidator();

  it('accepts a valid tool definition', () => {
    validator.validateDefinition(createTestTool());
  });

  it('rejects tool without definition', () => {
    assert.throws(
      () => validator.validateDefinition(/** @type {any} */ ({ execute: async () => {} })),
      /definition/
    );
  });

  it('rejects tool without execute function', () => {
    assert.throws(
      () => validator.validateDefinition(/** @type {any} */ ({ definition: { name: 'x', description: 'y' } })),
      /execute/
    );
  });

  it('rejects invalid tool name format', () => {
    assert.throws(
      () => validator.validateDefinition(createTestTool({ name: 'Invalid Name!' })),
      /kebab-case/
    );
  });

  it('rejects tool without description', () => {
    assert.throws(
      () => validator.validateDefinition(createTestTool({ description: '' })),
      /description/
    );
  });

  it('validates required input fields', () => {
    const tool = createTestTool();
    assert.throws(
      () => validator.validateInput(tool, {}),
      /requires missing field: input/
    );
  });

  it('validates input field types', () => {
    const tool = createTestTool();
    assert.throws(
      () => validator.validateInput(tool, { input: 123 }),
      /must be of type string/
    );
  });

  it('accepts valid input', () => {
    const tool = createTestTool();
    validator.validateInput(tool, { input: 'hello' });
  });

  it('accepts tool without schema', () => {
    const tool = createTestTool({ schema: undefined });
    validator.validateDefinition(tool);
    validator.validateInput(tool, { anything: 'goes' });
  });

  it('validates metadata timeout', () => {
    assert.throws(
      () => validator.validateDefinition(createTestTool({
        metadata: { timeout: -1 }
      })),
      /timeout must be a positive number/
    );
  });

  it('validates metadata retry config', () => {
    assert.throws(
      () => validator.validateDefinition(createTestTool({
        metadata: { retry: { maxAttempts: -1 } }
      })),
      /maxAttempts must be a non-negative number/
    );
  });

  it('validates metadata permissions is array', () => {
    assert.throws(
      () => validator.validateDefinition(createTestTool({
        metadata: { permissions: 'not-an-array' }
      })),
      /permissions must be an array/
    );
  });
});

describe('PermissionChecker', () => {
  const checker = new PermissionChecker({ logger });

  it('allows execution when no permissions required', () => {
    checker.check(createTestTool());
  });

  it('allows execution when caller has required permission', () => {
    const tool = createTestTool({
      metadata: { permissions: ['tools:execute'] }
    });
    checker.check(tool, { permissions: ['tools:execute', 'read'] });
  });

  it('throws when caller lacks required permission', () => {
    const tool = createTestTool({
      metadata: { permissions: ['admin:write'] }
    });
    assert.throws(
      () => checker.check(tool, { permissions: ['read'] }),
      /requires permissions/
    );
  });

  it('throws when caller has no permissions', () => {
    const tool = createTestTool({
      metadata: { permissions: ['secret'] }
    });
    assert.throws(
      () => checker.check(tool),
      /requires permissions/
    );
  });
});

describe('ToolExecutor', () => {
  const executor = new ToolExecutor({ logger, defaultTimeout: 5000 });

  it('executes tool and returns success result', async () => {
    const tool = createTestTool();
    const result = await executor.execute(tool, { name: 'test-tool', args: { input: 'hello' } });

    assert.equal(result.metadata.success, true);
    const data = /** @type {Record<string, unknown>} */ (result.data);
    assert.equal(data.echo, 'hello');
    assert.ok(result.metadata.durationMs >= 0);
    assert.equal(result.metadata.attempt, 1);
  });

  it('returns failure result when tool throws', async () => {
    const tool = createTestTool();
    tool.execute = async () => { throw new Error('boom'); };
    const result = await executor.execute(tool, { name: 'test-tool' });

    assert.equal(result.metadata.success, false);
    assert.equal(result.data, null);
    assert.ok(result.metadata.error?.includes('boom'));
  });

  it('retries on failure', async () => {
    let attempts = 0;
    const tool = createTestTool();
    tool.definition.metadata = { retry: { maxAttempts: 2, delayMs: 10, exponentialBackoff: false } };
    tool.execute = async () => {
      attempts++;
      if (attempts < 3) throw new Error(`fail-${attempts}`);
      return { success: true };
    };

    const result = await executor.execute(tool, { name: 'test-tool' });
    assert.equal(result.metadata.success, true);
    assert.equal(result.metadata.attempt, 3);
    assert.equal(attempts, 3);
  });

  it('times out when tool exceeds timeout', async () => {
    const tool = createTestTool();
    tool.definition.metadata = { timeout: 50 };
    tool.execute = () => new Promise((resolve) => setTimeout(resolve, 200));

    const result = await executor.execute(tool, { name: 'test-tool' });
    assert.equal(result.metadata.success, false);
    assert.ok(result.metadata.error?.includes('timed out'));
  });

  it('normalizes result from non-object return', async () => {
    const tool = createTestTool();
    tool.execute = async () => 'simple string result';

    const result = await executor.execute(tool, { name: 'test-tool' });
    assert.equal(result.metadata.success, true);
    assert.equal(result.data, 'simple string result');
  });

  it('calculates exponential backoff delay', () => {
    const delay0 = executor.calculateDelay({ delayMs: 1000, exponentialBackoff: true }, 1);
    const delay1 = executor.calculateDelay({ delayMs: 1000, exponentialBackoff: true }, 2);
    const delay2 = executor.calculateDelay({ delayMs: 1000, exponentialBackoff: true }, 3);

    assert.equal(delay0, 1000);
    assert.equal(delay1, 2000);
    assert.equal(delay2, 4000);
  });

  it('caps delay at maxDelayMs', () => {
    const delay = executor.calculateDelay({ delayMs: 1000, maxDelayMs: 3000, exponentialBackoff: true }, 10);
    assert.equal(delay, 3000);
  });

  it('uses fixed delay when exponentialBackoff is false', () => {
    const delay = executor.calculateDelay({ delayMs: 500, exponentialBackoff: false }, 5);
    assert.equal(delay, 500);
  });
});

describe('ToolRegistry', () => {
  it('registers and retrieves tools', () => {
    const registry = new ToolRegistry({ logger });
    registry.register(createTestTool());

    assert.equal(registry.has('test-tool'), true);
    assert.equal(registry.get('test-tool').definition.name, 'test-tool');
  });

  it('throws NotFoundError for missing tool', () => {
    const registry = new ToolRegistry({ logger });
    assert.throws(() => registry.get('nonexistent'), /Tool not found/);
  });

  it('lists tool definitions', () => {
    const registry = new ToolRegistry({ logger });
    registry.register(createTestTool());
    registry.register(createTestTool({ name: 'other-tool', description: 'Other' }));

    const list = registry.list();
    assert.equal(list.length, 2);
    assert.ok(list.some((t) => t.name === 'test-tool'));
    assert.ok(list.some((t) => t.name === 'other-tool'));
  });

  it('filters by tags', () => {
    const registry = new ToolRegistry({ logger });
    registry.register(createTestTool({ name: 'a', metadata: { tags: ['web', 'api'] } }));
    registry.register(createTestTool({ name: 'b', metadata: { tags: ['db'] } }));

    const filtered = registry.list({ tags: ['web'] });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'a');
  });

  it('filters by permission', () => {
    const registry = new ToolRegistry({ logger });
    registry.register(createTestTool({ name: 'a', metadata: { permissions: ['admin'] } }));
    registry.register(createTestTool({ name: 'b', metadata: { permissions: ['user'] } }));

    const filtered = registry.list({ permission: 'admin' });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'a');
  });

  it('unregisters tools', () => {
    const registry = new ToolRegistry({ logger });
    registry.register(createTestTool());
    assert.equal(registry.has('test-tool'), true);

    const deleted = registry.unregister('test-tool');
    assert.equal(deleted, true);
    assert.equal(registry.has('test-tool'), false);
  });

  it('returns false when unregistering nonexistent tool', () => {
    const registry = new ToolRegistry({ logger });
    assert.equal(registry.unregister('nope'), false);
  });

  it('executes tool with validation', async () => {
    const registry = new ToolRegistry({ logger });
    registry.register(createTestTool());

    const result = await registry.execute({ name: 'test-tool', args: { input: 'test' } });
    assert.equal(result.metadata.success, true);
    const data = /** @type {Record<string, unknown>} */ (result.data);
    assert.equal(data.echo, 'test');
  });

  it('validates input on execute', async () => {
    const registry = new ToolRegistry({ logger });
    registry.register(createTestTool());

    await assert.rejects(
      () => registry.execute({ name: 'test-tool', args: {} }),
      /requires missing field/
    );
  });

  it('checks permissions on execute', async () => {
    const registry = new ToolRegistry({ logger, config: { enablePermissions: true } });
    registry.register(createTestTool({
      name: 'secret-tool',
      metadata: { permissions: ['admin'] }
    }));

    await assert.rejects(
      () => registry.execute({ name: 'secret-tool' }, { permissions: ['user'] }),
      /requires permissions/
    );
  });

  it('skips permissions when disabled', async () => {
    const registry = new ToolRegistry({ logger, config: { enablePermissions: false } });
    registry.register(createTestTool({
      name: 'open-tool',
      metadata: { permissions: ['admin'] }
    }));

    const result = await registry.execute({ name: 'open-tool' });
    assert.equal(result.metadata.success, true);
  });

  it('reports tool count via size', () => {
    const registry = new ToolRegistry({ logger });
    assert.equal(registry.size, 0);
    registry.register(createTestTool({ name: 'a' }));
    registry.register(createTestTool({ name: 'b' }));
    assert.equal(registry.size, 2);
  });

  it('converts to MCP format', () => {
    const registry = new ToolRegistry({ logger });
    registry.register(createTestTool());

    const mcp = registry.toMcp('test-tool');
    assert.equal(mcp?.name, 'test-tool');
    assert.equal(mcp?.description, 'A test tool');
    assert.ok(mcp?.inputSchema);
  });

  it('lists all tools in MCP format', () => {
    const registry = new ToolRegistry({ logger });
    registry.register(createTestTool({ name: 'a' }));
    registry.register(createTestTool({ name: 'b' }));

    const mcpList = registry.listMcp();
    assert.equal(mcpList.length, 2);
  });

  it('registers echo builtin tool', () => {
    const registry = new ToolRegistry({ logger });
    registry.register(echoTool);

    assert.equal(registry.has('echo'), true);
    const def = registry.get('echo').definition;
    assert.equal(def.name, 'echo');
    assert.ok(def.description);
  });

  it('executes echo builtin tool', async () => {
    const registry = new ToolRegistry({ logger });
    registry.register(echoTool);

    const result = await registry.execute({ name: 'echo', args: { message: 'hi' } });
    assert.equal(result.metadata.success, true);
    const data = /** @type {Record<string, unknown>} */ (result.data);
    assert.equal(data.message, 'hi');
    assert.equal(data.echo, true);
  });

  it('disables validation when configured', () => {
    const registry = new ToolRegistry({ logger, config: { validateOnRegister: false } });
    registry.register(/** @type {any} */ ({
      definition: { name: 'bad-tool', description: 'no execute' },
      notExecute: async () => {}
    }));
    assert.equal(registry.has('bad-tool'), true);
  });
});
