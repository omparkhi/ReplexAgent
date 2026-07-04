// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConfidenceValidator } from '../src/application/report/ConfidenceValidator.js';
import { ReportBuilder } from '../src/application/report/ReportBuilder.js';
import { MarkdownRenderer } from '../src/application/report/MarkdownRenderer.js';
import { HtmlRenderer } from '../src/application/report/HtmlRenderer.js';
import { JsonRenderer } from '../src/application/report/JsonRenderer.js';
import { ReportAgent } from '../src/application/ReportAgent.js';

const logger = { info() {}, warn() {}, error() {}, debug() {} };

const sampleAuditReport = {
  executiveSummary: {
    overview: 'Website has 8 findings across security, accessibility, performance, and SEO.',
    totalFindings: 8,
    bySeverity: { critical: 1, high: 3, medium: 2, low: 2, info: 0 },
    byCategory: { seo: 2, accessibility: 2, performance: 2, security: 1, 'best-practice': 1 },
    overallRisk: 'HIGH — Significant issues need attention',
    topAction: 'Address "XSS vulnerability in search" (Sanitize all user input)',
    estimatedTimeline: '1-2 weeks'
  },
  developerSummary: {
    overview: '8 findings grouped into 6 categories. Total estimated effort: 44 hours.',
    groups: [
      {
        id: 'g1', name: 'Security — Technical', category: 'security', maxSeverity: 'critical', count: 1,
        findings: [{ id: 'f1', title: 'XSS vulnerability in search', severity: 'critical', category: 'security', type: 'technical', description: 'User input reflected without sanitization', recommendation: 'Sanitize all user input' }]
      },
      {
        id: 'g2', name: 'Accessibility — Content', category: 'accessibility', maxSeverity: 'high', count: 2,
        findings: [
          { id: 'f2', title: 'Missing alt text on images', severity: 'high', category: 'accessibility', type: 'content', description: '12 images lack alt attributes', recommendation: 'Add descriptive alt text' },
          { id: 'f6', title: 'Insufficient color contrast', severity: 'high', category: 'accessibility', type: 'content', description: 'Text contrast ratio below 4.5:1', recommendation: 'Increase color contrast' }
        ]
      }
    ],
    technicalDebt: 'Manageable technical debt. Most issues can be addressed with standard development effort.',
    quickWins: ['Missing alt text on images: Add descriptive alt text to all images']
  },
  priorityMatrix: [
    { findingId: 'f1', title: 'XSS vulnerability in search', severity: 'critical', category: 'security', businessImpact: 'critical', effort: 'moderate', priorityScore: 120, rank: 1 },
    { findingId: 'f2', title: 'Missing alt text on images', severity: 'high', category: 'accessibility', businessImpact: 'high', effort: 'easy', priorityScore: 85, rank: 2 },
    { findingId: 'f3', title: 'Slow server response time', severity: 'high', category: 'performance', businessImpact: 'high', effort: 'difficult', priorityScore: 75, rank: 3 }
  ],
  actionPlan: [
    { findingId: 'f1', title: 'XSS vulnerability in search', action: 'Sanitize all user input', severity: 'critical', effort: 'moderate', effortHours: 8, owner: 'Security Team', steps: ['Audit input fields', 'Implement sanitization', 'Add CSP headers'] },
    { findingId: 'f2', title: 'Missing alt text on images', action: 'Add descriptive alt text to all images', severity: 'high', effort: 'easy', effortHours: 2, owner: 'Content Team' },
    { findingId: 'f3', title: 'Slow server response time', action: 'Optimize server-side rendering and caching', severity: 'high', effort: 'difficult', effortHours: 16, owner: 'DevOps Team' }
  ],
  findingGroups: [
    { id: 'g1', name: 'Security — Technical', category: 'security', maxSeverity: 'critical', count: 1, findings: [{ id: 'f1', title: 'XSS vulnerability', severity: 'critical', category: 'security', type: 'technical', description: 'XSS', recommendation: 'Sanitize' }] },
    { id: 'g2', name: 'Accessibility — Content', category: 'accessibility', maxSeverity: 'high', count: 2, findings: [{ id: 'f2', title: 'Missing alt text', severity: 'high', category: 'accessibility', type: 'content', description: 'No alt', recommendation: 'Add alt' }] }
  ],
  impactAssessments: [
    { findingId: 'f1', businessImpact: 'critical', effort: 'moderate', effortHours: 8, rationale: 'Security vulnerability exposing user data' },
    { findingId: 'f2', businessImpact: 'high', effort: 'easy', effortHours: 2, rationale: 'Accessibility compliance requirement' },
    { findingId: 'f3', businessImpact: 'high', effort: 'difficult', effortHours: 16, rationale: 'Performance impact on user experience' }
  ],
  metadata: { url: 'https://example.com', title: 'Example Website' }
};

