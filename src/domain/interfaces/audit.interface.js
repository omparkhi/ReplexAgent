/**
 * @typedef {'critical' | 'high' | 'medium' | 'low' | 'info'} FindingSeverity
 */

/**
 * @typedef {'seo' | 'accessibility' | 'performance' | 'security' | 'best-practice'} FindingCategory
 */

/**
 * @typedef {'content' | 'technical' | 'structure' | 'metadata' | 'performance' | 'compliance'} FindingType
 */

/**
 * @typedef {object} AuditFinding
 * @property {string} id - Unique finding identifier
 * @property {string} title - Short title
 * @property {string} description - Detailed description
 * @property {FindingSeverity} severity - Severity level
 * @property {FindingCategory} category - Audit category
 * @property {FindingType} type - Finding type
 * @property {string} [element] - Affected HTML element or selector
 * @property {string} [url] - Affected URL
 * @property {string} [rule] - Rule or guideline reference
 * @property {string} [recommendation] - How to fix
 * @property {Record<string, unknown>} [metadata] - Additional data
 */

/**
 * @typedef {object} AuditInput
 * @property {string} url - Website URL audited
 * @property {string} [title] - Website title
 * @property {AuditFinding[]} findings - All audit findings
 * @property {Record<string, unknown>} [metadata] - Additional audit metadata
 * @property {string} [auditor] - Who/what performed the audit
 * @property {Date | string} [auditedAt] - When the audit was performed
 */

/**
 * @typedef {object} FindingGroup
 * @property {string} id - Group identifier
 * @property {string} name - Group name
 * @property {FindingCategory} category - Category
 * @property {AuditFinding[]} findings - Findings in this group
 * @property {FindingSeverity} maxSeverity - Highest severity in group
 * @property {number} count - Number of findings
 */

/**
 * @typedef {object} ImpactAssessment
 * @property {string} findingId - Finding identifier
 * @property {'critical' | 'high' | 'medium' | 'low' | 'negligible'} businessImpact
 * @property {'trivial' | 'easy' | 'moderate' | 'difficult' | 'complex'} effort
 * @property {number} effortHours - Estimated hours
 * @property {string} rationale - Why this assessment
 * @property {string[]} [dependencies] - Dependent finding IDs
 */

/**
 * @typedef {object} PriorityItem
 * @property {string} findingId
 * @property {string} title
 * @property {FindingSeverity} severity
 * @property {FindingCategory} category
 * @property {'critical' | 'high' | 'medium' | 'low' | 'negligible'} businessImpact
 * @property {'trivial' | 'easy' | 'moderate' | 'difficult' | 'complex'} effort
 * @property {number} priorityScore - Computed priority (higher = fix first)
 * @property {number} rank - Position in priority order
 */

/**
 * @typedef {object} ActionItem
 * @property {string} findingId
 * @property {string} title
 * @property {string} action - Specific action to take
 * @property {FindingSeverity} severity
 * @property {'trivial' | 'easy' | 'moderate' | 'difficult' | 'complex'} effort
 * @property {number} effortHours
 * @property {string} [owner] - Suggested team/role
 * @property {string} [deadline] - Suggested deadline category
 * @property {string[]} [steps] - Step-by-step implementation
 */

/**
 * @typedef {object} ExecutiveSummary
 * @property {string} overview - High-level overview
 * @property {number} totalFindings
 * @property {Record<FindingSeverity, number>} bySeverity
 * @property {Record<FindingCategory, number>} byCategory
 * @property {string} overallRisk - Risk description
 * @property {string} topAction - Most important action
 * @property {string} [estimatedTimeline] - Fix timeline estimate
 */

/**
 * @typedef {object} DeveloperSummary
 * @property {string} overview - Technical overview
 * @property {FindingGroup[]} groups - Grouped findings
 * @property {string} technicalDebt - Debt assessment
 * @property {string[]} quickWins - Easy fixes with high impact
 * @property {string[]} [techStackNotes] - Tech stack observations
 */

/**
 * @typedef {object} AuditReport
 * @property {ExecutiveSummary} executiveSummary
 * @property {DeveloperSummary} developerSummary
 * @property {PriorityItem[]} priorityMatrix
 * @property {ActionItem[]} actionPlan
 * @property {FindingGroup[]} findingGroups
 * @property {ImpactAssessment[]} impactAssessments
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} WebsiteAuditAgent
 * @property {(input: import('./agent.interface.js').AgentRunInput) => Promise<import('./agent.interface.js').AgentRunResult>} run
 */

export {};
