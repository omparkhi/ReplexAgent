/**
 * @typedef {import('../../domain/interfaces/audit.interface.js').AuditFinding} AuditFinding
 * @typedef {import('../../domain/interfaces/audit.interface.js').AuditInput} AuditInput
 * @typedef {import('../../domain/interfaces/audit.interface.js').FindingGroup} FindingGroup
 * @typedef {import('../../domain/interfaces/audit.interface.js').ImpactAssessment} ImpactAssessment
 * @typedef {import('../../domain/interfaces/audit.interface.js').PriorityItem} PriorityItem
 * @typedef {import('../../domain/interfaces/audit.interface.js').ActionItem} ActionItem
 * @typedef {import('../../domain/interfaces/audit.interface.js').ExecutiveSummary} ExecutiveSummary
 * @typedef {import('../../domain/interfaces/audit.interface.js').DeveloperSummary} DeveloperSummary
 * @typedef {import('../../domain/interfaces/audit.interface.js').AuditReport} AuditReport
 * @typedef {import('../../domain/interfaces/audit.interface.js').FindingSeverity} FindingSeverity
 * @typedef {import('../../domain/interfaces/audit.interface.js').FindingCategory} FindingCategory
 */

const SEVERITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info'
};

const CATEGORY_LABELS = {
  seo: 'SEO',
  accessibility: 'Accessibility',
  performance: 'Performance',
  security: 'Security',
  'best-practice': 'Best Practice'
};

const EFFORT_HOURS_MAP = {
  trivial: 2,
  easy: 4,
  moderate: 8,
  difficult: 16,
  complex: 32
};

const DEADLINE_MAP = {
  critical: 'Immediate',
  high: 'This sprint',
  medium: 'Next sprint',
  low: 'Backlog',
  info: 'When convenient'
};

/**
 * Generates audit reports from analyzed findings.
 */
