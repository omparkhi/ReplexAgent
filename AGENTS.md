# Agent Development Guidelines

## Goal
- Build the ReplexAgent production-ready modular Agent Runtime phase by phase: Memory Engine, Prompt Builder, Tool Registry, LLM Provider Abstraction, Reasoning Engine, RAG Module, Website Audit Agent, and Report Agent.

## Constraints & Preferences
- Node.js, MongoDB, Express, ES modules
- Never hardcode prompt text — use reusable JSON templates
- Adapter Pattern for LLM providers and RAG providers — do NOT hardcode providers
- Reasoning Engine must never reason over raw text — only structured data
- Do not expose internal reasoning (Chain of Thought) to output
- If confidence is low, respond with uncertainty — no hallucination
- Structured JSON output with confidence score, evidence, sources, recommendations
- RAG: semantic search, never crawl websites, audit input is pre-completed structured JSON
- Report Agent: no hallucination, only verified findings, confidence scoring on all outputs
- Production-ready code with tests, type checking, error handling

## Progress
### Done
- **Memory Engine** — MongoDB + InMemory fallback, APIs: saveMemory, searchMemory, deleteMemory, getRecent, countMemory, bulkSaveMemory. Graceful MongoDB shutdown in server.js. 23 memory tests.
- **Prompt Builder** — JSON template system with `{{variable}}` interpolation, conditional sections, priority ordering. TemplateRegistry, TemplateLoader, DefaultPromptBuilder. 18 prompt tests. Template at `src/infrastructure/prompts/templates/runtime-agent.json`.
- **Tool Registry** — ToolValidator (kebab-case, JSON Schema), ToolExecutor (timeout via AbortSignal, retry with exponential backoff, result normalization), PermissionChecker, enhanced ToolRegistry (dynamic registration, filtering, MCP compat). Builtin echo + system-info tools. 41 tool tests.
- **LLM Provider Abstraction** — BaseLlmProvider (retry, timeout, rate limiting, logging), NvidiaNimProvider (Kimi K2 via NVIDIA NIM, streaming), LlmProviderFactory (Adapter Pattern). 8 LLM env vars in config. 16 LLM tests.
- **Reasoning Engine** — `ReasoningEngine` orchestrates multi-step LLM reasoning over structured data. `ReasoningValidator` normalizes/validates output. `reasoning.interface.js` types. `PromptBuildInput` extended with `ReasoningContext`. RuntimeAgent integrates reasoning (optional, graceful fallback). 15 reasoning tests.
- **RAG Module** — Full pipeline: Chunk → Embed → Store → Retrieve → Rank → Inject. `DocumentChunker` (recursive/fixed/semantic strategies). Embedding providers: `BaseEmbeddingProvider`, `OpenAiEmbeddingProvider`, `NvidiaNimEmbeddingProvider`, `EmbeddingProviderFactory`. Vector stores: `MongoAtlasVectorStore` (Atlas Vector Search), `NullVectorStore`, `VectorStoreFactory`. `SemanticRagProvider` orchestrates full pipeline. `Reranker` (score + diversity + recency). `KnowledgeSourceManager` (7 sources: audit-report, seo-knowledge, accessibility-docs, owasp, lighthouse-docs, schema-org, custom). 10 RAG env vars in config. 36 RAG tests.
- **Website Audit Agent** — `WebsiteAuditAgent` class, `AuditAnalyzer` (grouping, severity/category counts), `ImpactEstimator` (business impact + effort estimation + priority scoring), `ReportGenerator` (executive summary, developer summary, priority matrix, action plan). Prompt template. Registered in DI + AgentRegistry. 20 audit tests.
- **Report Agent** — `ReportAgent` transforms AuditReport into formatted reports. `ConfidenceValidator` (no hallucination, verified findings only), `ReportBuilder` (AuditReport → structured ReportData with executive/developer/business/roadmap sections), `MarkdownRenderer` (Markdown, PDF-compatible), `HtmlRenderer` (self-contained HTML with inline CSS, print media queries), `JsonRenderer` (structured JSON). Confidence scoring on all outputs. Registered in DI + AgentRegistry. 33 report tests.
- **CLI Testing Harness** — `npm run test-agent -- <file.json>` with progress steps, colored output, detailed results (Overall Health, Priority Issues, Business Impact, Confidence, Execution Time), saves reports to `test-results/`. Options: `--format <fmt>`, `--quiet`. Test data: 6 Lighthouse-based audit files (good, average, poor, startup, ecommerce, landing-page).
- **All 200 tests pass**, TypeScript type check clean.

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- **Adapter Pattern for LLM providers** — factory creates providers from config, new providers added by extending BaseLlmProvider and registering in factory
- **Adapter Pattern for RAG providers** — EmbeddingProviderFactory + VectorStoreFactory, swap via env vars (openai|nvidia-nim for embeddings, mongo-atlas|null for vector store)
- **Template-based prompts** — JSON files with sections, conditions, priorities; avoids hardcoded prompt text
- **Tool result normalization** — `ToolExecutionResult` with `{ data, metadata: { success, durationMs, attempt, error } }`
- **Rate limiting via sliding window** — `BaseLlmProvider` tracks request timestamps, waits when limit hit
- **Reasoning Engine architecture** — lives at `src/application/reasoning/`, consumes structured data, uses LLM for reasoning but never exposes internal CoT. Returns structured `ReasoningOutput` with confidence, evidence, sources, recommendations, uncertainties.
- **RAG architecture** — `SemanticRagProvider` as main entry, uses `EmbeddingProviderFactory` + `VectorStoreFactory` (Adapter Pattern). `ragProvider` config controls `null` vs `semantic`. MongoDB Atlas Vector Search with `$vectorSearch` aggregation. Reranker adds diversity/recency weighting.
- **Website Audit Agent** — Standalone agent (not a RuntimeAgent subclass) that composes AuditAnalyzer, ImpactEstimator, ReportGenerator. Parses structured audit JSON input, uses context/memory/rag/prompt-builder, produces full AuditReport JSON. Never crawls or performs audits.
- **Report Agent architecture** — Stateless agent (no LLM dependency) that validates, builds, and renders. `ConfidenceValidator` ensures no hallucination by verifying every data point. `ReportBuilder` transforms AuditReport into 4 sections (executive, developer, business, roadmap). Renderers produce Markdown (PDF-compatible via pandoc), self-contained HTML (inline CSS, print media), and structured JSON. Each section gets its own confidence score.
- **Confidence scoring** — Every piece of data gets a 0-1 confidence score with rationale, verified data points list, and excluded data points list. No LLM generation of facts — only programmatic transformation of verified audit data.

