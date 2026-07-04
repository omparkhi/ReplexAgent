// @ts-nocheck
import { ConfidenceValidator } from './report/ConfidenceValidator.js';
import { ReportBuilder } from './report/ReportBuilder.js';
import { MarkdownRenderer } from './report/MarkdownRenderer.js';
import { HtmlRenderer } from './report/HtmlRenderer.js';
import { JsonRenderer } from './report/JsonRenderer.js';

/**
 * Report Agent — transforms Website Audit Agent output into
 * formatted reports (Markdown, HTML, JSON) with confidence scoring.
 * No hallucination — only verified findings from AuditReport are used.
 */
export class ReportAgent {
  #logger;
  #validator;
  #builder;
  #renderers;

  /** @type {string} */
  id = 'report-agent';

  /** @type {string} */
  name = 'Report Agent';

  constructor({ logger }) {
    this.#logger = logger;
    this.#validator = new ConfidenceValidator({ logger });
    this.#builder = new ReportBuilder();
    this.#renderers = new Map([
      ['markdown', new MarkdownRenderer()],
      ['html', new HtmlRenderer()],
      ['json', new JsonRenderer()]
    ]);
  }

  /**
   * Run the report agent.
   * @param {import('../domain/interfaces/agent.interface.js').AgentRunInput} input
   * @returns {Promise<import('../domain/interfaces/agent.interface.js').AgentRunResult>}
   */
  async run(input) {
    const startTime = Date.now();

    try {
      const reportInput = this.#parseInput(input.input);
      const formats = reportInput.formats ?? ['markdown', 'html', 'json'];

      // Parse and validate the audit report
      const auditReport = this.#parseAuditReport(reportInput.auditReportJson);
      const { validatedReport, confidence: validationConfidence } = this.#validator.validate(auditReport);

      // Build structured report data
      const reportData = this.#builder.build(validatedReport, validationConfidence, reportInput.metadata);

      // Render to requested formats
      const reports = formats.map(fmt => {
        const renderer = this.#renderers.get(fmt);
        if (!renderer) {
          this.#logger?.warn?.(`Unknown format: ${fmt}, skipping`);
          return null;
        }
        return renderer.render(reportData);
      }).filter(Boolean);

      const durationMs = Date.now() - startTime;

      this.#logger?.info?.(
        `Report generated in ${durationMs}ms: ${reports.map(r => r.format).join(', ')} ` +
        `(${reports.reduce((sum, r) => sum + r.sizeBytes, 0)} bytes total, ` +
        `confidence: ${(reportData.overallConfidence.score * 100).toFixed(0)}%)`
      );

      const output = {
        reports: reports.map(r => ({
          format: r.format,
          filename: r.filename,
          mimeType: r.mimeType,
          sizeBytes: r.sizeBytes,
          content: r.content
        })),
        data: reportData,
        confidence: reportData.overallConfidence,
        metadata: {
          agentId: this.id,
          formats,
          totalSizeBytes: reports.reduce((sum, r) => sum + r.sizeBytes, 0),
          durationMs,
          validationConfidence: validationConfidence.score
        }
      };

      return {
        output: JSON.stringify(output),
        metadata: {
          agentId: this.id,
          formats,
          totalSizeBytes: output.metadata.totalSizeBytes,
          confidence: reportData.overallConfidence.score,
          durationMs
        }
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.#logger?.error?.('Report generation failed:', error.message);

      return {
        output: JSON.stringify({
          error: error.name,
          message: error.message,
          reports: [],
          data: null,
          confidence: { score: 0, rationale: 'Report generation failed', verifiedDataPoints: [], excludedDataPoints: [] }
        }),
        metadata: {
          agentId: this.id,
          error: error.message,
          durationMs
        }
      };
    }
  }

  /**
   * Parse report input from JSON string.
   */
  #parseInput(inputStr) {
    if (!inputStr || typeof inputStr !== 'string') {
      throw new Error('Report input must be a non-empty JSON string');
    }

    let parsed;
    try {
      parsed = JSON.parse(inputStr);
    } catch {
      throw new Error('Report input must be valid JSON');
    }

    if (!parsed.auditReportJson) {
      throw new Error('Report input must include auditReportJson field');
    }

    // Validate formats
    const validFormats = ['markdown', 'html', 'json'];
    if (parsed.formats) {
      if (!Array.isArray(parsed.formats)) {
        throw new Error('formats must be an array');
      }
      for (const fmt of parsed.formats) {
        if (!validFormats.includes(fmt)) {
          throw new Error(`Invalid format: ${fmt}. Valid formats: ${validFormats.join(', ')}`);
        }
      }
    }

    return parsed;
  }

  /**
   * Parse audit report from JSON string (from WebsiteAuditAgent output).
   */
  #parseAuditReport(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') {
      throw new Error('auditReportJson must be a non-empty JSON string');
    }

    let report;
    try {
      report = JSON.parse(jsonStr);
    } catch {
      throw new Error('auditReportJson must be valid JSON');
    }

    if (report.error) {
      throw new Error(`Cannot generate report from failed audit: ${report.message ?? report.error}`);
    }

    return report;
  }
}
