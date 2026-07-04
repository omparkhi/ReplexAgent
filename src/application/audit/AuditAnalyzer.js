import { randomUUID } from 'node:crypto';

/**
 * @typedef {import('../../domain/interfaces/audit.interface.js').AuditFinding} AuditFinding
 * @typedef {import('../../domain/interfaces/audit.interface.js').FindingGroup} FindingGroup
 * @typedef {import('../../domain/interfaces/audit.interface.js').FindingSeverity} FindingSeverity
 * @typedef {import('../../domain/interfaces/audit.interface.js').FindingCategory} FindingCategory
 */

/** @type {Record<FindingSeverity, number>} */
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

/**
 * Analyzes, prioritizes, and groups audit findings.
 */
export class AuditAnalyzer {
  /**
   * Group findings by category and type.
   * @param {AuditFinding[]} findings
   * @returns {FindingGroup[]}
   */
  groupFindings(findings) {
    const groupMap = new Map();

    for (const finding of findings) {
      const key = `${finding.category}:${finding.type}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: randomUUID(),
          name: this.#formatGroupName(finding.category, finding.type),
          category: finding.category,
          findings: [],
          maxSeverity: 'info',
          count: 0
        });
      }

      const group = groupMap.get(key);
      group.findings.push(finding);
      group.count++;

      // @ts-ignore - TS7053 severity type inference issue with NodeNext moduleResolution
      if (SEVERITY_ORDER[finding.severity] < SEVERITY_ORDER[group.maxSeverity]) {
        group.maxSeverity = finding.severity;
      }
    }

    return [...groupMap.values()].sort(
      // @ts-ignore - TS7053 severity type inference issue with NodeNext moduleResolution
      (a, b) => SEVERITY_ORDER[a.maxSeverity] - SEVERITY_ORDER[b.maxSeverity]
    );
  }

  /**
   * Calculate severity counts.
   * @param {AuditFinding[]} findings
   * @returns {Record<FindingSeverity, number>}
   */
  countBySeverity(findings) {
    /** @type {Record<FindingSeverity, number>} */
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) {
      const key = f.severity;
      counts[key] = counts[key] + 1;
    }
    return counts;
  }

  /**
   * Calculate category counts.
   * @param {AuditFinding[]} findings
   * @returns {Record<FindingCategory, number>}
   */
  countByCategory(findings) {
    /** @type {Record<FindingCategory, number>} */
    const counts = { seo: 0, accessibility: 0, performance: 0, security: 0, 'best-practice': 0 };
    for (const f of findings) {
      const key = f.category;
      counts[key] = counts[key] + 1;
    }
    return counts;
  }

  /**
   * Calculate overall risk level.
   * @param {Record<FindingSeverity, number>} severityCounts
   * @returns {string}
   */
  calculateOverallRisk(severityCounts) {
    if (severityCounts.critical > 0) return 'CRITICAL — Immediate action required';
    if (severityCounts.high >= 3) return 'HIGH — Significant issues need attention';
    if (severityCounts.high > 0) return 'MODERATE — Some important issues to address';
    if (severityCounts.medium >= 5) return 'MODERATE — Multiple moderate issues';
    if (severityCounts.medium > 0) return 'LOW — Minor improvements recommended';
    if (severityCounts.low > 0) return 'MINIMAL — Minor observations';
    return 'CLEAN — No significant issues found';
  }

  /**
   * Identify quick wins (high impact, low effort).
   * @param {AuditFinding[]} findings
   * @param {Map<string, {effort: string, businessImpact: string}>} impactMap
   * @returns {string[]}
   */
  findQuickWins(findings, impactMap) {
    return findings
      .filter(f => {
        const impact = impactMap.get(f.id);
        if (!impact) return false;
        return (impact.businessImpact === 'high' || impact.businessImpact === 'critical') &&
          (impact.effort === 'trivial' || impact.effort === 'easy');
      })
      .map(f => `${f.title}: ${f.recommendation ?? f.description}`);
  }

  /**
   * Format group name from category and type.
   * @param {FindingCategory} category
   * @param {string} type
   * @returns {string}
   */
  #formatGroupName(category, type) {
    const categoryNames = {
      'seo': 'SEO',
      'accessibility': 'Accessibility',
      'performance': 'Performance',
      'security': 'Security',
      'best-practice': 'Best Practice'
    };
    const typeName = type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
    return `${categoryNames[category] ?? category} — ${typeName}`;
  }
}
