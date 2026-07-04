import { ToolValidationError } from '../../domain/errors/ToolValidationError.js';

/**
 * Validates tool definitions and execution inputs.
 */
export class ToolValidator {
  /**
   * Validate a tool definition during registration.
   * @param {import('../../domain/interfaces/tool.interface.js').Tool} tool
   * @throws {ToolValidationError}
   */
  validateDefinition(tool) {
    if (!tool || typeof tool !== 'object') {
      throw new ToolValidationError('Tool must be an object');
    }

    const { definition, execute } = tool;

    if (!definition || typeof definition !== 'object') {
      throw new ToolValidationError('Tool must have a definition object');
    }

    if (!definition.name || typeof definition.name !== 'string') {
      throw new ToolValidationError('Tool definition must have a non-empty name string');
    }

    if (!/^[a-z0-9][a-z0-9\-]*$/.test(definition.name)) {
      throw new ToolValidationError(
        `Tool name "${definition.name}" must be kebab-case (lowercase alphanumeric and hyphens)`,
        { toolName: definition.name }
      );
    }

    if (!definition.description || typeof definition.description !== 'string') {
      throw new ToolValidationError(
        `Tool "${definition.name}" must have a non-empty description`,
        { toolName: definition.name }
      );
    }

    if (typeof execute !== 'function') {
      throw new ToolValidationError(
        `Tool "${definition.name}" must have an execute function`,
        { toolName: definition.name }
      );
    }

    if (definition.schema !== undefined) {
      this.validateSchema(definition.schema, definition.name);
    }

    if (definition.metadata !== undefined) {
      this.validateMetadata(definition.metadata, definition.name);
    }
  }

  /**
   * Validate a JSON Schema object.
   * @param {Record<string, unknown>} schema
   * @param {string} toolName
   * @throws {ToolValidationError}
   */
  validateSchema(schema, toolName) {
    if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
      throw new ToolValidationError(
        `Tool "${toolName}" schema must be a JSON Schema object`,
        { toolName }
      );
    }

    if (schema.type !== undefined && typeof schema.type !== 'string') {
      throw new ToolValidationError(
        `Tool "${toolName}" schema type must be a string`,
        { toolName }
      );
    }
  }

  /**
   * Validate tool metadata.
   * @param {import('../../domain/interfaces/tool.interface.js').ToolMetadata} metadata
   * @param {string} toolName
   * @throws {ToolValidationError}
   */
  validateMetadata(metadata, toolName) {
    if (typeof metadata !== 'object' || metadata === null) {
      throw new ToolValidationError(
        `Tool "${toolName}" metadata must be an object`,
        { toolName }
      );
    }

    if (metadata.timeout !== undefined) {
      if (typeof metadata.timeout !== 'number' || metadata.timeout <= 0) {
        throw new ToolValidationError(
          `Tool "${toolName}" timeout must be a positive number`,
          { toolName }
        );
      }
    }

    if (metadata.retry !== undefined) {
      const { maxAttempts, delayMs, maxDelayMs } = metadata.retry;
      if (maxAttempts !== undefined && (typeof maxAttempts !== 'number' || maxAttempts < 0)) {
        throw new ToolValidationError(
          `Tool "${toolName}" retry.maxAttempts must be a non-negative number`,
          { toolName }
        );
      }
      if (delayMs !== undefined && (typeof delayMs !== 'number' || delayMs < 0)) {
        throw new ToolValidationError(
          `Tool "${toolName}" retry.delayMs must be a non-negative number`,
          { toolName }
        );
      }
      if (maxDelayMs !== undefined && (typeof maxDelayMs !== 'number' || maxDelayMs < 0)) {
        throw new ToolValidationError(
          `Tool "${toolName}" retry.maxDelayMs must be a non-negative number`,
          { toolName }
        );
      }
    }

    if (metadata.permissions !== undefined) {
      if (!Array.isArray(metadata.permissions)) {
        throw new ToolValidationError(
          `Tool "${toolName}" permissions must be an array of strings`,
          { toolName }
        );
      }
      for (const perm of metadata.permissions) {
        if (typeof perm !== 'string') {
          throw new ToolValidationError(
            `Tool "${toolName}" permission entries must be strings`,
            { toolName }
          );
        }
      }
    }
  }

  /**
   * Validate execution input args against a tool's schema (basic structural check).
   * @param {import('../../domain/interfaces/tool.interface.js').Tool} tool
   * @param {Record<string, unknown>} [args]
   * @throws {ToolValidationError}
   */
  validateInput(tool, args) {
    const schema = tool.definition.schema;
    if (!schema) return;

    if (args !== undefined && typeof args !== 'object') {
      throw new ToolValidationError(
        `Tool "${tool.definition.name}" args must be an object`,
        { toolName: tool.definition.name }
      );
    }

    const required = /** @type {string[]} */ (schema.required);
    if (Array.isArray(required) && args) {
      for (const field of required) {
        if (!(field in args)) {
          throw new ToolValidationError(
            `Tool "${tool.definition.name}" requires missing field: ${field}`,
            { toolName: tool.definition.name, details: { missingField: field } }
          );
        }
      }
    }

    const properties = /** @type {Record<string, unknown>} */ (schema.properties);
    if (properties && typeof properties === 'object' && args) {
      for (const [key, value] of Object.entries(args)) {
        if (key in properties) {
          const propSchema = /** @type {Record<string, unknown>} */ (properties[key]);
          if (propSchema && typeof propSchema === 'object') {
            const expectedType = propSchema.type;
            if (typeof expectedType === 'string') {
              const actualType = typeof value;
              if (expectedType === 'array' && !Array.isArray(value)) {
                throw new ToolValidationError(
                  `Tool "${tool.definition.name}" field "${key}" must be an array`,
                  { toolName: tool.definition.name, details: { field: key, expected: 'array', actual: actualType } }
                );
              } else if (expectedType !== 'array' && expectedType !== actualType) {
                throw new ToolValidationError(
                  `Tool "${tool.definition.name}" field "${key}" must be of type ${expectedType}`,
                  { toolName: tool.definition.name, details: { field: key, expected: expectedType, actual: actualType } }
                );
              }
            }
          }
        }
      }
    }
  }
}
