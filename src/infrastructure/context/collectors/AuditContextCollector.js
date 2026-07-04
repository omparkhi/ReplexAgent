import { asArray, asOptionalString, asRecord } from '../../../application/context/contextGuards.js';

export class AuditContextCollector {
  constructor() {
    this.name = 'audit';
  }

  /**
   * @param {import('../../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @returns {Promise<import('../../../domain/interfaces/context.interface.js').ContextCollectorResult>}
   */
  async collect(input) {
    const source = asRecord(input.metadata?.audit);
    const events = asArray(source.events).filter(asRecord);
    const permissions = asArray(source.permissions).filter((permission) => typeof permission === 'string');

    /** @type {import('../../../domain/interfaces/context.interface.js').AuditContext} */
    const audit = {
      sessionId: asOptionalString(source.sessionId),
      actorId: asOptionalString(source.actorId),
      permissions,
      events,
      metadata: asRecord(source.metadata)
    };

    return Object.keys(source).length > 0
      ? { context: { audit } }
      : { context: {}, reason: 'No audit context provided' };
  }
}
