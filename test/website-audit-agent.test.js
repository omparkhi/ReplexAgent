// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuditAnalyzer } from '../src/application/audit/AuditAnalyzer.js';
import { ImpactEstimator } from '../src/application/audit/ImpactEstimator.js';
import { ReportGenerator } from '../src/application/audit/ReportGenerator.js';
import { WebsiteAuditAgent } from '../src/application/WebsiteAuditAgent.js';

const logger = { info() {}, warn() {}, error() {}, debug() {} };

const sampleFindings = [
  { id: 'f1', title: 'XSS vulnerability in search', description: 'User input reflected without sanitization', severity: 'critical', category: 'security', type: 'technical', recommendation: 'Sanitize all user input', element: '#search-form' },
  { id: 'f2', title: 'Missing alt text on images', description: '12 images lack alt attributes', severity: 'high', category: 'accessibility', type: 'content', recommendation: 'Add descriptive alt text to all images' },
  { id: 'f3', title: 'Slow server response time', description: 'TTFB > 2 seconds', severity: 'high', category: 'performance', type: 'performance', recommendation: 'Optimize server-side rendering and caching' },
  { id: 'f4', title: 'Missing meta descriptions', description: '8 pages lack meta descriptions', severity: 'medium', category: 'seo', type: 'metadata', recommendation: 'Add unique meta descriptions to all pages' },
  { id: 'f5', title: 'Deprecated HTML tags', description: 'Using <center> and <font> tags', severity: 'low', category: 'best-practice', type: 'technical', recommendation: 'Replace with CSS equivalents' },
  { id: 'f6', title: 'Insufficient color contrast', description: 'Text contrast ratio below 4.5:1', severity: 'high', category: 'accessibility', type: 'content', recommendation: 'Increase color contrast to meet WCAG AA' },
  { id: 'f7', title: 'Missing robots.txt', description: 'No robots.txt file found', severity: 'medium', category: 'seo', type: 'technical', recommendation: 'Create a robots.txt file' },
  { id: 'f8', title: 'Unminified JavaScript', description: '3 JS files not minified', severity: 'low', category: 'performance', type: 'performance', recommendation: 'Minify JavaScript files' }
];

const sampleAuditInput = {
  url: 'https://example.com',
  title: 'Example Website',
  findings: sampleFindings,
  auditor: 'test-auditor',
  auditedAt: '2024-01-15'
};

describe('AuditAnalyzer', () => {
  it('groups findings by category and type', () => {
    const analyzer = new AuditAnalyzer();
    const groups = analyzer.groupFindings(sampleFindings);

    assert.ok(groups.length > 0);
    groups.forEach(g => {
      assert.ok(g.id.length > 0);
      assert.ok(g.name.length > 0);
      assert.ok(g.findings.length > 0);
      assert.equal(g.count, g.findings.length);
    });
  });

  it('counts findings by severity', () => {
    const analyzer = new AuditAnalyzer();
    const counts = analyzer.countBySeverity(sampleFindings);

    assert.equal(counts.critical, 1);
    assert.equal(counts.high, 3);
    assert.equal(counts.medium, 2);
    assert.equal(counts.low, 2);
    assert.equal(counts.info, 0);
  });

  it('counts findings by category', () => {
    const analyzer = new AuditAnalyzer();
    const counts = analyzer.countByCategory(sampleFindings);

    assert.equal(counts.seo, 2);
    assert.equal(counts.accessibility, 2);
    assert.equal(counts.performance, 2);
    assert.equal(counts.security, 1);
    assert.equal(counts['best-practice'], 1);
  });

  it('calculates overall risk with critical findings', () => {
    const analyzer = new AuditAnalyzer();
    const risk = analyzer.calculateOverallRisk({ critical: 1, high: 0, medium: 0, low: 0, info: 0 });
    assert.ok(risk.includes('CRITICAL'));
  });

  it('calculates overall risk with no issues', () => {
    const analyzer = new AuditAnalyzer();
    const risk = analyzer.calculateOverallRisk({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });
    assert.ok(risk.includes('CLEAN'));
  });
});

