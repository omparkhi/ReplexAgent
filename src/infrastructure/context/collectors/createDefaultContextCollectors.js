import { AuditContextCollector } from './AuditContextCollector.js';
import { BusinessRulesContextCollector } from './BusinessRulesContextCollector.js';
import { ConversationContextCollector } from './ConversationContextCollector.js';
import { FindingsContextCollector } from './FindingsContextCollector.js';
import { MetadataContextCollector } from './MetadataContextCollector.js';
import { ProjectContextCollector } from './ProjectContextCollector.js';
import { UserSettingsContextCollector } from './UserSettingsContextCollector.js';
import { WebsiteContextCollector } from './WebsiteContextCollector.js';

/**
 * @returns {import('../../../domain/interfaces/context.interface.js').ContextCollector[]}
 */
export function createDefaultContextCollectors() {
  return [
    new MetadataContextCollector(),
    new ProjectContextCollector(),
    new AuditContextCollector(),
    new WebsiteContextCollector(),
    new FindingsContextCollector(),
    new UserSettingsContextCollector(),
    new ConversationContextCollector(),
    new BusinessRulesContextCollector()
  ];
}
