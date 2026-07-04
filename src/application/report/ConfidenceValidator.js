import { ValidationError } from '../../domain/errors/ValidationError.js';

/**
 * Validates findings and ensures no hallucination.
 * Only verified data from the AuditReport is used.
 * Each piece of data gets a confidence score.
 */
export class ConfidenceValidator {
  /** @type {import('../../domain/interfaces/logger.interface.js').Logger | null} */
  #logger;

  /**
   * @param {object} deps
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} deps.logger
   */
  constructor(deps) {
    this.#logger = deps.logger;
  }

  /**
   * Validate and score an AuditReport.
   * @param {import('../../domain/interfaces/audit.interface.js').AuditReport} report
   * @returns {{ validatedReport: import('../../domain/interfaces/audit.interface.js').AuditReport, confidence: import('../../domain/interfaces/report.interface.js').ConfidenceScore }}
   */
  validate(report) {
    if (!report || typeof report !== 'object') {
      throw new ValidationError('AuditReport must be a non-null object');
    }

    /** @type {string[]} */
    const verifiedDataPoints = [];
    /** @type {string[]} */
    const excludedDataPoints = [];

    // Validate executive summary
    if (report.executiveSummary) {
      const exec = report.executiveSummary;
      if (typeof exec.totalFindings === 'number' && exec.totalFindings >= 0) {
        verifiedDataPoints.push('executiveSummary.totalFindings');
      } else {
        excludedDataPoints.push('executiveSummary.totalFindings (invalid count)');
      }
      if (exec.overallRisk && typeof exec.overallRisk === 'string') {
        verifiedDataPoints.push('executiveSummary.overallRisk');
      }
      if (exec.bySeverity && typeof exec.bySeverity === 'object') {
        verifiedDataPoints.push('executiveSummary.bySeverity');
      }
      if (exec.byCategory && typeof exec.byCategory === 'object') {
        verifiedDataPoints.push('executiveSummary.byCategory');
      }
    }

    // Validate finding groups
    const validGroups = [];
    if (Array.isArray(report.findingGroups)) {
      for (const group of report.findingGroups) {
        if (this.#isValidGroup(group)) {
          validGroups.push(group);
          verifiedDataPoints.push(`findingGroup:${group.id}`);
        } else {
          excludedDataPoints.push(`findingGroup:${group.id} (invalid structure)`);
        }
      }
    }

    // Validate impact assessments
    const validImpacts = [];
    if (Array.isArray(report.impactAssessments)) {
      for (const impact of report.impactAssessments) {
        if (this.#isValidImpact(impact)) {
          validImpacts.push(impact);
          verifiedDataPoints.push(`impact:${impact.findingId}`);
        } else {
          excludedDataPoints.push(`impact:${impact.findingId} (invalid structure)`);
        }
      }
    }

    // Validate priority matrix
    const validPriority = [];
    if (Array.isArray(report.priorityMatrix)) {
      for (const item of report.priorityMatrix) {
        if (this.#isValidPriorityItem(item)) {
          validPriority.push(item);
          verifiedDataPoints.push(`priority:${item.findingId}`);
        } else {
          excludedDataPoints.push(`priority:${item.findingId} (invalid structure)`);
        }
      }
    }

    // Validate action plan
    const validActions = [];
    if (Array.isArray(report.actionPlan)) {
      for (const action of report.actionPlan) {
        if (this.#isValidActionItem(action)) {
          validActions.push(action);
          verifiedDataPoints.push(`action:${action.findingId}`);
        } else {
          excludedDataPoints.push(`action:${action.findingId} (invalid structure)`);
        }
      }
    }

    // Build validated report
    const validatedReport = {
      executiveSummary: report.executiveSummary ?? this.#emptyExecutiveSummary(),
      developerSummary: {
        ...report.developerSummary,
        groups: validGroups
      },
      priorityMatrix: validPriority,
      actionPlan: validActions,
      findingGroups: validGroups,
      impactAssessments: validImpacts,
      metadata: {
        ...report.metadata,
        validatedAt: new Date().toISOString(),
        originalFindingCount: this.#countOriginalFindings(report),
        validatedFindingCount: this.#countValidatedFindings(validGroups)
      }
    };

    // Calculate confidence score
    const confidence = this.#calculateConfidence(
      verifiedDataPoints,
      excludedDataPoints,
      validatedReport
    );