describe('ImpactEstimator', () => {
  it('estimates impact for all findings', () => {
    const estimator = new ImpactEstimator();
    const impacts = estimator.estimateAll(sampleFindings);

    assert.equal(impacts.length, sampleFindings.length);
    impacts.forEach(impact => {
      assert.ok(impact.findingId.length > 0);
      assert.ok(['critical', 'high', 'medium', 'low', 'negligible'].includes(impact.businessImpact));
      assert.ok(['trivial', 'easy', 'moderate', 'difficult', 'complex'].includes(impact.effort));
      assert.ok(impact.effortHours > 0);
      assert.ok(impact.rationale.length > 0);
    });
  });

  it('estimates critical security as critical impact', () => {
    const estimator = new ImpactEstimator();
    const impact = estimator.estimate(sampleFindings[0]);
    assert.equal(impact.businessImpact, 'critical');
  });

  it('builds impact map', () => {
    const estimator = new ImpactEstimator();
    const impacts = estimator.estimateAll(sampleFindings);
    const map = estimator.buildImpactMap(impacts);

    assert.ok(map.size === sampleFindings.length);
    assert.ok(map.has('f1'));
    assert.ok(map.has('f2'));
  });

  it('calculates priority score', () => {
    const estimator = new ImpactEstimator();
    const impact = estimator.estimate(sampleFindings[0]);
    const score = estimator.calculatePriorityScore(sampleFindings[0], impact);

    assert.ok(score > 0);
    assert.ok(score <= 150);
  });
});

