import { AuditAnalyzer } from './audit/AuditAnalyzer.js';
import { ImpactEstimator } from './audit/ImpactEstimator.js';
import { ReportGenerator } from './audit/ReportGenerator.js';

/**
 * @typedef {import('../domain/interfaces/agent.interface.js').AgentRunInput} AgentRunInput
 * @typedef {import('../domain/interfaces/agent.interface.js').AgentRunResult} AgentRunResult
 * @typedef {import('../domain/interfaces/audit.interface.js').AuditInput} AuditInput
 * @typedef {import('../domain/interfaces/audit.interface.js').AuditReport} AuditReport
 * @typedef {import('../domain/interfaces/audit.interface.js').PriorityItem} PriorityItem
 */

/**
 * Website Audit Agent — analyzes structured audit JSON and produces
 * executive summaries, developer summaries, priority matrices, and action plans.
 * Never crawls or performs audits. Only reasons over provided findings.
 */
export class WebsiteAuditAgent {
  /** @type {import('../domain/interfaces/context.interface.js').ContextProvider} */
  #contextProvider;

  /** @type {import('../domain/interfaces/prompt-builder.interface.js').PromptBuilder} */
  #promptBuilder;

  /** @type {import('../domain/interfaces/llm-provider.interface.js').LlmProvider} */
  #llmProvider;

  /** @type {import('../domain/interfaces/memory.interface.js').MemoryStore} */
  #memoryStore;

  /** @type {import('../domain/interfaces/rag.interface.js').RagProvider} */
  #ragProvider;

  /** @type {import('../domain/interfaces/logger.interface.js').Logger} */
  #logger;

  /** @type {AuditAnalyzer} */
  #analyzer;

  /** @type {ImpactEstimator} */
  #impactEstimator;

  /** @type {ReportGenerator} */
  #reportGenerator;

  /** @type {string} */
  id = 'website-audit-agent';

  /** @type {string} */
  name = 'Website Audit Agent';

  /**
   * @param {object} dependencies
   * @param {import('../domain/interfaces/context.interface.js').ContextProvider} dependencies.contextProvider
   * @param {import('../domain/interfaces/prompt-builder.interface.js').PromptBuilder} dependencies.promptBuilder
   * @param {import('../domain/interfaces/llm-provider.interface.js').LlmProvider} dependencies.llmProvider
   * @param {import('../domain/interfaces/memory.interface.js').MemoryStore} dependencies.memoryStore
   * @param {import('../domain/interfaces/rag.interface.js').RagProvider} dependencies.ragProvider
   * @param {import('../domain/interfaces/logger.interface.js').Logger} dependencies.logger
   */
  constructor(dependencies) {
    this.#contextProvider = dependencies.contextProvider;
    this.#promptBuilder = dependencies.promptBuilder;
    this.#llmProvider = dependencies.llmProvider;
    this.#memoryStore = dependencies.memoryStore;
    this.#ragProvider = dependencies.ragProvider;
    this.#logger = dependencies.logger;
    this.#analyzer = new AuditAnalyzer();
    this.#impactEstimator = new ImpactEstimator();
    this.#reportGenerator = new ReportGenerator();
  }

  /**
   * Run the audit analysis pipeline.
   * @param {AgentRunInput} input
   * @returns {Promise<AgentRunResult>}
   */
  async run(input) {
    const startTime = Date.now();

    this.#logger.info({ agentId: this.id }, 'Starting audit analysis');

    try {
      const auditInput = this.#parseAuditInput(input);

      const context = await this.#contextProvider.create({
        agentId: this.id,
        input: input.input,
        conversationId: input.conversationId,
        metadata: {
          ...input.metadata,
          audit: {
            sessionId: `audit-${Date.now()}`,
            events: [{ type: 'audit-analysis-started', url: auditInput.url }]
          },
          website: {
            url: auditInput.url,
            title: auditInput.title
          },
          findings: auditInput.findings.map((/** @type {AuditInput['findings'][number]} */ f) => ({
            id: f.id,
            title: f.title,
            severity: f.severity,
            description: f.description
          }))
        }
      });