## Next Steps
1. Consider additional agents (e.g., Security Scanner, Performance Monitor, Content Optimizer)
2. Add PDF renderer (via puppeteer or wkhtmltopdf) for direct PDF output
3. Add batch audit processing capability
4. Consider adding report scheduling/automation

## Critical Context
- RuntimeAgent pipeline: contextProvider.create() → ragProvider.retrieve() → memoryStore.search() → reasoningEngine.reason() → promptBuilder.build() → llmProvider.complete() → memoryStore.save(). ReasoningEngine is optional.
- AgentContext has: project, audit, website, findings, userSettings, conversation, businessRules — all structured.
- Memory records have: key, type, value, namespace, agentId, conversationId, userId, tags, metadata. `MemorySearchQuery` uses `text` not `query`.
- PromptBuildInput has: context, memory, rag, reasoning, metadata. `ReasoningContext` typedef added.
- NvidiaNimProvider uses `fetch()` (not axios). Default model: `moonshotai/kimi-k2.6`.
- Config fields: nodeEnv, port, logLevel, requestBodyLimit, memoryProvider, mongoUri, mongoDatabase, mongoMemoryCollection, llmProvider, llmApiKey, llmModel, llmBaseUrl, llmMaxTokens, llmTemperature, llmTimeout, llmMaxRetries, llmRateLimitRpm, ragProvider, embeddingProvider, embeddingApiKey, embeddingBaseUrl, embeddingModel, embeddingDimensions, vectorStoreProvider, ragCollectionName, ragDefaultTopK, ragMinScore.
- DI container uses `registerSingleton` with lazy factories.
- Website Audit Agent input must be valid JSON with `url` and `findings[]` (each with id, title, severity, category). Output is `AuditReport` JSON with executiveSummary, developerSummary, priorityMatrix, actionPlan, findingGroups, impactAssessments.
- Report Agent input must be valid JSON with `auditReportJson` (AuditReport JSON string) and optional `formats` array (markdown, html, json; default: all three). Output is `{ reports: [{format, content, filename, mimeType, sizeBytes}], data: ReportData, confidence: ConfidenceScore, metadata }`.
- Report Agent pipeline: parse input → parse auditReportJson → ConfidenceValidator.validate() → ReportBuilder.build() → renderers.render() → return. No LLM calls — pure programmatic transformation.
- CLI testing harness: `node scripts/run-agent.js <file.json> [--report-only] [--format <fmt>]`. Uses mock dependencies, saves to `test-results/`.
- Test data files: Lighthouse-based structure with `scores`, `metrics` (FCP/LCP/TBT/CLS/SpeedIndex/Interactive/TTFB), `findings`, `opportunities`, `metadata`.

