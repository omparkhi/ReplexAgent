import { asArray, asOptionalString, asRecord } from '../../../application/context/contextGuards.js';

export class BusinessRulesContextCollector {
  constructor() {
    this.name = 'business-rules';
  }

  /**
   * @param {import('../../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @returns {Promise<import('../../../domain/interfaces/context.interface.js').ContextCollectorResult>}
   */
  async collect(input) {
    const businessRules = asArray(input.metadata?.businessRules)
      .filter(asRecord)
      .map((rule, index) => ({
        id: asOptionalString(rule.id) ?? `business-rule-${index + 1}`,
        description: asOptionalString(rule.description) ?? '',
        enabled: typeof rule.enabled === 'boolean' ? rule.enabled : true,
        metadata: asRecord(rule.metadata)
      }))
      .filter((rule) => rule.description.length > 0);

    return businessRules.length > 0
      ? { context: { businessRules } }
      : { context: {}, reason: 'No business rules context provided' };
  }
}