      const ragResults = await this.#ragProvider.retrieve({
        query: this.#buildRagQuery(auditInput),
        sources: ['owasp', 'lighthouse-docs', 'accessibility-docs', 'seo-knowledge'],
        limit: 5
      });

      const recentMemory = await this.#memoryStore.search({
        text: `audit ${auditInput.url}`,
        limit: 3,
        namespace: this.id
      });

      const groups = this.#analyzer.groupFindings(auditInput.findings);
      const severityCounts = this.#analyzer.countBySeverity(auditInput.findings);
      const categoryCounts = this.#analyzer.countByCategory(auditInput.findings);

      const impacts = this.#impactEstimator.estimateAll(auditInput.findings);
      const impactMap = this.#impactEstimator.buildImpactMap(impacts);

      const priorityMatrix = this.#buildPriorityMatrix(auditInput.findings, impacts);

      const messages = await this.#promptBuilder.build({
        context,
        rag: {
          documents: ragResults,
          groups,
          severityCounts,
          categoryCounts,
          priorityMatrix: priorityMatrix.slice(0, 10)
        },
        memory: {
          previousAnalyses: recentMemory.map((/** @type {any} */ m) => m.value)
        }
      });

      const completion = await this.#llmProvider.complete({
        messages,
        signal: input.signal
      });

      let enhancedReport;
      try {
        enhancedReport = JSON.parse(completion.content);
      } catch {
        enhancedReport = {
          executiveSummary: completion.content,
          developerSummary: '',
          recommendations: []
        };
      }

      const report = this.#reportGenerator.generateReport({
        auditInput,
        groups,
        impacts,
        priorityMatrix
      });

      const finalReport = {
        ...report,
        executiveSummary: {
          ...report.executiveSummary,
          overview: enhancedReport.executiveSummary ?? report.executiveSummary.overview
        },
        developerSummary: {
          ...report.developerSummary,
          overview: enhancedReport.developerSummary ?? report.developerSummary.overview,
          quickWins: enhancedReport.quickWins ?? report.developerSummary.quickWins
        },
        metadata: {
          ...report.metadata,
          llmEnhanced: true,
          analysisDurationMs: Date.now() - startTime
        }
      };

      await this.#memoryStore.save({
        key: `audit-${auditInput.url}-${Date.now()}`,
        value: {
          url: auditInput.url,
          totalFindings: auditInput.findings.length,
          severityCounts,
          topPriorities: priorityMatrix.slice(0, 5).map(p => p.title)
        },
        metadata: {
          agentId: this.id,
          conversationId: input.conversationId
        }
      });

      this.#logger.info({
        url: auditInput.url,
        totalFindings: auditInput.findings.length,
        durationMs: Date.now() - startTime
      }, 'Audit analysis completed');

      return {
        output: JSON.stringify(finalReport),
        metadata: {
          agentId: this.id,
          url: auditInput.url,
          totalFindings: auditInput.findings.length,
          severityCounts,
          categoryCounts,
          totalEffortHours: impacts.reduce((/** @type {number} */ sum, /** @type {any} */ i) => sum + i.effortHours, 0),
          durationMs: Date.now() - startTime,
          llm: completion.metadata
        }
      };
    } catch (error) {
      const err = /** @type {Error} */ (error);
      this.#logger.error({ error: err.message }, 'Audit analysis failed');

      return {
        output: JSON.stringify({
          error: 'Audit analysis failed',
          message: err.message
        }),
        metadata: {
          agentId: this.id,
          error: err.message,
          durationMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Parse audit input from agent run input.
   * @param {AgentRunInput} input
   * @returns {AuditInput}
   */
  #parseAuditInput(input) {
    let parsed;

    try {
      parsed = typeof input.input === 'string' ? JSON.parse(input.input) : input.input;
    } catch {
      throw new Error('Invalid audit input: must be valid JSON');
    }

    if (!parsed.url) {
      throw new Error('Audit input must include a URL');
    }

    if (!Array.isArray(parsed.findings)) {
      throw new Error('Audit input must include a findings array');
    }

    for (const finding of parsed.findings) {
      if (!finding.id || !finding.title || !finding.severity || !finding.category) {
        throw new Error('Each finding must have id, title, severity, and category');
      }
    }

    return {
      url: parsed.url,
      title: parsed.title,
      findings: parsed.findings,
      metadata: parsed.metadata,
      auditor: parsed.auditor,
      auditedAt: parsed.auditedAt
    };
  }

  /**
   * Build RAG query from audit input.
   * @param {AuditInput} auditInput
   * @returns {string}
   */
  #buildRagQuery(auditInput) {
    const categories = [...new Set(auditInput.findings.map((/** @type {AuditInput['findings'][number]} */ f) => f.category))];
    const severities = [...new Set(auditInput.findings.map((/** @type {AuditInput['findings'][number]} */ f) => f.severity))];

    return `Website audit ${categories.join(' ')} issues ${severities.join(' ')} severity best practices fixes`;
  }

  /**
   * Build priority matrix from findings and impacts.
   * @param {import('../domain/interfaces/audit.interface.js').AuditFinding[]} findings
   * @param {import('../domain/interfaces/audit.interface.js').ImpactAssessment[]} impacts
   * @returns {PriorityItem[]}
   */
  #buildPriorityMatrix(findings, impacts) {
    const impactMap = new Map(impacts.map(i => [i.findingId, i]));

    return findings
      .map(f => {
        const impact = impactMap.get(f.id);
        const priorityScore = this.#impactEstimator.calculatePriorityScore(f, impact ?? { findingId: f.id, businessImpact: 'medium', effort: 'moderate', effortHours: 4, rationale: '' });
        return {
          findingId: f.id,
          title: f.title,
          severity: f.severity,
          category: f.category,
          businessImpact: impact?.businessImpact ?? 'medium',
          effort: impact?.effort ?? 'moderate',
          priorityScore,
          rank: 0
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }
}
