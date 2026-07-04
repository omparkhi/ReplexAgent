// @ts-nocheck
/**
 * Transforms a validated AuditReport into structured ReportData
 * with executive, developer, business, and roadmap sections.
 */
export class ReportBuilder {
  /**
   * Build ReportData from validated AuditReport.
   * @param {import('../../domain/interfaces/audit.interface.js').AuditReport} validatedReport
   * @param {import('./report.interface.js').ConfidenceScore} validationConfidence
   * @param {Record<string, unknown>} [metadata]
   * @returns {import('./report.interface.js').ReportData}
   */
  build(validatedReport, validationConfidence, metadata = {}) {
    const executive = this.#buildExecutive(validatedReport);
    const developer = this.#buildDeveloper(validatedReport);
    const business = this.#buildBusiness(validatedReport);
    const roadmap = this.#buildRoadmap(validatedReport);

    const overallConfidence = this.#calculateOverallConfidence(
      validationConfidence,
      executive.confidence,
      developer.confidence,
      business.confidence,
      roadmap.confidence
    );

    return {
      url: validatedReport.metadata?.url ?? 'unknown',
      title: validatedReport.metadata?.title ?? 'Website Audit Report',
      generatedAt: new Date().toISOString(),
      executive,
      developer,
      business,
      roadmap,
      overallConfidence,
      metadata: {
        ...metadata,
        sourceAgent: 'website-audit-agent',
        reportVersion: '1.0.0'
      }
    };
  }

  /**
   * Build executive report section.
   */
  #buildExecutive(report) {
    const exec = report.executiveSummary;
    const verifiedData = [];
    const excludedData = [];

    if (exec.totalFindings > 0) verifiedData.push('totalFindings');
    if (exec.overallRisk) verifiedData.push('overallRisk');
    if (exec.bySeverity) verifiedData.push('bySeverity');
    if (exec.byCategory) verifiedData.push('byCategory');
    if (exec.topAction) verifiedData.push('topAction');

    return {
      title: 'Executive Summary',
      overview: exec.overview ?? 'Audit analysis complete',
      overallRisk: exec.overallRisk ?? 'Unknown risk level',
      totalFindings: exec.totalFindings ?? 0,
      bySeverity: exec.bySeverity ?? { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      byCategory: exec.byCategory ?? { seo: 0, accessibility: 0, performance: 0, security: 0, 'best-practice': 0 },
      topAction: exec.topAction ?? 'No immediate actions',
      estimatedTimeline: exec.estimatedTimeline ?? 'TBD',
      confidence: this.#sectionConfidence(verifiedData, excludedData)
    };
  }

  /**
   * Build developer report section.
   */
  #buildDeveloper(report) {
    const dev = report.developerSummary;
    const verifiedData = [];
    const excludedData = [];

    const groups = (dev.groups ?? []).map(g => {
      verifiedData.push(`group:${g.name}`);
      return {
        name: g.name,
        count: g.findings?.length ?? g.count ?? 0,
        maxSeverity: g.maxSeverity,
        findings: (g.findings ?? []).map(f => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
          recommendation: f.recommendation ?? f.description ?? 'No recommendation'
        }))
      };
    });

    if (dev.technicalDebt) verifiedData.push('technicalDebt');
    if (dev.quickWins?.length > 0) verifiedData.push('quickWins');

    return {
      title: 'Developer Report',
      overview: dev.overview ?? 'Technical audit findings',
      groups,
      technicalDebt: dev.technicalDebt ?? 'No assessment available',
      quickWins: dev.quickWins ?? [],
      confidence: this.#sectionConfidence(verifiedData, excludedData)
    };
  }

  /**
   * Build business report section.
   */
  #buildBusiness(report) {
    const verifiedData = [];
    const excludedData = [];

    const impacts = (report.impactAssessments ?? []).map(imp => {
      verifiedData.push(`impact:${imp.findingId}`);
      return {
        findingId: imp.findingId,
        businessImpact: imp.businessImpact,
        effort: imp.effort,
        effortHours: imp.effortHours,
        rationale: imp.rationale
      };
    });

    const priorityItems = (report.priorityMatrix ?? []).map(p => {
      verifiedData.push(`priority:${p.findingId}`);
      return {
        findingId: p.findingId,
        title: p.title,
        businessImpact: p.businessImpact,
        effort: p.effort,
        effortHours: impacts.find(i => i.findingId === p.findingId)?.effortHours ?? 0,
        priorityScore: p.priorityScore
      };
    });

    const totalHours = impacts.reduce((sum, i) => sum + i.effortHours, 0);
    const hourlyRate = 150;
    const estimatedCost = totalHours * hourlyRate;

    const highImpact = impacts.filter(i => i.businessImpact === 'critical' || i.businessImpact === 'high');
    const roi = highImpact.length > 0
      ? `Addressing ${highImpact.length} high-impact issues first will reduce critical risk exposure. Estimated investment: $${estimatedCost.toLocaleString()} for ${totalHours} hours of work.`
      : 'No critical business impact issues identified.';

    return {
      title: 'Business Summary',
      overview: `Total estimated effort: ${totalHours} hours ($${estimatedCost.toLocaleString()} at $${hourlyRate}/hr). ${impacts.length} findings with business impact assessments.`,
      totalEffortHours: totalHours,
      estimatedCost,
      impactSummary: priorityItems,
      roi,
      confidence: this.#sectionConfidence(verifiedData, excludedData)
    };
  }

  /**
   * Build roadmap report section.
   */
  #buildRoadmap(report) {
    const verifiedData = [];
    const excludedData = [];

    const actions = report.actionPlan ?? [];
    const phases = this.#organizeIntoPhases(actions);
    const totalHours = phases.reduce((sum, p) => sum + p.totalHours, 0);

    phases.forEach(p => {
      p.items.forEach(item => verifiedData.push(`roadmap:${item.findingId}`));
    });

    const estimatedTimeline = this.#estimateTimeline(totalHours);

    return {
      title: 'Implementation Roadmap',
      overview: `${phases.length} phases planned over ${estimatedTimeline}. Total effort: ${totalHours} hours.`,
      phases,
      totalEstimatedHours: totalHours,
      estimatedTimeline,
      confidence: this.#sectionConfidence(verifiedData, excludedData)
    };
  }

  /**
   * Organize action items into roadmap phases.
   */
  #organizeIntoPhases(actions) {
    const critical = actions.filter(a => a.severity === 'critical');
    const high = actions.filter(a => a.severity === 'high');
    const medium = actions.filter(a => a.severity === 'medium');
    const low = actions.filter(a => a.severity === 'low' || a.severity === 'info');

    const phases = [];

    if (critical.length > 0) {
      phases.push(this.#buildPhase('Phase 1: Critical Fixes', 'Address all critical severity issues immediately', '1-3 days', critical));
    }
    if (high.length > 0) {
      phases.push(this.#buildPhase('Phase 2: High Priority', 'Resolve high severity issues', '1-2 weeks', high));
    }
    if (medium.length > 0) {
      phases.push(this.#buildPhase('Phase 3: Medium Priority', 'Address moderate severity improvements', '2-4 weeks', medium));
    }
    if (low.length > 0) {
      phases.push(this.#buildPhase('Phase 4: Low Priority & Cleanup', 'Handle low severity items and best practices', '1-2 months', low));
    }

    return phases;
  }

  #buildPhase(name, description, timeframe, actions) {
    const items = actions.map(a => ({
      findingId: a.findingId,
      title: a.title,
      action: a.action,
      effort: a.effort,
      effortHours: a.effortHours,
      owner: a.owner,
      steps: a.steps
    }));

    return {
      name,
      description,
      timeframe,
      items,
      totalHours: items.reduce((sum, i) => sum + i.effortHours, 0),
      confidence: {
        score: 1.0,
        rationale: 'All items from verified audit findings',
        verifiedDataPoints: items.map(i => `action:${i.findingId}`),
        excludedDataPoints: []
      }
    };
  }

  #estimateTimeline(totalHours) {
    if (totalHours <= 8) return '1-2 days';
    if (totalHours <= 40) return '1-2 weeks';
    if (totalHours <= 80) return '2-4 weeks';
    if (totalHours <= 160) return '1-2 months';
    return '2-3 months';
  }

  #sectionConfidence(verified, excluded) {
    const total = verified.length + excluded.length;
    const score = total === 0 ? 1 : verified.length / total;
    return {
      score: Math.round(score * 100) / 100,
      rationale: `${verified.length} data points verified${excluded.length > 0 ? `, ${excluded.length} excluded` : ''}`,
      verifiedDataPoints: verified,
      excludedDataPoints: excluded
    };
  }

  #calculateOverallConfidence(...scores) {
    const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const allVerified = scores.flatMap(s => s.verifiedDataPoints);
    const allExcluded = scores.flatMap(s => s.excludedDataPoints);

    return {
      score: Math.round(avg * 100) / 100,
      rationale: `Overall confidence across ${scores.length} sections. ${allVerified.length} total data points verified.`,
      verifiedDataPoints: allVerified,
      excludedDataPoints: allExcluded
    };
  }
}
