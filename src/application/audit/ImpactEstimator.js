/**
 * @typedef {import('../../domain/interfaces/audit.interface.js').AuditFinding} AuditFinding
 * @typedef {import('../../domain/interfaces/audit.interface.js').ImpactAssessment} ImpactAssessment
 * @typedef {import('../../domain/interfaces/audit.interface.js').FindingSeverity} FindingSeverity
 * @typedef {import('../../domain/interfaces/audit.interface.js').FindingCategory} FindingCategory
 */

const SEVERITY_IMPACT_MAP = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'negligible'
};

const CATEGORY_EFFORT_MAP = {
  security: { base: 'moderate', hours: 8 },
  accessibility: { base: 'moderate', hours: 6 },
  performance: { base: 'easy', hours: 4 },
  seo: { base: 'easy', hours: 3 },
  'best-practice': { base: 'trivial', hours: 2 }
};

const TYPE_EFFORT_MODIFIER = {
  content: 1.0,
  technical: 1.5,
  structure: 1.2,
  metadata: 0.8,
  performance: 1.3,
  compliance: 1.1
};

const SEVERITY_EFFORT_HOURS = {
  critical: 2.0,
  high: 1.5,
  medium: 1.0,
  low: 0.5,
  info: 0.2
};

/**
 * Estimates business impact and implementation effort for audit findings.
 */
export class ImpactEstimator {
  /**
   * Estimate impact for all findings.
   * @param {AuditFinding[]} findings
   * @returns {ImpactAssessment[]}
   */
  estimateAll(findings) {
    return findings.map(f => this.estimate(f));
  }

  /**
   * Estimate impact for a single finding.
   * @param {AuditFinding} finding
   * @returns {ImpactAssessment}
   */
  estimate(finding) {
    const businessImpact = this.#estimateBusinessImpact(finding);
    const { effort, effortHours } = this.#estimateEffort(finding);
    const rationale = this.#buildRationale(finding, businessImpact, effort);

    return {
      findingId: finding.id,
      businessImpact,
      effort,
      effortHours,
      rationale
    };
  }

  /**
   * Build an impact map for quick lookup.
   * @param {ImpactAssessment[]} assessments
   * @returns {Map<string, ImpactAssessment>}
   */
  buildImpactMap(assessments) {
    const map = new Map();
    for (const a of assessments) {
      map.set(a.findingId, a);
    }
    return map;
  }

  /**
   * Calculate priority score (higher = fix first).
   * @param {AuditFinding} finding
   * @param {ImpactAssessment} impact
   * @returns {number}
   */
  calculatePriorityScore(finding, impact) {
    const severityScore = { critical: 100, high: 75, medium: 50, low: 25, info: 10 }[finding.severity];
    const impactScore = { critical: 100, high: 75, medium: 50, low: 25, negligible: 5 }[impact.businessImpact];
    const effortMultiplier = { trivial: 1.5, easy: 1.3, moderate: 1.0, difficult: 0.7, complex: 0.5 }[impact.effort];

    return Math.round((severityScore * 0.4 + impactScore * 0.4) * effortMultiplier);
  }

  /**
   * @param {AuditFinding} finding
   * @returns {'critical' | 'high' | 'medium' | 'low' | 'negligible'}
   */
  #estimateBusinessImpact(finding) {
    const base = SEVERITY_IMPACT_MAP[finding.severity];

    if (finding.category === 'security' && finding.severity === 'critical') return 'critical';
    if (finding.category === 'security' && finding.severity === 'high') return 'high';
    if (finding.category === 'accessibility' && finding.severity === 'critical') return 'high';
    if (finding.category === 'seo' && finding.severity === 'critical') return 'high';

    return /** @type {'critical' | 'high' | 'medium' | 'low' | 'negligible'} */ (base);
  }

  /**
   * @param {AuditFinding} finding
   * @returns {{effort: 'trivial' | 'easy' | 'moderate' | 'difficult' | 'complex', effortHours: number}}
   */
  #estimateEffort(finding) {
    const categoryConfig = CATEGORY_EFFORT_MAP[finding.category] ?? { base: 'moderate', hours: 4 };
    const typeModifier = TYPE_EFFORT_MODIFIER[finding.type] ?? 1.0;
    const severityMultiplier = SEVERITY_EFFORT_HOURS[finding.severity] ?? 1.0;

    const effortHours = Math.round(categoryConfig.hours * typeModifier * severityMultiplier * 10) / 10;
    const effort = this.#classifyEffort(effortHours);

    return { effort, effortHours };
  }

  /**
   * @param {number} hours
   * @returns {'trivial' | 'easy' | 'moderate' | 'difficult' | 'complex'}
   */
  #classifyEffort(hours) {
    if (hours <= 2) return 'trivial';
    if (hours <= 5) return 'easy';
    if (hours <= 12) return 'moderate';
    if (hours <= 24) return 'difficult';
    return 'complex';
  }

  /**
   * @param {AuditFinding} finding
   * @param {string} businessImpact
   * @param {string} effort
   * @returns {string}
   */
  #buildRationale(finding, businessImpact, effort) {
    const parts = [];
    parts.push(`${finding.severity} severity ${finding.category} issue`);

    if (finding.category === 'security') {
      parts.push('security issues carry elevated business risk');
    }
    if (finding.category === 'accessibility') {
      parts.push('accessibility issues affect user inclusion and legal compliance');
    }
    if (finding.category === 'seo') {
      parts.push('SEO issues impact search visibility and traffic');
    }
    if (finding.category === 'performance') {
      parts.push('performance issues affect user experience and conversion');
    }

    parts.push(`estimated ${effort} implementation effort`);

    return parts.join('. ') + '.';
  }
}