describe('ReportGenerator', () => {
  it('generates complete audit report', () => {
    const generator = new ReportGenerator();
    const estimator = new ImpactEstimator();
    const analyzer = new AuditAnalyzer();

    const groups = analyzer.groupFindings(sampleFindings);
    const impacts = estimator.estimateAll(sampleFindings);
    const impactMap = estimator.buildImpactMap(impacts);

    const priorityMatrix = sampleFindings.map(f => {
      const impact = impactMap.get(f.id);
      return {
        findingId: f.id,
        title: f.title,
        severity: f.severity,
        category: f.category,
        businessImpact: impact?.businessImpact ?? 'medium',
        effort: impact?.effort ?? 'moderate',
        priorityScore: estimator.calculatePriorityScore(f, impact ?? { findingId: f.id, businessImpact: 'medium', effort: 'moderate', effortHours: 4, rationale: '' }),
        rank: 0
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore)
      .map((item, i) => ({ ...item, rank: i + 1 }));

    const report = generator.generateReport({
      auditInput: sampleAuditInput,
      groups,
      impacts,
      priorityMatrix
    });

    assert.ok(report.executiveSummary);
    assert.ok(report.developerSummary);
    assert.ok(report.priorityMatrix.length > 0);
    assert.ok(report.actionPlan.length > 0);
    assert.ok(report.findingGroups.length > 0);
    assert.ok(report.impactAssessments.length > 0);
    assert.ok(report.metadata);
  });

  it('generates executive summary with correct counts', () => {
    const generator = new ReportGenerator();
    const summary = generator.generateExecutiveSummary(sampleAuditInput, []);

    assert.equal(summary.totalFindings, 8);
    assert.equal(summary.bySeverity.critical, 1);
    assert.equal(summary.bySeverity.high, 3);
    assert.ok(summary.overview.length > 0);
    assert.ok(summary.topAction.length > 0);
  });

  it('generates action plan sorted by severity', () => {
    const generator = new ReportGenerator();
    const estimator = new ImpactEstimator();
    const impacts = estimator.estimateAll(sampleFindings);

    const plan = generator.generateActionPlan(sampleFindings, impacts);

    assert.ok(plan.length === sampleFindings.length);
    assert.equal(plan[0].severity, 'critical');
    assert.ok(plan[0].steps.length > 0);
    assert.ok(plan[0].owner.length > 0);
    assert.ok(plan[0].deadline.length > 0);
  });
});

describe('WebsiteAuditAgent', () => {
  const createMockDeps = (llmResponse = '{}') => ({
    contextProvider: {
      create: async (input) => ({
        requestId: 'test-request',
        agentId: input.agentId,
        input: input.input,
        createdAt: new Date(),
        metadata: input.metadata ?? {},
        project: {},
        audit: { sessionId: 'test', events: [] },
        website: { url: 'https://example.com' },
        findings: [],
        userSettings: { preferences: {} },
        conversation: { messages: [] },
        businessRules: [],
        assembly: { version: 'v1', collectedAt: new Date(), sources: [] }
      })
    },
    promptBuilder: {
      build: async () => [{ role: 'user', content: 'Analyze findings' }]
    },
    llmProvider: {
      complete: async () => ({
        content: llmResponse,
        metadata: { provider: 'mock' }
      })
    },
    memoryStore: {
      save: async () => {},
      search: async () => []
    },
    ragProvider: {
      retrieve: async () => [],
      ingest: async () => ({ chunkCount: 0 }),
      countBySource: async () => 0,
      deleteBySource: async () => {}
    },
    logger
  });

  it('has correct id and name', () => {
    const agent = new WebsiteAuditAgent(createMockDeps());
    assert.equal(agent.id, 'website-audit-agent');
    assert.equal(agent.name, 'Website Audit Agent');
  });

  it('validates audit input requires URL', async () => {
    const agent = new WebsiteAuditAgent(createMockDeps());
    const result = await agent.run({ input: JSON.stringify({ findings: [] }) });

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.error);
    assert.ok(parsed.message.includes('URL'));
  });

  it('validates audit input requires findings array', async () => {
    const agent = new WebsiteAuditAgent(createMockDeps());
    const result = await agent.run({ input: JSON.stringify({ url: 'https://example.com' }) });

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.error);
    assert.ok(parsed.message.includes('findings'));
  });

  it('validates finding structure', async () => {
    const agent = new WebsiteAuditAgent(createMockDeps());
    const result = await agent.run({
      input: JSON.stringify({
        url: 'https://example.com',
        findings: [{ id: '1' }]
      })
    });

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.error);
    assert.ok(parsed.message.includes('title'));
  });

  it('processes valid audit input', async () => {
    const agent = new WebsiteAuditAgent(createMockDeps());
    const result = await agent.run({
      input: JSON.stringify(sampleAuditInput)
    });

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.executiveSummary);
    assert.ok(parsed.developerSummary);
    assert.ok(parsed.priorityMatrix);
    assert.ok(parsed.actionPlan);
    assert.ok(parsed.findingGroups);
    assert.ok(parsed.impactAssessments);
  });

  it('returns metadata with counts', async () => {
    const agent = new WebsiteAuditAgent(createMockDeps());
    const result = await agent.run({
      input: JSON.stringify(sampleAuditInput)
    });

    assert.ok(result.metadata);
    assert.equal(result.metadata.totalFindings, 8);
    assert.ok(result.metadata.severityCounts);
    assert.ok(result.metadata.categoryCounts);
    assert.ok(result.metadata.totalEffortHours > 0);
  });

  it('handles invalid JSON input gracefully', async () => {
    const agent = new WebsiteAuditAgent(createMockDeps());
    const result = await agent.run({ input: 'not valid json' });

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.error);
  });

  it('handles LLM errors gracefully', async () => {
    const deps = createMockDeps();
    deps.llmProvider.complete = async () => { throw new Error('LLM failed'); };
    const agent = new WebsiteAuditAgent(deps);
    const result = await agent.run({
      input: JSON.stringify(sampleAuditInput)
    });

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.error);
  });
});
