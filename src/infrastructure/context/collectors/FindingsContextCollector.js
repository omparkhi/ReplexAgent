import { asArray, asOptionalString, asRecord } from '../../../application/context/contextGuards.js';

const severities = new Set(['info', 'low', 'medium', 'high', 'critical']);

export class FindingsContextCollector {
  constructor() {
    this.name = 'findings';
  }

  /**
   * @param {import('../../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @returns {Promise<import('../../../domain/interfaces/context.interface.js').ContextCollectorResult>}
   */
  async collect(input) {
    const findings = asArray(input.metadata?.findings)
      .filter(asRecord)
      .map((finding, index) => ({
        id: asOptionalString(finding.id) ?? `finding-${index + 1}`,
        title: asOptionalString(finding.title) ?? 'Untitled finding',
        severity: typeof finding.severity === 'string' && severities.has(finding.severity) ? finding.severity : 'info',
        description: asOptionalString(finding.description),
        metadata: asRecord(finding.metadata)
      }));

    return findings.length > 0
      ? { context: { findings } }
      : { context: {}, reason: 'No findings context provided' };
  }
}
