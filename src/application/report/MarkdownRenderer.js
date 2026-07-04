// @ts-nocheck
/**
 * Renders ReportData to Markdown format.
 * Future PDF compatible — Markdown can be converted via pandoc or similar.
 */
export class MarkdownRenderer {
  /**
   * Render ReportData to Markdown.
   * @param {import('./report.interface.js').ReportData} data
   * @returns {import('./report.interface.js').RenderedReport}
   */
  render(data) {
    const sections = [];

    sections.push(this.#renderHeader(data));
    sections.push(this.#renderConfidence(data.overallConfidence, 'Overall Report Confidence'));
    sections.push(this.#renderExecutive(data.executive));
    sections.push(this.#renderDeveloper(data.developer));
    sections.push(this.#renderBusiness(data.business));
    sections.push(this.#renderRoadmap(data.roadmap));
    sections.push(this.#renderFooter(data));

    const content = sections.join('\n\n');
    const filename = this.#slugify(data.title) + '.md';

    return {
      format: 'markdown',
      content,
      filename,
      mimeType: 'text/markdown',
      sizeBytes: Buffer.byteLength(content, 'utf-8')
    };
  }

  #renderHeader(data) {
    return [
      `# ${data.title}`,
      '',
      `**URL:** ${data.url}`,
      `**Generated:** ${data.generatedAt}`,
      '',
      '---'
    ].join('\n');
  }

  #renderConfidence(confidence, label) {
    const bar = this.#confidenceBar(confidence.score);
    return [
      `### ${label}`,
      '',
      `${bar} **${(confidence.score * 100).toFixed(0)}%**`,
      '',
      `> ${confidence.rationale}`,
      '',
      confidence.excludedDataPoints.length > 0
        ? `<details><summary>Excluded data (${confidence.excludedDataPoints.length})</summary>\n\n${confidence.excludedDataPoints.map(e => `- ${e}`).join('\n')}\n</details>`
        : ''
    ].filter(Boolean).join('\n');
  }

  #renderExecutive(exec) {
    const severityRows = Object.entries(exec.bySeverity)
      .filter(([, count]) => count > 0)
      .map(([sev, count]) => `| ${this.#capitalize(sev)} | ${count} |`)
      .join('\n');

    const categoryRows = Object.entries(exec.byCategory)
      .filter(([, count]) => count > 0)
      .map(([cat, count]) => `| ${this.#formatCategory(cat)} | ${count} |`)
      .join('\n');

    return [
      '## Executive Summary',
      '',
      exec.overview,
      '',
      '### Risk Assessment',
      '',
      `**Overall Risk:** ${exec.overallRisk}`,
      `**Total Findings:** ${exec.totalFindings}`,
      `**Top Action:** ${exec.topAction}`,
      exec.estimatedTimeline ? `**Estimated Timeline:** ${exec.estimatedTimeline}` : '',
      '',
      '### Findings by Severity',
      '',
      '| Severity | Count |',
      '| --- | --- |',
      severityRows,
      '',
      '### Findings by Category',
      '',
      '| Category | Count |',
      '| --- | --- |',
      categoryRows,
      '',
      this.#renderConfidence(exec.confidence, 'Executive Section Confidence')
    ].filter(Boolean).join('\n');
  }

  #renderDeveloper(dev) {
    const groupSections = dev.groups.map(g => {
      const findingRows = g.findings.map(f =>
        `  - **${f.title}** (${this.#capitalize(f.severity)}) — ${f.recommendation}`
      ).join('\n');

      return [
        `#### ${g.name} (${g.count} findings, max: ${this.#capitalize(g.maxSeverity)})`,
        '',
        findingRows
      ].join('\n');
    });

    return [
      '## Developer Report',
      '',
      dev.overview,
      '',
      '### Technical Debt',
      '',
      dev.technicalDebt,
      '',
      '### Quick Wins',
      '',
      dev.quickWins.length > 0
        ? dev.quickWins.map(q => `- ${q}`).join('\n')
        : '- No quick wins identified',
      '',
      '### Finding Groups',
      '',
      groupSections.join('\n\n'),
      '',
      this.#renderConfidence(dev.confidence, 'Developer Section Confidence')
    ].join('\n');
  }

  #renderBusiness(biz) {
    const impactRows = biz.impactSummary.map(item =>
      `| ${item.title} | ${this.#capitalize(item.businessImpact)} | ${this.#capitalize(item.effort)} | ${item.effortHours}h | ${item.priorityScore.toFixed(1)} |`
    ).join('\n');

    return [
      '## Business Summary',
      '',
      biz.overview,
      '',
      '### Financial Overview',
      '',
      `**Total Effort:** ${biz.totalEffortHours} hours`,
      `**Estimated Cost:** $${biz.estimatedCost.toLocaleString()}`,
      '',
      '### ROI',
      '',
      biz.roi,
      '',
      '### Impact Summary',
      '',
      '| Finding | Business Impact | Effort | Hours | Priority |',
      '| --- | --- | --- | --- | --- |',
      impactRows,
      '',
      this.#renderConfidence(biz.confidence, 'Business Section Confidence')
    ].join('\n');
  }

  #renderRoadmap(roadmap) {
    const phaseSections = roadmap.phases.map(p => {
      const itemRows = p.items.map(i => {
        const steps = i.steps?.length > 0
          ? '\n' + i.steps.map(s => `    - ${s}`).join('\n')
          : '';
        return `  - **${i.title}** (${this.#capitalize(i.effort)}, ${i.effortHours}h) — ${i.action}${steps}`;
      }).join('\n');

      return [
        `### ${p.name}`,
        '',
        `*${p.timeframe}* — ${p.description}`,
        '',
        `**Phase effort:** ${p.totalHours} hours`,
        '',
        itemRows
      ].join('\n');
    });

    return [
      '## Implementation Roadmap',
      '',
      roadmap.overview,
      '',
      `**Total Estimated Hours:** ${roadmap.totalEstimatedHours}`,
      `**Overall Timeline:** ${roadmap.estimatedTimeline}`,
      '',
      phaseSections.join('\n\n'),
      '',
      this.#renderConfidence(roadmap.confidence, 'Roadmap Section Confidence')
    ].join('\n');
  }

  #renderFooter(data) {
    return [
      '---',
      '',
      `*Report generated by ReplexAgent Report Agent*`,
      `*Confidence: ${(data.overallConfidence.score * 100).toFixed(0)}% — ${data.overallConfidence.rationale}*`
    ].join('\n');
  }

  #confidenceBar(score) {
    const filled = Math.round(score * 10);
    const empty = 10 - filled;
    return '`' + '█'.repeat(filled) + '░'.repeat(empty) + '`';
  }

  #capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  }

  #formatCategory(cat) {
    const map = {
      'seo': 'SEO',
      'accessibility': 'Accessibility',
      'performance': 'Performance',
      'security': 'Security',
      'best-practice': 'Best Practice'
    };
    return map[cat] ?? cat;
  }

  #slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
