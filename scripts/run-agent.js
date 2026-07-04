#!/usr/bin/env node

/**
 * ReplexAgent — Website Agent CLI
 *
 * Usage:
 *   npm run test-agent -- test-data/good-site.json
 *   npm run test-agent -- test-data/poor-site.json
 *
 * Loads a pre-built audit JSON, runs it through the WebsiteAuditAgent
 * and ReportAgent pipeline, displays results, and saves reports.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebsiteAuditAgent } from '../src/application/WebsiteAuditAgent.js';
import { ReportAgent } from '../src/application/ReportAgent.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const RESULTS_DIR = resolve(ROOT, 'test-results');

// ── Colors ──────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

const icon = {
  ok: `${c.green}✓${c.reset}`,
  warn: `${c.yellow}⚠${c.reset}`,
  err: `${c.red}✗${c.reset}`,
  info: `${c.cyan}›${c.reset}`,
  done: `${c.green}✓${c.reset}`
};

// ── Logger (quiet during progress) ──────────────────────────────────
let silent = true;
const logger = {
  info: (...args) => { if (!silent) console.log(`  ${c.gray}${args.join(' ')}${c.reset}`); },
  warn: (...args) => console.warn(`  ${c.yellow}WARN:${c.reset}`, ...args),
  error: (...args) => console.error(`  ${c.red}ERROR:${c.reset}`, ...args),
  debug: () => {}
};

// ── Mock dependencies (no network, no DB, no LLM) ──────────────────
const mockContextProvider = {
  create: async (input) => ({
    requestId: `harness-${Date.now()}`,
    agentId: input.agentId,
    input: input.input,
    createdAt: new Date(),
    metadata: input.metadata ?? {},
    project: {},
    audit: { sessionId: 'harness', events: [] },
    website: { url: 'https://example.com' },
    findings: [],
    userSettings: { preferences: {} },
    conversation: { messages: [] },
    businessRules: [],
    assembly: { version: 'v1', collectedAt: new Date(), sources: [] }
  })
};

const mockPromptBuilder = {
  build: async () => [{ role: 'user', content: 'Analyze audit findings' }]
};

const mockLlmProvider = {
  complete: async () => ({
    content: '{}',
    metadata: { provider: 'harness-mock', model: 'none' }
  })
};

const mockMemoryStore = {
  save: async () => {},
  search: async () => [],
  delete: async () => {},
  getRecent: async () => []
};

const mockRagProvider = {
  retrieve: async () => [],
  ingest: async () => ({ chunkCount: 0 }),
  countBySource: async () => 0,
  deleteBySource: async () => {}
};

// ── Helpers ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${c.bold}ReplexAgent — Website Agent CLI${c.reset}

${c.cyan}Usage:${c.reset}
  npm run test-agent -- <file.json> [options]

${c.cyan}Options:${c.reset}
  --format <fmt>   Output format: markdown, html, json (default: all)
  --quiet          Suppress report preview output
  --help, -h       Show this help

${c.cyan}Examples:${c.reset}
  npm run test-agent -- test-data/good-site.json
  npm run test-agent -- test-data/poor-site.json
  npm run test-agent -- test-data/ecommerce.json --format markdown
`);
    process.exit(0);
  }

  const filePath = resolve(args[0]);
  const quiet = args.includes('--quiet');
  const formatIdx = args.indexOf('--format');
  const formats = formatIdx !== -1 && args[formatIdx + 1]
    ? args[formatIdx + 1].split(',').map(f => f.trim())
    : ['markdown', 'html', 'json'];

  return { filePath, quiet, formats };
}

async function loadAndValidate(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = await readFile(filePath, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }

  const errors = [];
  if (!data.url || typeof data.url !== 'string') {
    errors.push('Missing "url" field');
  }
  if (!Array.isArray(data.findings)) {
    errors.push('Missing "findings" array');
  } else {
    for (const [i, f] of data.findings.entries()) {
      if (!f.id) errors.push(`Finding[${i}]: missing "id"`);
      if (!f.title) errors.push(`Finding[${i}]: missing "title"`);
      if (!f.severity) errors.push(`Finding[${i}]: missing "severity"`);
      if (!f.category) errors.push(`Finding[${i}]: missing "category"`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed:\n  ${errors.join('\n  ')}`);
  }

  return data;
}

function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function severityColor(severity) {
  switch (severity) {
    case 'critical': return c.red;
    case 'high': return c.yellow;
    case 'medium': return c.cyan;
    case 'low': return c.green;
    default: return c.gray;
  }
}

function riskEmoji(risk) {
  if (risk.includes('CRITICAL')) return c.red;
  if (risk.includes('HIGH')) return c.yellow;
  if (risk.includes('MODERATE')) return c.cyan;
  if (risk.includes('LOW')) return c.green;
  return c.green;
}

function printProgress(msg) {
  process.stdout.write(`  ${icon.info} ${c.dim}${msg}...${c.reset}`);
}

function clearProgress() {
  process.stdout.write('\r\x1b[K');
}

function printBox(lines) {
  const maxLen = Math.max(...lines.map(l => l.length));
  const pad = (s) => s + ' '.repeat(maxLen - s.length);
  console.log(`  ${c.dim}┌${'─'.repeat(maxLen + 2)}┐${c.reset}`);
  for (const line of lines) {
    console.log(`  ${c.dim}│${c.reset} ${pad(line)} ${c.dim}│${c.reset}`);
  }
  console.log(`  ${c.dim}└${'─'.repeat(maxLen + 2)}┘${c.reset}`);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const { filePath, quiet, formats } = parseArgs();
  silent = quiet;

  const totalStart = performance.now();

  // Banner
  console.log();
  console.log(`  ${c.bold}${c.white}ReplexAgent${c.reset}  ${c.dim}—${c.reset}  ${c.cyan}Website Agent CLI${c.reset}`);
  console.log();

  // ── Step 1: Load Audit ──
  printProgress('Loading audit');
  const t0 = performance.now();
  const auditData = await loadAndValidate(filePath);
  const loadMs = performance.now() - t0;
  clearProgress();
  console.log(`  ${icon.ok} ${c.bold}Loading audit${c.reset} ${c.dim}(${formatDuration(loadMs)})${c.reset}`);

  // Count severities
  const severityCounts = {};
  for (const f of auditData.findings) {
    severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
  }

  // ── Step 2: Run WebsiteAuditAgent (simulates pipeline steps) ──
  printProgress('Loading Context');
  await new Promise(r => setTimeout(r, 15));
  clearProgress();
  console.log(`  ${icon.ok} ${c.bold}Loading Context${c.reset}`);

  printProgress('Loading Memory');
  await new Promise(r => setTimeout(r, 10));
  clearProgress();
  console.log(`  ${icon.ok} ${c.bold}Loading Memory${c.reset}`);

  printProgress('Running RAG');
  await new Promise(r => setTimeout(r, 12));
  clearProgress();
  console.log(`  ${icon.ok} ${c.bold}Running RAG${c.reset}`);

  printProgress('Calling Kimi');
  const agent = new WebsiteAuditAgent({
    contextProvider: mockContextProvider,
    promptBuilder: mockPromptBuilder,
    llmProvider: mockLlmProvider,
    memoryStore: mockMemoryStore,
    ragProvider: mockRagProvider,
    logger
  });

  const agentStart = performance.now();
  const agentResult = await agent.run({
    input: JSON.stringify(auditData),
    metadata: { harness: true, source: basename(filePath) }
  });
  const agentMs = performance.now() - agentStart;
  clearProgress();
  console.log(`  ${icon.ok} ${c.bold}Calling Kimi${c.reset} ${c.dim}(${formatDuration(agentMs)})${c.reset}`);

  const auditReport = JSON.parse(agentResult.output);
  if (auditReport.error) {
    console.log(`  ${icon.err} ${c.red}Audit failed: ${auditReport.message}${c.reset}`);
    process.exit(1);
  }

  // ── Step 3: Run ReportAgent ──
  printProgress('Generating report');
  const reportAgent = new ReportAgent({ logger });

  const reportStart = performance.now();
  const reportResult = await reportAgent.run({
    input: JSON.stringify({ auditReportJson: agentResult.output, formats })
  });
  const reportMs = performance.now() - reportStart;
  clearProgress();
  console.log(`  ${icon.ok} ${c.bold}Generating report${c.reset} ${c.dim}(${formatDuration(reportMs)})${c.reset}`);

  const output = JSON.parse(reportResult.output);
  if (output.error) {
    console.log(`  ${icon.err} ${c.red}Report failed: ${output.message}${c.reset}`);
    process.exit(1);
  }

  console.log(`  ${icon.done} ${c.bold}Done${c.reset}`);
  console.log();

  // ── Display Results ──
  const exec = auditReport.executiveSummary;
  const biz = output.data.business;
  const roadmap = output.data.roadmap;

  // Overall Health
  const riskColor = riskColorByRisk(exec.overallRisk);
  console.log(`  ${c.bold}${c.white}Overall Health${c.reset}`);
  printBox([
    `${c.bold}Risk:${c.reset}      ${riskColor}${exec.overallRisk}${c.reset}`,
    `${c.bold}Findings:${c.reset}  ${exec.totalFindings} total (${severityCounts.critical ?? 0} critical, ${severityCounts.high ?? 0} high, ${severityCounts.medium ?? 0} medium, ${severityCounts.low ?? 0} low)`,
    `${c.bold}Timeline:${c.reset}  ${exec.estimatedTimeline ?? 'TBD'}`,
    `${c.bold}Groups:${c.reset}    ${auditReport.findingGroups?.length ?? 0} finding groups`
  ]);
  console.log();

  // Priority Issues
  console.log(`  ${c.bold}${c.white}Priority Issues${c.reset}`);
  const topActions = auditReport.actionPlan?.slice(0, 5) ?? [];
  for (const action of topActions) {
    const sc = severityColor(action.severity);
    console.log(`  ${sc}●${c.reset} ${c.bold}[${action.severity.toUpperCase()}]${c.reset} ${action.title}`);
    console.log(`    ${c.dim}→ ${action.action}${c.reset}`);
    console.log(`    ${c.dim}Effort: ${action.effortHours}h (${action.effort})${c.reset}`);
  }
  if ((auditReport.actionPlan?.length ?? 0) > 5) {
    console.log(`  ${c.dim}... and ${auditReport.actionPlan.length - 5} more actions${c.reset}`);
  }
  console.log();

  // Business Impact
  console.log(`  ${c.bold}${c.white}Business Impact${c.reset}`);
  printBox([
    `${c.bold}Total Effort:${c.reset}   ${biz.totalEffortHours} hours`,
    `${c.bold}Estimated Cost:${c.reset} $${biz.estimatedCost.toLocaleString()}`,
    `${c.bold}ROI:${c.reset}            ${biz.roi.slice(0, 80)}${biz.roi.length > 80 ? '...' : ''}`,
    `${c.bold}Roadmap Phases:${c.reset} ${roadmap.phases.length} (${roadmap.estimatedTimeline})`
  ]);
  console.log();

  // Confidence
  console.log(`  ${c.bold}${c.white}Confidence${c.reset}`);
  const confPct = (output.confidence.score * 100).toFixed(0);
  const confBar = confidenceBar(output.confidence.score);
  printBox([
    `${c.bold}Score:${c.reset}      ${confBar} ${confPct}%`,
    `${c.bold}Rationale:${c.reset} ${output.confidence.rationale.slice(0, 60)}`,
    `${c.bold}Verified:${c.reset}   ${output.confidence.verifiedDataPoints.length} data points`
  ]);
  console.log();

  // Execution Time
  const totalMs = performance.now() - totalStart;
  console.log(`  ${c.bold}${c.white}Execution Time${c.reset}`);
  printBox([
    `${c.bold}Audit Agent:${c.reset}  ${formatDuration(agentMs)}`,
    `${c.bold}Report Agent:${c.reset} ${formatDuration(reportMs)}`,
    `${c.bold}Total:${c.reset}        ${formatDuration(totalMs)}`
  ]);
  console.log();

  // ── Report Preview ──
  if (!quiet) {
    for (const report of output.reports) {
      console.log(`  ${c.dim}${'─'.repeat(56)}${c.reset}`);
      console.log(`  ${c.bold}${c.cyan}${report.format.toUpperCase()}${c.reset}  ${c.dim}${report.filename} (${report.sizeBytes} bytes)${c.reset}`);
      console.log(`  ${c.dim}${'─'.repeat(56)}${c.reset}`);

      const lines = report.content.split('\n');
      const preview = lines.slice(0, 25).join('\n');
      console.log(preview);
      if (lines.length > 25) {
        console.log(`\n  ${c.dim}... (${lines.length - 25} more lines)${c.reset}`);
      }
      console.log();
    }
  }

  // ── Save Results ──
  await mkdir(RESULTS_DIR, { recursive: true });

  for (const report of output.reports) {
    const outPath = resolve(RESULTS_DIR, report.filename);
    await writeFile(outPath, report.content, 'utf-8');
  }

  const fullReport = {
    meta: {
      url: auditData.url,
      title: auditData.title,
      generatedAt: output.data.generatedAt,
      sourceFile: basename(filePath),
      scores: auditData.scores ?? null,
      metrics: auditData.metrics ?? null
    },
    confidence: output.confidence,
    executive: output.data.executive,
    developer: output.data.developer,
    business: output.data.business,
    roadmap: output.data.roadmap
  };

  const fullPath = resolve(RESULTS_DIR, 'report.json');
  await writeFile(fullPath, JSON.stringify(fullReport, null, 2), 'utf-8');

  const files = output.reports.map(r => r.filename).concat(['report.json']);
  console.log(`  ${icon.done} ${c.bold}Saved ${files.length} files to ${c.cyan}test-results/${c.reset}`);
  for (const f of files) {
    console.log(`     ${c.dim}→ ${f}${c.reset}`);
  }
  console.log();
}

function riskColorByRisk(risk) {
  if (risk.includes('CRITICAL')) return c.red;
  if (risk.includes('HIGH')) return c.yellow;
  if (risk.includes('MODERATE')) return c.cyan;
  if (risk.includes('LOW')) return c.green;
  if (risk.includes('CLEAN')) return c.green;
  return c.white;
}

function confidenceBar(score) {
  const filled = Math.round(score * 10);
  const empty = 10 - filled;
  const color = score >= 0.8 ? c.green : score >= 0.5 ? c.yellow : c.red;
  return `${color}${'█'.repeat(filled)}${c.dim}${'░'.repeat(empty)}${c.reset}`;
}

main().catch(err => {
  console.error(`\n  ${icon.err} ${c.red}${err.message}${c.reset}`);
  process.exit(1);
});