describe('ConfidenceValidator', () => {
  it('validates a correct AuditReport', () => {
    const validator = new ConfidenceValidator({ logger });
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);

    assert.ok(validatedReport);
    assert.ok(confidence.score > 0);
    assert.ok(confidence.verifiedDataPoints.length > 0);
    assert.ok(Array.isArray(confidence.excludedDataPoints));
  });

  it('returns high confidence for complete report', () => {
    const validator = new ConfidenceValidator({ logger });
    const { confidence } = validator.validate(sampleAuditReport);
    assert.ok(confidence.score >= 0.8);
  });

  it('filters out invalid finding groups', () => {
    const report = {
      ...sampleAuditReport,
      findingGroups: [
        { id: 'g1', name: 'Valid Group', category: 'security', maxSeverity: 'critical', count: 1, findings: [] },
        { id: '', name: '', category: '', maxSeverity: '', count: -1, findings: 'not-array' }
      ]
    };
    const validator = new ConfidenceValidator({ logger });
    const { validatedReport, confidence } = validator.validate(report);
    assert.equal(validatedReport.findingGroups.length, 1);
    assert.ok(confidence.excludedDataPoints.length > 0);
  });

  it('filters out invalid impact assessments', () => {
    const report = {
      ...sampleAuditReport,
      impactAssessments: [
        { findingId: 'f1', businessImpact: 'critical', effort: 'moderate', effortHours: 8, rationale: 'Valid' },
        { findingId: '', businessImpact: '', effort: '', effortHours: -1, rationale: '' }
      ]
    };
    const validator = new ConfidenceValidator({ logger });
    const { validatedReport, confidence } = validator.validate(report);
    assert.equal(validatedReport.impactAssessments.length, 1);
    assert.ok(confidence.excludedDataPoints.length > 0);
  });

  it('handles null report gracefully', () => {
    const validator = new ConfidenceValidator({ logger });
    assert.throws(() => validator.validate(null), /non-null object/);
  });

  it('handles empty report', () => {
    const validator = new ConfidenceValidator({ logger });
    const { validatedReport, confidence } = validator.validate({});
    assert.ok(validatedReport);
    assert.ok(confidence.score >= 0);
  });
});

describe('ReportBuilder', () => {
  const validator = new ConfidenceValidator({ logger });
  const builder = new ReportBuilder();

  it('builds complete ReportData', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);

    assert.ok(data.url);
    assert.ok(data.title);
    assert.ok(data.generatedAt);
    assert.ok(data.executive);
    assert.ok(data.developer);
    assert.ok(data.business);
    assert.ok(data.roadmap);
    assert.ok(data.overallConfidence);
  });

  it('builds executive section with correct counts', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    assert.equal(data.executive.totalFindings, 8);
    assert.equal(data.executive.bySeverity.critical, 1);
    assert.equal(data.executive.bySeverity.high, 3);
  });

  it('builds developer section with groups', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    assert.ok(data.developer.groups.length > 0);
    assert.ok(data.developer.quickWins.length > 0);
  });

  it('builds business section with cost estimate', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    assert.ok(data.business.totalEffortHours > 0);
    assert.ok(data.business.estimatedCost > 0);
    assert.ok(data.business.roi.length > 0);
  });

  it('builds roadmap with phases', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    assert.ok(data.roadmap.phases.length > 0);
    assert.ok(data.roadmap.totalEstimatedHours > 0);
    assert.ok(data.roadmap.estimatedTimeline);
  });

  it('organizes roadmap phases by severity', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    const phaseNames = data.roadmap.phases.map(p => p.name);
    assert.ok(phaseNames.some(n => n.includes('Critical')));
    assert.ok(phaseNames.some(n => n.includes('High')));
  });
});