## Relevant Files
- `src/server.js` — Process entrypoint with graceful shutdown
- `src/config/configManager.js` — Zod-validated env config with LLM + RAG vars
- `src/domain/interfaces/` — All JSDoc typedef interfaces (agent, audit, config, context, embedding, llm-provider, memory, prompt-builder, rag, reasoning, tool, report)
- `src/domain/errors/` — AppError, NotFoundError, ValidationError, ToolPermissionError, ToolTimeoutError, ToolValidationError
- `src/application/AgentRuntime.js` — Facade: runAgent(), executeTool(), listAgents(), listTools()
- `src/application/RuntimeAgent.js` — Main agent: context → rag → memory → reasoning → prompt → llm → memory
- `src/application/WebsiteAuditAgent.js` — Audit analysis agent: parse input → context → rag → analyze → estimate → generate report
- `src/application/ReportAgent.js` — Report generation agent: validate → build → render (markdown, html, json)
- `src/application/audit/AuditAnalyzer.js` — Groups findings, counts severity/category, calculates risk
- `src/application/audit/ImpactEstimator.js` — Business impact, effort estimation, priority scoring
- `src/application/audit/ReportGenerator.js` — Executive/developer summaries, priority matrix, action plan
- `src/application/audit/index.js` — Audit module barrel export
- `src/application/report/ConfidenceValidator.js` — Validates findings, ensures no hallucination, calculates confidence scores
- `src/application/report/ReportBuilder.js` — Transforms AuditReport → structured ReportData (executive, developer, business, roadmap sections)
- `src/application/report/MarkdownRenderer.js` — Renders ReportData to Markdown (PDF-compatible)
- `src/application/report/HtmlRenderer.js` — Renders ReportData to self-contained HTML with inline CSS
- `src/application/report/JsonRenderer.js` — Renders ReportData to structured JSON
- `src/application/report/index.js` — Report module barrel export
- `src/application/reasoning/ReasoningEngine.js` — Multi-step LLM reasoning over structured data
- `src/application/reasoning/ReasoningValidator.js` — Validates/normalizes reasoning output
- `src/application/reasoning/index.js` — Reasoning module barrel export
- `src/application/memory/MemoryEngine.js` — Memory CRUD with validation, count, bulk save
- `src/application/registerDefaults.js` — Wires RuntimeAgent + WebsiteAuditAgent + ReportAgent + builtin tools
- `src/infrastructure/di/createContainer.js` — Full DI wiring (config, logger, memory, tools, llm, prompts, context, reasoning, rag)
- `src/infrastructure/di/Container.js` — Simple singleton DI container
- `src/infrastructure/memory/MongoConnection.js` — MongoDB client wrapper
- `src/infrastructure/memory/MongoMemoryRepository.js` — MongoDB memory implementation
- `src/infrastructure/memory/InMemoryStore.js` — In-memory fallback
- `src/infrastructure/prompts/DefaultPromptBuilder.js` — Template-based prompt composition
- `src/infrastructure/prompts/TemplateRegistry.js` — Stores templates by agent ID
- `src/infrastructure/prompts/TemplateLoader.js` — Loads JSON template files
- `src/infrastructure/prompts/templates/runtime-agent.json` — Default 11-section template
- `src/infrastructure/prompts/templates/reasoning-engine.json` — Reasoning engine template
- `src/infrastructure/prompts/templates/website-audit-agent.json` — Audit agent template
- `src/infrastructure/rag/DocumentChunker.js` — 3 chunking strategies: recursive, fixed, semantic
- `src/infrastructure/rag/BaseEmbeddingProvider.js` — Base with retry, timeout, rate limiting, batch
- `src/infrastructure/rag/OpenAiEmbeddingProvider.js` — OpenAI text-embedding-3-small
- `src/infrastructure/rag/NvidiaNimEmbeddingProvider.js` — NVIDIA NIM nv-embedqa-e5-v5
- `src/infrastructure/rag/EmbeddingProviderFactory.js` — Adapter Pattern for embedding providers
- `src/infrastructure/rag/MongoAtlasVectorStore.js` — MongoDB Atlas Vector Search ($vectorSearch)
- `src/infrastructure/rag/NullVectorStore.js` — In-memory vector store for testing
- `src/infrastructure/rag/VectorStoreFactory.js` — Adapter Pattern for vector stores
- `src/infrastructure/rag/SemanticRagProvider.js` — Full RAG: Chunk → Embed → Store → Retrieve → Rank → Inject
- `src/infrastructure/rag/Reranker.js` — Score + diversity + recency reranking
- `src/infrastructure/rag/KnowledgeSourceManager.js` — 7 knowledge sources with config + validation
- `src/infrastructure/rag/NullRagProvider.js` — No-op RAG provider (full interface)
- `src/infrastructure/rag/index.js` — RAG module barrel export
- `src/infrastructure/registries/ToolRegistry.js` — Tool registry with validation, permissions, MCP
- `src/infrastructure/tools/ToolValidator.js` — Definition + input validation
- `src/infrastructure/tools/ToolExecutor.js` — Timeout, retry, result normalization
- `src/infrastructure/tools/PermissionChecker.js` — Permission-based access control
- `src/infrastructure/tools/builtin/index.js` — echo + system-info tools
- `src/infrastructure/providers/BaseLlmProvider.js` — Base with retry, timeout, rate limiting
- `src/infrastructure/providers/NvidiaNimProvider.js` — Kimi K2 via NVIDIA NIM (fetch-based)
- `src/infrastructure/providers/NullLlmProvider.js` — Placeholder provider
- `src/infrastructure/providers/LlmProviderFactory.js` — Adapter Pattern factory
- `src/presentation/http/` — Express app, controllers (agent, health, memory, tool), routes, middleware
- `scripts/run-agent.js` — CLI testing harness (mock deps, no network/DB/LLM)
- `test/memory-engine.test.js` — 23 memory tests
- `test/prompt-builder.test.js` — 18 prompt tests
- `test/tool-registry.test.js` — 41 tool tests
- `test/llm-provider.test.js` — 16 LLM tests
- `test/reasoning-engine.test.js` — 15 reasoning tests
- `test/rag-module.test.js` — 36 RAG tests
- `test/website-audit-agent.test.js` — 20 audit tests
- `test/report-agent.test.js` — 33 report tests
- `test/runtime-http.test.js` — Integration HTTP tests
- `.env.example` — All environment variables documented (LLM + RAG sections)
- `test-data/sample-audit.json` — 14 findings across 5 categories (original sample)
- `test-data/good-site.json` — Chrome Developers (96/100/100/100, 1 finding, CLEAN)
- `test-data/average-site.json` — BBC (52/88/82/79, 8 findings, HIGH)
- `test-data/poor-site.json` — Legacy Corp (18/42/35/29, 18 findings, CRITICAL)
- `test-data/startup.json` — Notion (72/92/89/85, 9 findings, MODERATE)
- `test-data/ecommerce.json` — Shopify (45/86/91/78, 13 findings, CRITICAL)
- `test-data/landing-page.json` — Stripe (82/95/97/92, 7 findings, LOW)
- `test-results/` — Generated reports from harness runs (report.json, .md, .html per site)
