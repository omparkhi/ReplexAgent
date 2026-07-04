/**
 * @typedef {'markdown' | 'html' | 'json'} ReportFormat
 */

/**
 * @typedef {'executive' | 'developer' | 'business' | 'roadmap'} ReportSection
 */

/**
 * @typedef {object} ReportInput
 * @property {string} auditReportJson - AuditReport JSON string from WebsiteAuditAgent
 * @property {ReportFormat[]} [formats] - Output formats (default: ['markdown', 'html', 'json'])
 * @property {ReportSection[]} [sections] - Sections to include (default: all)
 * @property {Record<string, unknown>} [metadata] - Additional report metadata
 */

/**
 * @typedef {object} ConfidenceScore
 * @property {number} score - 0-1 confidence level
 * @property {string} rationale - Why this confidence level
 * @property {string[]} verifiedDataPoints - Data points used for verification
 * @property {string[]} excludedDataPoints - Data points excluded (hallucinations, unverified)
 */

/**
 * @typedef {object} ExecutiveReportSection
 * @property {string} title
 * @property {string} overview
 * @property {string} overallRisk
 * @property {number} totalFindings
 * @property {Record<string, number>} bySeverity
 * @property {Record<string, number>} byCategory
 * @property {string} topAction
 * @property {string} estimatedTimeline
 * @property {ConfidenceScore} confidence
 */

/**
 * @typedef {object} DeveloperReportSection
 * @property {string} title
 * @property {string} overview
 * @property {Array<{name: string, count: number, maxSeverity: string, findings: Array<{id: string, title: string, severity: string, recommendation: string}>}>} groups
 * @property {string} technicalDebt
 * @property {string[]} quickWins
 * @property {ConfidenceScore} confidence
 */

/**
 * @typedef {object} BusinessReportSection
 * @property {string} title
 * @property {string} overview
 * @property {number} totalEffortHours
 * @property {number} estimatedCost
 * @property {Array<{findingId: string, title: string, businessImpact: string, effort: string, effortHours: number, priorityScore: number}>} impactSummary
 * @property {string} roi
 * @property {ConfidenceScore} confidence
 */

/**
 * @typedef {object} RoadmapPhase
 * @property {string} name - Phase name (e.g., "Phase 1: Critical Fixes")
 * @property {string} description
 * @property {string} timeframe
 * @property {Array<{findingId: string, title: string, action: string, effort: string, effortHours: number, owner?: string, steps?: string[]}>} items
 * @property {number} totalHours
 * @property {ConfidenceScore} confidence
 */

/**
 * @typedef {object} RoadmapReportSection
 * @property {string} title
 * @property {string} overview
 * @property {RoadmapPhase[]} phases
 * @property {number} totalEstimatedHours
 * @property {string} estimatedTimeline
 * @property {ConfidenceScore} confidence
 */

/**
 * @typedef {object} ReportData
 * @property {string} url
 * @property {string} title
 * @property {string} generatedAt - ISO date string
 * @property {ExecutiveReportSection} executive
 * @property {DeveloperReportSection} developer
 * @property {BusinessReportSection} business
 * @property {RoadmapReportSection} roadmap
 * @property {ConfidenceScore} overallConfidence
 * @property {Record<string, unknown>} metadata
 */

/**
 * @typedef {object} RenderedReport
 * @property {ReportFormat} format
 * @property {string} content - Rendered content
 * @property {string} filename - Suggested filename
 * @property {string} mimeType - MIME type
 * @property {number} sizeBytes - Content size in bytes
 */

/**
 * @typedef {object} ReportAgentResult
 * @property {RenderedReport[]} reports
 * @property {ReportData} data
 * @property {ConfidenceScore} confidence
 * @property {Record<string, unknown>} metadata
 */

export {};