describe('MarkdownRenderer', () => {
  const validator = new ConfidenceValidator({ logger });
  const builder = new ReportBuilder();
  const renderer = new MarkdownRenderer();

  it('renders complete Markdown report', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    const result = renderer.render(data);

    assert.equal(result.format, 'markdown');
    assert.ok(result.content.includes('# '));
    assert.ok(result.content.includes('Executive Summary'));
    assert.ok(result.content.includes('Developer Report'));
    assert.ok(result.content.includes('Business Summary'));
    assert.ok(result.content.includes('Implementation Roadmap'));
    assert.ok(result.filename.endsWith('.md'));
    assert.ok(result.mimeType === 'text/markdown');
    assert.ok(result.sizeBytes > 0);
  });

  it('includes confidence scores in output', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    const result = renderer.render(data);
    assert.ok(result.content.includes('Confidence'));
    assert.ok(result.content.includes('%'));
  });

  it('includes severity badges', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    const result = renderer.render(data);
    assert.ok(result.content.includes('Critical'));
    assert.ok(result.content.includes('High'));
  });
});

describe('HtmlRenderer', () => {
  const validator = new ConfidenceValidator({ logger });
  const builder = new ReportBuilder();
  const renderer = new HtmlRenderer();

  it('renders complete HTML report', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    const result = renderer.render(data);

    assert.equal(result.format, 'html');
    assert.ok(result.content.includes('<!DOCTYPE html>'));
    assert.ok(result.content.includes('<html'));
    assert.ok(result.content.includes('Executive Summary'));
    assert.ok(result.content.includes('Developer Report'));
    assert.ok(result.content.includes('Business Summary'));
    assert.ok(result.content.includes('Implementation Roadmap'));
    assert.ok(result.filename.endsWith('.html'));
    assert.ok(result.mimeType === 'text/html');
    assert.ok(result.sizeBytes > 0);
  });

  it('includes inline CSS', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    const result = renderer.render(data);
    assert.ok(result.content.includes('<style>'));
    assert.ok(result.content.includes('font-family'));
  });

  it('escapes HTML in content', () => {
    const { validatedReport, confidence } = validator.validate({
      ...sampleAuditReport,
      executiveSummary: { ...sampleAuditReport.executiveSummary, overview: 'Test <script>alert("xss")</script>' }
    });
    const data = builder.build(validatedReport, confidence);
    const result = renderer.render(data);
    assert.ok(!result.content.includes('<script>'));
    assert.ok(result.content.includes('&lt;script&gt;'));
  });

  it('includes print media query for PDF compatibility', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    const result = renderer.render(data);
    assert.ok(result.content.includes('@media print'));
  });
});

describe('JsonRenderer', () => {
  const validator = new ConfidenceValidator({ logger });
  const builder = new ReportBuilder();
  const renderer = new JsonRenderer();

  it('renders valid JSON output', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    const result = renderer.render(data);

    assert.equal(result.format, 'json');
    assert.ok(result.filename.endsWith('.json'));
    assert.ok(result.mimeType === 'application/json');
    assert.ok(result.sizeBytes > 0);

    const parsed = JSON.parse(result.content);
    assert.ok(parsed.report);
    assert.ok(parsed.executive);
    assert.ok(parsed.developer);
    assert.ok(parsed.business);
    assert.ok(parsed.roadmap);
    assert.ok(parsed.confidence);
  });

  it('includes all report sections in JSON', () => {
    const { validatedReport, confidence } = validator.validate(sampleAuditReport);
    const data = builder.build(validatedReport, confidence);
    const result = renderer.render(data);
    const parsed = JSON.parse(result.content);

    assert.ok(parsed.executive.totalFindings > 0);
    assert.ok(parsed.developer.groups.length > 0);
    assert.ok(parsed.business.totalEffortHours > 0);
    assert.ok(parsed.roadmap.phases.length > 0);
  });
});

