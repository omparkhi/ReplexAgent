import { asRecord, asOptionalString } from '../../../application/context/contextGuards.js';

export class UserSettingsContextCollector {
  constructor() {
    this.name = 'user-settings';
  }

  /**
   * @param {import('../../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @returns {Promise<import('../../../domain/interfaces/context.interface.js').ContextCollectorResult>}
   */
  async collect(input) {
    const source = asRecord(input.metadata?.userSettings);
    /** @type {import('../../../domain/interfaces/context.interface.js').UserSettingsContext} */
    const userSettings = {
      locale: asOptionalString(source.locale),
      timezone: asOptionalString(source.timezone),
      preferences: asRecord(source.preferences)
    };

    return Object.keys(source).length > 0
      ? { context: { userSettings } }
      : { context: {}, reason: 'No user settings context provided' };
  }
}
