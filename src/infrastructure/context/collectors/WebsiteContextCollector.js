import { asOptionalString, asRecord } from '../../../application/context/contextGuards.js';

export class WebsiteContextCollector {
  constructor() {
    this.name = 'website';
  }

  /**
   * @param {import('../../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @returns {Promise<import('../../../domain/interfaces/context.interface.js').ContextCollectorResult>}
   */
  async collect(input) {
    const source = asRecord(input.metadata?.website);
    /** @type {import('../../../domain/interfaces/context.interface.js').WebsiteContext} */
    const website = {
      url: asOptionalString(source.url),
      title: asOptionalString(source.title),
      metadata: asRecord(source.metadata)
    };

    return Object.keys(source).length > 0
      ? { context: { website } }
      : { context: {}, reason: 'No website context provided' };
  }
}
