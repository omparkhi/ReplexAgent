// @ts-nocheck
/**
 * Renders ReportData to self-contained HTML with inline CSS.
 * PDF compatible — HTML can be converted via puppeteer, wkhtmltopdf, or browser print.
 */
export class HtmlRenderer {
  /**
   * Render ReportData to HTML.
   * @param {import('./report.interface.js').ReportData} data
   * @returns {import('./report.interface.js').RenderedReport}
   */
  render(data) {
    const content = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      `<title>${this.#escapeHtml(data.title)}</title>`,
      '<style>',
      this.#css(),
      '</style>',
      '</head>',
      '<body>',
      '<div class="container">',
      this.#renderHeader(data),
      this.#renderConfidenceBadge(data.overallConfidence, 'Overall Confidence'),
      this.#renderExecutive(data.executive),
      this.#renderDeveloper(data.developer),
      this.#renderBusiness(data.business),
      this.#renderRoadmap(data.roadmap),
      this.#renderFooter(data),
      '</div>',
      '</body>',
      '</html>'
    ].join('\n');

    const filename = this.#slugify(data.title) + '.html';

    return {
      format: 'html',
      content,
      filename,
      mimeType: 'text/html',
      sizeBytes: Buffer.byteLength(content, 'utf-8')
    };
  }

  #renderHeader(data) {
    return `
      <header class="report-header">
        <h1>${this.#escapeHtml(data.title)}</h1>
        <div class="meta">
          <span><strong>URL:</strong> ${this.#escapeHtml(data.url)}</span>
          <span><strong>Generated:</strong> ${data.generatedAt}</span>
        </div>
      </header>`;
  }

  #renderConfidenceBadge(confidence, label) {
    const pct = (confidence.score * 100).toFixed(0);
    const cls = confidence.score >= 0.8 ? 'high' : confidence.score >= 0.5 ? 'medium' : 'low';
    return `
      <div class="confidence-badge ${cls}">
        <span class="label">${label}</span>
        <span class="score">${pct}%</span>
        <span class="rationale">${this.#escapeHtml(confidence.rationale)}</span>
        ${confidence.excludedDataPoints.length > 0
          ? `<details class="excluded"><summary>Excluded data (${confidence.excludedDataPoints.length})</summary><ul>${confidence.excludedDataPoints.map(e => `<li>${this.#escapeHtml(e)}</li>`).join('')}</ul></details>`
          : ''}
      </div>`;
  }

  #renderExecutive(exec) {
    const severityEntries = Object.entries(exec.bySeverity)
      .filter(([, count]) => count > 0)
      .map(([sev, count]) => `<span class="severity-badge ${sev}">${this.#capitalize(sev)}: ${count}</span>`)
      .join(' ');

    const categoryEntries = Object.entries(exec.byCategory)
      .filter(([, count]) => count > 0)
      .map(([cat, count]) => `<tr><td>${this.#formatCategory(cat)}</td><td>${count}</td></tr>`)
      .join('');

    return `
      <section class="report-section executive">
        <h2>Executive Summary</h2>
        <p class="overview">${this.#escapeHtml(exec.overview)}</p>
        <div class="risk-card">
          <div class="risk-label">Overall Risk</div>
          <div class="risk-value">${this.#escapeHtml(exec.overallRisk)}</div>
        </div>
        <div class="stats-row">
          <div class="stat"><span class="stat-value">${exec.totalFindings}</span><span class="stat-label">Total Findings</span></div>
          <div class="stat"><span class="stat-value">${exec.estimatedTimeline ?? 'TBD'}</span><span class="stat-label">Timeline</span></div>
        </div>
        <div class="top-action">
          <strong>Top Action:</strong> ${this.#escapeHtml(exec.topAction)}
        </div>
        <h3>By Severity</h3>
        <div class="severity-badges">${severityEntries}</div>
        <h3>By Category</h3>
        <table class="data-table">
          <thead><tr><th>Category</th><th>Count</th></tr></thead>
          <tbody>${categoryEntries}</tbody>
        </table>
        ${this.#renderConfidenceBadge(exec.confidence, 'Section Confidence')}
      </section>`;
  }

  #renderDeveloper(dev) {
    const groupHtml = dev.groups.map(g => {
      const findingHtml = g.findings.map(f =>
        `<li class="finding-item"><span class="finding-title">${this.#escapeHtml(f.title)}</span> <span class="severity-badge ${f.severity}">${this.#capitalize(f.severity)}</span><br><span class="recommendation">${this.#escapeHtml(f.recommendation)}</span></li>`
      ).join('');

      return `
        <div class="finding-group">
          <h4>${this.#escapeHtml(g.name)} <span class="count">(${g.count} findings)</span></h4>
          <ul class="findings-list">${findingHtml}</ul>
        </div>`;
    }).join('');

    const quickWinHtml = dev.quickWins.length > 0
      ? `<ul class="quick-wins">${dev.quickWins.map(q => `<li>${this.#escapeHtml(q)}</li>`).join('')}</ul>`
      : '<p>No quick wins identified.</p>';

    return `
      <section class="report-section developer">
        <h2>Developer Report</h2>
        <p class="overview">${this.#escapeHtml(dev.overview)}</p>
        <h3>Technical Debt</h3>
        <p>${this.#escapeHtml(dev.technicalDebt)}</p>
        <h3>Quick Wins</h3>
        ${quickWinHtml}
        <h3>Finding Groups</h3>
        ${groupHtml}
        ${this.#renderConfidenceBadge(dev.confidence, 'Section Confidence')}
      </section>`;
  }

  #renderBusiness(biz) {
    const impactRows = biz.impactSummary.map(item =>
      `<tr>
        <td>${this.#escapeHtml(item.title)}</td>
        <td><span class="impact-badge ${item.businessImpact}">${this.#capitalize(item.businessImpact)}</span></td>
        <td>${this.#capitalize(item.effort)}</td>
        <td>${item.effortHours}h</td>
        <td>${item.priorityScore.toFixed(1)}</td>
      </tr>`
    ).join('');

    return `
      <section class="report-section business">
        <h2>Business Summary</h2>
        <p class="overview">${this.#escapeHtml(biz.overview)}</p>
        <div class="financials">
          <div class="stat"><span class="stat-value">${biz.totalEffortHours}h</span><span class="stat-label">Total Effort</span></div>
          <div class="stat"><span class="stat-value">$${biz.estimatedCost.toLocaleString()}</span><span class="stat-label">Estimated Cost</span></div>
        </div>
        <h3>ROI</h3>
        <p>${this.#escapeHtml(biz.roi)}</p>
        <h3>Impact Summary</h3>
        <table class="data-table">
          <thead><tr><th>Finding</th><th>Impact</th><th>Effort</th><th>Hours</th><th>Priority</th></tr></thead>
          <tbody>${impactRows}</tbody>
        </table>
        ${this.#renderConfidenceBadge(biz.confidence, 'Section Confidence')}
      </section>`;
  }

  #renderRoadmap(roadmap) {
    const phaseHtml = roadmap.phases.map(p => {
      const itemHtml = p.items.map(i => {
        const stepsHtml = i.steps?.length > 0
          ? `<ul class="steps">${i.steps.map(s => `<li>${this.#escapeHtml(s)}</li>`).join('')}</ul>`
          : '';
        return `
          <li class="roadmap-item">
            <strong>${this.#escapeHtml(i.title)}</strong>
            <span class="effort-badge">${this.#capitalize(i.effort)} — ${i.effortHours}h</span>
            <p>${this.#escapeHtml(i.action)}</p>
            ${stepsHtml}
          </li>`;
      }).join('');

      return `
        <div class="roadmap-phase">
          <h4>${this.#escapeHtml(p.name)}</h4>
          <div class="phase-meta"><span class="timeframe">${p.timeframe}</span> — ${this.#escapeHtml(p.description)}</div>
          <div class="phase-hours">${p.totalHours} hours</div>
          <ul class="phase-items">${itemHtml}</ul>
        </div>`;
    }).join('');

    return `
      <section class="report-section roadmap">
        <h2>Implementation Roadmap</h2>
        <p class="overview">${this.#escapeHtml(roadmap.overview)}</p>
        <div class="stats-row">
          <div class="stat"><span class="stat-value">${roadmap.totalEstimatedHours}h</span><span class="stat-label">Total Hours</span></div>
          <div class="stat"><span class="stat-value">${roadmap.estimatedTimeline}</span><span class="stat-label">Timeline</span></div>
        </div>
        ${phaseHtml}
        ${this.#renderConfidenceBadge(roadmap.confidence, 'Section Confidence')}
      </section>`;
  }

  #renderFooter(data) {
    return `
      <footer class="report-footer">
        <p>Report generated by ReplexAgent Report Agent</p>
        <p class="confidence-footer">Confidence: ${(data.overallConfidence.score * 100).toFixed(0)}% — ${this.#escapeHtml(data.overallConfidence.rationale)}</p>
      </footer>`;
  }

  #css() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; background: #f8f9fa; }
      .container { max-width: 900px; margin: 0 auto; padding: 2rem; }
      .report-header { text-align: center; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 3px solid #0f3460; }
      .report-header h1 { font-size: 2rem; color: #0f3460; margin-bottom: 0.5rem; }
      .meta { display: flex; gap: 2rem; justify-content: center; color: #666; font-size: 0.9rem; }
      .report-section { background: #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
      .report-section h2 { color: #0f3460; font-size: 1.4rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e94560; }
      .report-section h3 { color: #16213e; margin: 1.2rem 0 0.6rem; font-size: 1.1rem; }
      .report-section h4 { color: #0f3460; margin: 1rem 0 0.4rem; }
      .overview { color: #444; margin-bottom: 1rem; }
      .risk-card { background: #fff3cd; border-left: 4px solid #ffc107; padding: 1rem; margin: 1rem 0; border-radius: 4px; }
      .risk-label { font-size: 0.8rem; text-transform: uppercase; color: #856404; letter-spacing: 0.05em; }
      .risk-value { font-size: 1.2rem; font-weight: 600; color: #856404; }
      .stats-row { display: flex; gap: 1.5rem; margin: 1rem 0; }
      .stat { text-align: center; flex: 1; padding: 0.8rem; background: #f1f3f5; border-radius: 6px; }
      .stat-value { display: block; font-size: 1.3rem; font-weight: 700; color: #0f3460; }
      .stat-label { display: block; font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
      .top-action { padding: 0.8rem; background: #e8f4f8; border-radius: 4px; margin: 1rem 0; }
      .data-table { width: 100%; border-collapse: collapse; margin: 0.8rem 0; }
      .data-table th, .data-table td { padding: 0.5rem 0.8rem; text-align: left; border-bottom: 1px solid #e9ecef; }
      .data-table th { background: #f1f3f5; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.03em; }
      .severity-badge, .impact-badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.8rem; font-weight: 600; }
      .severity-badge.critical, .impact-badge.critical { background: #dc3545; color: #fff; }
      .severity-badge.high, .impact-badge.high { background: #fd7e14; color: #fff; }
      .severity-badge.medium, .impact-badge.medium { background: #ffc107; color: #212529; }
      .severity-badge.low, .impact-badge.low { background: #28a745; color: #fff; }
      .severity-badge.info { background: #17a2b8; color: #fff; }
      .severity-badges { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.5rem 0; }
      .finding-group { margin: 1rem 0; padding: 0.8rem; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #0f3460; }
      .finding-group h4 { margin-bottom: 0.5rem; }
      .count { font-weight: normal; color: #666; font-size: 0.85rem; }
      .findings-list { list-style: none; padding: 0; }
      .finding-item { padding: 0.4rem 0; border-bottom: 1px solid #e9ecef; }
      .finding-title { font-weight: 600; }
      .recommendation { color: #555; font-size: 0.9rem; }
      .quick-wins { margin: 0.5rem 0; }
      .quick-wins li { padding: 0.3rem 0; color: #28a745; }
      .financials { display: flex; gap: 1.5rem; margin: 1rem 0; }
      .effort-badge { display: inline-block; padding: 0.1rem 0.4rem; background: #e9ecef; border-radius: 3px; font-size: 0.8rem; margin-left: 0.5rem; }
      .roadmap-phase { margin: 1.5rem 0; padding: 1rem; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #e94560; }
      .phase-meta { color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; }
      .timeframe { font-weight: 600; color: #0f3460; }
      .phase-hours { font-weight: 600; color: #e94560; margin-bottom: 0.5rem; }
      .phase-items { list-style: none; padding: 0; }
      .roadmap-item { padding: 0.6rem 0; border-bottom: 1px solid #e9ecef; }
      .roadmap-item p { margin: 0.3rem 0 0; color: #555; font-size: 0.9rem; }
      .steps { margin: 0.3rem 0 0 1rem; font-size: 0.85rem; color: #666; }
      .confidence-badge { margin: 1rem 0; padding: 0.8rem; border-radius: 6px; font-size: 0.85rem; }
      .confidence-badge.high { background: #d4edda; border-left: 4px solid #28a745; }
      .confidence-badge.medium { background: #fff3cd; border-left: 4px solid #ffc107; }
      .confidence-badge.low { background: #f8d7da; border-left: 4px solid #dc3545; }
      .confidence-badge .label { font-weight: 600; display: block; }
      .confidence-badge .score { font-size: 1.1rem; font-weight: 700; }
      .confidence-badge .rationale { display: block; color: #555; margin-top: 0.3rem; }
      .excluded { margin-top: 0.5rem; }
      .excluded ul { margin: 0.3rem 0 0 1rem; font-size: 0.8rem; color: #888; }
      .report-footer { text-align: center; padding: 1.5rem; color: #666; font-size: 0.85rem; border-top: 2px solid #e9ecef; margin-top: 1rem; }
      .confidence-footer { font-style: italic; margin-top: 0.3rem; }
      @media print { .container { max-width: 100%; padding: 1rem; } .report-section { break-inside: avoid; box-shadow: none; border: 1px solid #ddd; } }
      @media (max-width: 600px) { .container { padding: 1rem; } .stats-row, .financials { flex-direction: column; } .meta { flex-direction: column; gap: 0.3rem; } }
    `;
  }

  #escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  #capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  }

  #formatCategory(cat) {
    const map = { 'seo': 'SEO', 'accessibility': 'Accessibility', 'performance': 'Performance', 'security': 'Security', 'best-practice': 'Best Practice' };
    return map[cat] ?? cat;
  }

  #slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