export class ReportGenerator {
  /**
   * Generate a complete audit report.
   * @param {object} input
   * @param {AuditInput} input.auditInput
   * @param {FindingGroup[]} input.groups
   * @param {ImpactAssessment[]} input.impacts
   * @param {PriorityItem[]} input.priorityMatrix
   * @returns {AuditReport}
   */
  generateReport(input) {
    const { auditInput, groups, impacts, priorityMatrix } = input;

    return {
      executiveSummary: this.generateExecutiveSummary(auditInput, impacts),
      developerSummary: this.generateDeveloperSummary(auditInput, groups, impacts),
      priorityMatrix,
      actionPlan: this.generateActionPlan(auditInput.findings, impacts),
      findingGroups: groups,
      impactAssessments: impacts,
      metadata: {
        url: auditInput.url,
        title: auditInput.title,
        auditor: auditInput.auditor,
        auditedAt: auditInput.auditedAt,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Generate executive summary.
   * @param {AuditInput} auditInput
   * @param {ImpactAssessment[]} impacts
   * @returns {ExecutiveSummary}
   */
  generateExecutiveSummary(auditInput, impacts) {
    const findings = auditInput.findings;
    const bySeverity = this.#countBySeverity(findings);
    const byCategory = this.#countByCategory(findings);

    const totalHours = impacts.reduce((sum, i) => sum + i.effortHours, 0);
    const criticalHigh = bySeverity.critical + bySeverity.high;

    let overallRisk;
    if (bySeverity.critical > 0) overallRisk = 'CRITICAL — Immediate action required';
    else if (bySeverity.high >= 3) overallRisk = 'HIGH — Significant issues need attention';
    else if (bySeverity.high > 0) overallRisk = 'MODERATE — Some important issues to address';
    else if (bySeverity.medium >= 5) overallRisk = 'MODERATE — Multiple moderate issues';
    else if (bySeverity.medium > 0) overallRisk = 'LOW — Minor improvements recommended';
    else overallRisk = 'CLEAN — No significant issues found';

    const topFinding = findings.find(f => f.severity === 'critical') ??
      findings.find(f => f.severity === 'high') ??
      findings[0];

    const topAction = topFinding
      ? `Address "${topFinding.title}" (${topFinding.recommendation ?? topFinding.description})`
      : 'No immediate actions required';

    let estimatedTimeline;
    if (totalHours <= 8) estimatedTimeline = '1-2 days';
    else if (totalHours <= 40) estimatedTimeline = '1-2 weeks';
    else if (totalHours <= 80) estimatedTimeline = '2-4 weeks';
    else estimatedTimeline = '1-2 months';

    return {
      overview: `Audit of ${auditInput.url} identified ${findings.length} findings across ${Object.keys(byCategory).filter(k => byCategory[/** @type {FindingCategory} */ (k)] > 0).length} categories. ${criticalHigh} require immediate attention. Estimated total remediation effort: ${Math.round(totalHours)} hours.`,
      totalFindings: findings.length,
      bySeverity,
      byCategory,
      overallRisk,
      topAction,
      estimatedTimeline
    };
  }

  /**
   * Generate developer summary.
   * @param {AuditInput} auditInput
   * @param {FindingGroup[]} groups
   * @param {ImpactAssessment[]} impacts
   * @returns {DeveloperSummary}
   */
  generateDeveloperSummary(auditInput, groups, impacts) {
    const impactMap = new Map(impacts.map(i => [i.findingId, i]));

    const quickWins = auditInput.findings
      .filter(f => {
        const impact = impactMap.get(f.id);
        if (!impact) return false;
        return (impact.businessImpact === 'critical' || impact.businessImpact === 'high') &&
          (impact.effort === 'trivial' || impact.effort === 'easy');
      })
      .map(f => `${f.title}: ${f.recommendation ?? f.description}`);

    const totalHours = impacts.reduce((sum, i) => sum + i.effortHours, 0);
    const technicalDebt = impacts.filter(i => i.effort === 'difficult' || i.effort === 'complex').length > 0
      ? `Significant technical debt detected. ${impacts.filter(i => i.effort === 'difficult' || i.effort === 'complex').length} issues require complex refactoring (~${Math.round(impacts.filter(i => i.effort === 'difficult' || i.effort === 'complex').reduce((s, i) => s + i.effortHours, 0))} hours).`
      : 'Manageable technical debt. Most issues can be addressed with standard development effort.';

    return {
      overview: `${auditInput.findings.length} findings grouped into ${groups.length} categories. Total estimated effort: ${Math.round(totalHours)} hours.`,
      groups,
      technicalDebt,
      quickWins
    };
  }

  /**
   * Generate action plan from findings and impacts.
   * @param {AuditFinding[]} findings
   * @param {ImpactAssessment[]} impacts
   * @returns {ActionItem[]}
   */
  generateActionPlan(findings, impacts) {
    const impactMap = new Map(impacts.map(i => [i.findingId, i]));

    return findings
      .map(f => {
        const impact = impactMap.get(f.id);
        return {
          findingId: f.id,
          title: f.title,
          action: f.recommendation ?? f.description,
          severity: f.severity,
          effort: impact?.effort ?? 'moderate',
          effortHours: impact?.effortHours ?? 4,
          owner: this.#suggestOwner(f),
          deadline: DEADLINE_MAP[f.severity],
          steps: this.#generateSteps(f)
        };
      })
      .sort((a, b) => {
        const sevDiff = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[a.severity] -
          { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[b.severity];
        if (sevDiff !== 0) return sevDiff;
        return a.effortHours - b.effortHours;
      });
  }

  /**
   * @param {AuditFinding[]} findings
   * @returns {Record<FindingSeverity, number>}
   */
  #countBySeverity(findings) {
    /** @type {Record<FindingSeverity, number>} */
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) counts[f.severity]++;
    return counts;
  }

  /**
   * @param {AuditFinding[]} findings
   * @returns {Record<FindingCategory, number>}
   */
  #countByCategory(findings) {
    /** @type {Record<FindingCategory, number>} */
    const counts = { seo: 0, accessibility: 0, performance: 0, security: 0, 'best-practice': 0 };
    for (const f of findings) counts[f.category]++;
    return counts;
  }

  /**
   * @param {AuditFinding} finding
   * @returns {string}
   */
  #suggestOwner(finding) {
    const owners = {
      security: 'Security Team',
      accessibility: 'Frontend Team',
      performance: 'Engineering Team',
      seo: 'Marketing/SEO Team',
      'best-practice': 'Development Team'
    };
    return owners[finding.category] ?? 'Development Team';
  }

  /**
   * @param {AuditFinding} finding
   * @returns {string[]}
   */
  #generateSteps(finding) {
    const steps = [`Identify affected ${finding.type} in codebase`];

    if (finding.element) {
      steps.push(`Locate element: ${finding.element}`);
    }

    if (finding.recommendation) {
      steps.push(`Apply fix: ${finding.recommendation}`);
    } else {
      steps.push('Research best practice for this issue type');
      steps.push('Implement appropriate fix');
    }

    steps.push('Test fix in staging environment');
    steps.push('Verify with automated audit tools');

    return steps;
  }
}
