# Replex Agent Runtime

A production-ready Agent Runtime skeleton for Node.js and Express.

The runtime contains no business logic. It orchestrates pluggable modules through interfaces:

- Agents
- Tools
- LLM providers
- Memory
- Context
- Prompt builders
- RAG providers
- Logging
- Configuration

## Quick Start

```bash
npm install
npm run check
npm test
npm start
```

## Structure

```text
src/
  application/      Runtime orchestration, context assembly, and use cases
  config/           Config manager
  domain/           Interface typedefs and runtime errors
  infrastructure/   Concrete adapters, collectors, registries, and DI
  presentation/     Express app, routes, middleware
  server.js         Process entrypoint
```

## Context Engine

The Context Engine assembles a structured `AgentContext` from caller-provided context fragments. It does not implement RAG or retrieval.

Supported sections:

- `project`
- `audit`
- `website`
- `findings`
- `userSettings`
- `conversation`
- `businessRules`
- supplemental `metadata`

Context source collectors live in `src/infrastructure/context/collectors`. The engine and projector live in `src/application/context`.

To add a future repository agent context source, implement the `ContextCollector` JSDoc contract in `src/domain/interfaces/context.interface.js`, then register it in `createDefaultContextCollectors()` or replace the `contextCollectors` dependency in DI.

## Plugging In Modules

Implement the JSDoc interface typedefs in `src/domain/interfaces`, then register implementations in `src/infrastructure/di/createContainer.js`.

The runtime composes modules and coordinates async workflows. Domain-specific behavior belongs in external agents, tools, providers, memory stores, prompt builders, or context collectors.