describe('ReportAgent', () => {
  const createAgent = () => new ReportAgent({ logger });

  it('has correct id and name', () => {
    const agent = createAgent();
    assert.equal(agent.id, 'report-agent');
    assert.equal(agent.name, 'Report Agent');
  });

  it('processes audit report and returns all formats', async () => {
    const agent = createAgent();
    const result = await agent.run({
      input: JSON.stringify({
        auditReportJson: JSON.stringify(sampleAuditReport),
        formats: ['markdown', 'html', 'json']
      })
    });

    const output = JSON.parse(result.output);
    assert.ok(output.reports.length === 3);
    assert.ok(output.data);
    assert.ok(output.confidence);
    assert.ok(output.metadata);
  });

  it('returns only requested formats', async () => {
    const agent = createAgent();
    const result = await agent.run({
      input: JSON.stringify({
        auditReportJson: JSON.stringify(sampleAuditReport),
        formats: ['json']
      })
    });

    const output = JSON.parse(result.output);
    assert.equal(output.reports.length, 1);
    assert.equal(output.reports[0].format, 'json');
  });

  it('defaults to all formats when none specified', async () => {
    const agent = createAgent();
    const result = await agent.run({
      input: JSON.stringify({
        auditReportJson: JSON.stringify(sampleAuditReport)
      })
    });

    const output = JSON.parse(result.output);
    assert.equal(output.reports.length, 3);
  });

  it('validates confidence scores', async () => {
    const agent = createAgent();
    const result = await agent.run({
      input: JSON.stringify({
        auditReportJson: JSON.stringify(sampleAuditReport)
      })
    });

    const output = JSON.parse(result.output);
    assert.ok(output.confidence.score > 0);
    assert.ok(output.confidence.score <= 1);
    assert.ok(output.confidence.rationale.length > 0);
    assert.ok(Array.isArray(output.confidence.verifiedDataPoints));
  });

  it('returns error for invalid input', async () => {
    const agent = createAgent();
    const result = await agent.run({ input: 'not json' });
    const output = JSON.parse(result.output);
    assert.ok(output.error);
  });

  it('returns error for missing auditReportJson', async () => {
    const agent = createAgent();
    const result = await agent.run({ input: JSON.stringify({ formats: ['json'] }) });
    const output = JSON.parse(result.output);
    assert.ok(output.error);
    assert.ok(output.message.includes('auditReportJson'));
  });

  it('returns error for failed audit report', async () => {
    const agent = createAgent();
    const result = await agent.run({
      input: JSON.stringify({
        auditReportJson: JSON.stringify({ error: 'Audit failed', message: 'No findings' })
      })
    });
    const output = JSON.parse(result.output);
    assert.ok(output.error);
    assert.ok(output.message.includes('failed audit'));
  });

  it('rejects invalid formats', async () => {
    const agent = createAgent();
    const result = await agent.run({
      input: JSON.stringify({
        auditReportJson: JSON.stringify(sampleAuditReport),
        formats: ['pdf']
      })
    });
    const output = JSON.parse(result.output);
    assert.ok(output.error);
    assert.ok(output.message.includes('Invalid format'));
  });

  it('includes metadata in result', async () => {
    const agent = createAgent();
    const result = await agent.run({
      input: JSON.stringify({
        auditReportJson: JSON.stringify(sampleAuditReport)
      })
    });

    assert.ok(result.metadata);
    assert.equal(result.metadata.agentId, 'report-agent');
    assert.ok(result.metadata.formats);
    assert.ok(result.metadata.durationMs > 0);
    assert.ok(typeof result.metadata.confidence === 'number');
  });

  it('renders markdown with executive summary', async () => {
    const agent = createAgent();
    const result = await agent.run({
      input: JSON.stringify({
        auditReportJson: JSON.stringify(sampleAuditReport),
        formats: ['markdown']
      })
    });

    const output = JSON.parse(result.output);
    const md = output.reports[0].content;
    assert.ok(md.includes('Executive Summary'));
    assert.ok(md.includes('XSS'));
    assert.ok(md.includes('Critical'));
  });

  it('renders html with all sections', async () => {
    const agent = createAgent();
    const result = await agent.run({
      input: JSON.stringify({
        auditReportJson: JSON.stringify(sampleAuditReport),
        formats: ['html']
      })
    });

    const output = JSON.parse(result.output);
    const html = output.reports[0].content;
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('Executive Summary'));
    assert.ok(html.includes('Developer Report'));
    assert.ok(html.includes('Business Summary'));
    assert.ok(html.includes('Implementation Roadmap'));
  });
});