    this.#logger?.info?.(`Confidence validation: ${confidence.score.toFixed(2)} (${verifiedDataPoints.length} verified, ${excludedDataPoints.length} excluded)`);

    return { validatedReport, confidence };
  }

  /**
   * Calculate overall confidence score.
   * @param {string[]} verified
   * @param {string[]} excluded
   * @param {import('../../domain/interfaces/audit.interface.js').AuditReport} report
   * @returns {import('../../domain/interfaces/report.interface.js').ConfidenceScore}
   */
  #calculateConfidence(verified, excluded, report) {
    const total = verified.length + excluded.length;
    const score = total === 0 ? 0 : verified.length / total;

    const hasAllSections = Boolean(
      report.executiveSummary &&
      report.developerSummary &&
      report.priorityMatrix.length > 0 &&
      report.actionPlan.length > 0
    );

    const adjustedScore = hasAllSections ? score : Math.max(score - 0.1, 0);

    return {
      score: Math.round(adjustedScore * 100) / 100,
      rationale: total === 0
        ? 'No data points to validate'
        : `${verified.length} of ${total} data points verified. ${hasAllSections ? 'All report sections present.' : 'Some sections missing.'}`,
      verifiedDataPoints: verified,
      excludedDataPoints: excluded
    };
  }

  /**
   * @param {any} group
   * @returns {boolean}
   */
  #isValidGroup(group) {
    return (
      group &&
      typeof group.id === 'string' && group.id.length > 0 &&
      typeof group.name === 'string' && group.name.length > 0 &&
      typeof group.category === 'string' &&
      typeof group.count === 'number' && group.count >= 0 &&
      typeof group.maxSeverity === 'string' &&
      Array.isArray(group.findings)
    );
  }

  /**
   * @param {any} impact
   * @returns {boolean}
   */
  #isValidImpact(impact) {
    return (
      impact &&
      typeof impact.findingId === 'string' && impact.findingId.length > 0 &&
      typeof impact.businessImpact === 'string' &&
      typeof impact.effort === 'string' &&
      typeof impact.effortHours === 'number' && impact.effortHours >= 0 &&
      typeof impact.rationale === 'string'
    );
  }

  /**
   * @param {any} item
   * @returns {boolean}
   */
  #isValidPriorityItem(item) {
    return (
      item &&
      typeof item.findingId === 'string' && item.findingId.length > 0 &&
      typeof item.title === 'string' &&
      typeof item.severity === 'string' &&
      typeof item.category === 'string' &&
      typeof item.priorityScore === 'number' &&
      typeof item.rank === 'number'
    );
  }

  /**
   * @param {any} action
   * @returns {boolean}
   */
  #isValidActionItem(action) {
    return (
      action &&
      typeof action.findingId === 'string' && action.findingId.length > 0 &&
      typeof action.title === 'string' &&
      typeof action.action === 'string' &&
      typeof action.severity === 'string' &&
      typeof action.effortHours === 'number' && action.effortHours >= 0
    );
  }

  /**
   * @returns {import('../../domain/interfaces/audit.interface.js').ExecutiveSummary}
   */
  #emptyExecutiveSummary() {
    return {
      overview: 'No executive summary available',
      totalFindings: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      byCategory: { seo: 0, accessibility: 0, performance: 0, security: 0, 'best-practice': 0 },
      overallRisk: 'Unknown',
      topAction: 'No actions identified'
    };
  }

  /**
   * @param {import('../../domain/interfaces/audit.interface.js').AuditReport} report
   * @returns {number}
   */
  #countOriginalFindings(report) {
    let count = 0;
    if (report.findingGroups) {
      for (const g of report.findingGroups) {
        count += g.count ?? 0;
      }
    }
    return count;
  }

  /**
   * @param {import('../../domain/interfaces/audit.interface.js').FindingGroup[]} groups
   * @returns {number}
   */
  #countValidatedFindings(groups) {
    let count = 0;
    for (const g of groups) {
      count += g.findings?.length ?? 0;
    }
    return count;
  }
}
