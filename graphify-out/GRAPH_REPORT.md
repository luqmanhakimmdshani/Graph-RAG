# Graph Report - RAG  (2026-09-24)

## Corpus Check
- 70 files · ~524,419 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 559 nodes · 898 edges · 33 communities (28 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b997ac5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graph RAG Capstone — Product Requirements Document
- compilerOptions
- devDependencies
- compilerOptions
- ComparePage.tsx
- test_core.py
- Graph RAG Capstone: Project Context
- plugins
- extraction.py
- Graph RAG Capstone
- graphdb.py
- React + TypeScript + Vite
- query.py
- prepare_corpus.py
- tsconfig.json
- config.py
- ErrorBoundary.tsx
- AboutPage.tsx
- App.tsx
- apiGet
- EvalPage.tsx
- Intent: Project Audit & Next-Phase Build-Out
- DashboardPage.tsx
- Graph RAG API
- Brag Plan: Graph RAG
- LandingPage.tsx
- Hyperframes Composition Brief: Graph RAG
- vercel.json
- react
- AdminPage.tsx

## God Nodes (most connected - your core abstractions)
1. `apiGet()` - 22 edges
2. `_session()` - 18 edges
3. `react` - 18 edges
4. `compilerOptions` - 18 edges
5. `query_graph_rag()` - 17 edges
6. `Graph RAG Capstone — Product Requirements Document` - 16 edges
7. `compilerOptions` - 15 edges
8. `Brag Plan: Graph RAG` - 15 edges
9. `Graph RAG Capstone: Project Context` - 15 edges
10. `ingest_articles()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `refresh()` --calls--> `apiGet()`  [EXTRACTED]
  frontend/src/pages/AdminPage.tsx → frontend/src/lib/api.ts
- `load()` --calls--> `apiGet()`  [EXTRACTED]
  frontend/src/pages/DashboardPage.tsx → frontend/src/lib/api.ts
- `_run_eval_job()` --calls--> `JudgeScore`  [EXTRACTED]
  backend/app/routers/eval.py → backend/app/services/eval.py
- `_run_eval_job()` --calls--> `score()`  [EXTRACTED]
  backend/app/routers/eval.py → backend/app/services/eval.py
- `_run_ingest()` --calls--> `ingest_articles()`  [EXTRACTED]
  backend/app/routers/ingest.py → backend/app/services/ingestion.py

## Import Cycles
- None detected.

## Communities (33 total, 2 thin omitted)

### Community 0 - "Graph RAG Capstone — Product Requirements Document"
Cohesion: 0.07
Nodes (26): 10. Non-Functional Requirements, 11. Integrations & Dependencies, 12. Milestones & Phased Rollout, 13. Risks & Mitigations, 14. Open Questions / Assumptions, 15. Appendix, 1. Document Control, 2. Executive Summary (+18 more)

### Community 1 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 2 - "devDependencies"
Cohesion: 0.05
Nodes (41): 3d-force-graph, dependencies, 3d-force-graph, lucide-react, react, react-dom, react-router-dom, devDependencies (+33 more)

### Community 3 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 4 - "ComparePage.tsx"
Cohesion: 0.06
Nodes (30): cssVar(), fitCamera(), GraphEdge, GraphNode, Node3D, SubgraphView(), TYPE_COLORS, ChatPage() (+22 more)

### Community 5 - "test_core.py"
Cohesion: 0.09
Nodes (35): JudgeScore, BaseModel, LLM-as-judge benchmark scoring (FR-21) - relevance and faithfulness, 0-5 each,…, score(), normalize_name(), _client(), generate(), generate_json() (+27 more)

### Community 6 - "Graph RAG Capstone: Project Context"
Cohesion: 0.08
Nodes (23): 10. Limitations (said honestly), 11. Future work, 12. Demo script (for the defense), 13. Glossary, 14. Likely panel questions, with answers, 1. The project in one paragraph, 2. The problem it solves, 3. The data (+15 more)

### Community 7 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 8 - "extraction.py"
Cohesion: 0.10
Nodes (28): chunk_text(), Splits article bodies into overlapping word-count chunks. Token counts aren't…, _client(), Entity, extract(), _extract_gemini(), ExtractionResult, BaseModel (+20 more)

### Community 9 - "Graph RAG Capstone"
Cohesion: 0.40
Nodes (4): Graph RAG Capstone, Run locally, Stack, Status

### Community 10 - "graphdb.py"
Cohesion: 0.08
Nodes (41): graph_stats(), get, subgraph(), LLM community summarization (FR-8) - one summary per Louvain cluster, used by…, summarize(), all_community_nodes(), all_nodes_and_edges(), community_members() (+33 more)

### Community 11 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 12 - "query.py"
Cohesion: 0.11
Nodes (35): eval_questions(), eval_results(), BackgroundTasks, get, post, Runs the curated benchmark (FR-20) through both pipelines and scores each…, The curated benchmark set (FR-20), for the Compare page's preset-question…, run_eval() (+27 more)

### Community 17 - "config.py"
Cohesion: 0.07
Nodes (27): ensure_writable(), Route dependency for the endpoints a read-only deployment turns off., Settings, health(), get, ingest_documents(), ingest_status(), parse_upload() (+19 more)

### Community 18 - "ErrorBoundary.tsx"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 19 - "AboutPage.tsx"
Cohesion: 0.20
Nodes (6): AboutPage(), fmt(), Overview, STACK, STEPS, TRY

### Community 20 - "App.tsx"
Cohesion: 0.26
Nodes (10): App(), AppShell(), BuildOnly(), navGroups, NavItem, fetchReadOnly(), useReadOnly(), savedTheme() (+2 more)

### Community 21 - "apiGet"
Cohesion: 0.26
Nodes (10): GraphStats(), BackendStatus(), PILL_LABEL, Status, apiGet(), apiPost(), apiUpload(), HEADERS (+2 more)

### Community 22 - "EvalPage.tsx"
Cohesion: 0.22
Nodes (8): CATEGORY_LABELS, CATEGORY_ORDER, CategorySummary, EvalPage(), poll(), run(), EvalResponse, EvalRow

### Community 23 - "Intent: Project Audit & Next-Phase Build-Out"
Cohesion: 0.22
Nodes (8): Constraint, Intent: Project Audit & Next-Phase Build-Out, Out of scope (for now), Outcome, Status, Success, User, Why now

### Community 24 - "DashboardPage.tsx"
Cohesion: 0.13
Nodes (19): BarItem, BarList(), fmt(), GroupedBars(), Part, PartBar(), Series, useGrown() (+11 more)

### Community 25 - "Graph RAG API"
Cohesion: 0.50
Nodes (3): Built from, Configuration (Space secrets), Graph RAG API

### Community 26 - "Brag Plan: Graph RAG"
Cohesion: 0.10
Nodes (19): Audio direction, Brag Plan: Graph RAG, Duration: 23.5s, Format: landscape — 1920x1080, Hook (first 2-3 seconds), Key moments (the middle), Notes, Outro / punchline (+11 more)

### Community 27 - "LandingPage.tsx"
Cohesion: 0.19
Nodes (13): CodeGraphHero(), CodeNode, communityColor(), ThemeToggle(), applyGraphTheme(), subscribe(), Theme, useAppliedTheme() (+5 more)

### Community 28 - "Hyperframes Composition Brief: Graph RAG"
Cohesion: 0.20
Nodes (9): Audio, Creative Direction, Hyperframes Composition Brief: Graph RAG, Hyperframes Instructions, Objective, Output, Source Material, Storyboard (+1 more)

### Community 29 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, rewrites, $schema

### Community 30 - "react"
Cohesion: 0.25
Nodes (7): ExplorerPage(), expand(), GraphEdge, GraphNode, mergeSubgraph(), SubgraphResponse, react

### Community 32 - "AdminPage.tsx"
Cohesion: 0.22
Nodes (8): AdminPage(), onUpload(), pollUntilDone(), refresh(), DOC_STATUS_COLOR, IngestDocument, IngestResult, IngestStatus

## Knowledge Gaps
- **203 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+198 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 290 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `AdminPage.tsx`, `ComparePage.tsx`, `plugins`, `ErrorBoundary.tsx`, `AboutPage.tsx`, `App.tsx`, `apiGet`, `EvalPage.tsx`, `DashboardPage.tsx`, `LandingPage.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `apiGet()` connect `apiGet` to `AdminPage.tsx`, `ComparePage.tsx`, `AboutPage.tsx`, `App.tsx`, `EvalPage.tsx`, `DashboardPage.tsx`, `LandingPage.tsx`, `react`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `react`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _203 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Graph RAG Capstone — Product Requirements Document` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._