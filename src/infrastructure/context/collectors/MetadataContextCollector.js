import { asRecord } from '../../../application/context/contextGuards.js';

const reservedKeys = new Set([
  'project',
  'audit',
  'website',
  'findings',
  'userSettings',
  'conversation',
  'businessRules'
]);

export class MetadataContextCollector {
  constructor() {
    this.name = 'metadata';
  }

  /**
   * @param {import('../../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @returns {Promise<import('../../../domain/interfaces/context.interface.js').ContextCollectorResult>}
   */
  async collect(input) {
    const metadata = Object.fromEntries(
      Object.entries(asRecord(input.metadata)).filter(([key]) => !reservedKeys.has(key))
    );

    return Object.keys(metadata).length > 0
      ? { context: { metadata } }
      : { context: {}, reason: 'No supplemental metadata provided' };
  }
}
