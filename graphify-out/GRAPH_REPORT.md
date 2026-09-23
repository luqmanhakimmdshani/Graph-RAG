# Graph Report - RAG  (2026-09-23)

## Corpus Check
- 52 files · ~506,357 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 409 nodes · 651 edges · 26 communities (22 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `824480b2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graph RAG Capstone — Product Requirements Document
- compilerOptions
- devDependencies
- compilerOptions
- ChatPage.tsx
- test_core.py
- extraction.py
- plugins
- ingest_articles
- Graph RAG Capstone
- graphdb.py
- React + TypeScript + Vite
- query.py
- prepare_corpus.py
- tsconfig.json
- llm.py
- ComparePage.tsx
- App.tsx
- apiGet
- AdminPage.tsx
- EvalPage.tsx
- Intent: Project Audit & Next-Phase Build-Out
- ExplorerPage.tsx
- api.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `_session()` - 17 edges
3. `Graph RAG Capstone — Product Requirements Document` - 16 edges
4. `query_graph_rag()` - 15 edges
5. `compilerOptions` - 15 edges
6. `apiGet()` - 14 edges
7. `ingest_articles()` - 12 edges
8. `react` - 12 edges
9. `query_generic_rag()` - 11 edges
10. `main()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `refresh()` --calls--> `apiGet()`  [EXTRACTED]
  frontend/src/pages/AdminPage.tsx → frontend/src/lib/api.ts
- `_run_eval_job()` --calls--> `JudgeScore`  [EXTRACTED]
  backend/app/routers/eval.py → backend/app/services/eval.py
- `_run_eval_job()` --calls--> `score()`  [EXTRACTED]
  backend/app/routers/eval.py → backend/app/services/eval.py
- `test_parse_upload_rejects_bad_input_per_item()` --calls--> `parse_upload()`  [EXTRACTED]
  backend/tests/test_core.py → backend/app/routers/ingest.py
- `ingest_status()` --calls--> `stats()`  [EXTRACTED]
  backend/app/routers/ingest.py → backend/app/services/graphdb.py

## Import Cycles
- None detected.

## Communities (26 total, 2 thin omitted)

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

### Community 4 - "ChatPage.tsx"
Cohesion: 0.15
Nodes (13): cssVar(), GraphEdge, GraphNode, isDarkTheme(), Node3D, SubgraphView(), TYPE_COLORS, ChatPage() (+5 more)

### Community 5 - "test_core.py"
Cohesion: 0.16
Nodes (21): parse_upload(), One uploaded file -> (articles, skipped). Validated here, per file and per JSON…, normalize_name(), plan_merges(), Entity resolution beyond exact-match normalization (FR-5). Deliberately rule-…, nodes: {id, type, name, norm_name, degree}. Returns [(keep, [duplicates])];…, resolution_key(), main() (+13 more)

### Community 6 - "extraction.py"
Cohesion: 0.13
Nodes (21): chunk_text(), Splits article bodies into overlapping word-count chunks. Token counts aren't…, _client(), Entity, extract(), ExtractionResult, BaseModel, Exception (+13 more)

### Community 7 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 8 - "ingest_articles"
Cohesion: 0.12
Nodes (20): ingest_documents(), ingest_status(), BackgroundTasks, get, post, _run_ingest(), embed(), _model() (+12 more)

### Community 9 - "Graph RAG Capstone"
Cohesion: 0.40
Nodes (4): Graph RAG Capstone, Run locally, Stack, Status

### Community 10 - "graphdb.py"
Cohesion: 0.11
Nodes (31): graph_stats(), get, subgraph(), all_community_nodes(), all_nodes_and_edges(), community_members(), community_relationships(), community_summaries() (+23 more)

### Community 11 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 12 - "query.py"
Cohesion: 0.11
Nodes (32): health(), get, eval_questions(), eval_results(), BackgroundTasks, get, post, Runs the curated benchmark (FR-20) through both pipelines and scores each… (+24 more)

### Community 17 - "llm.py"
Cohesion: 0.11
Nodes (23): Settings, LLM community summarization (FR-8) - one summary per Louvain cluster, used by…, summarize(), JudgeScore, BaseModel, LLM-as-judge benchmark scoring (FR-21) - relevance and faithfulness, 0-5 each,…, score(), _client() (+15 more)

### Community 18 - "ComparePage.tsx"
Cohesion: 0.14
Nodes (12): BenchmarkQuestion, CATEGORY_LABELS, Citation, CommunityCitation, ComparePage(), ask(), onSubmit(), CompareResponse (+4 more)

### Community 19 - "App.tsx"
Cohesion: 0.21
Nodes (6): App(), navItems, ErrorBoundary, Props, State, react

### Community 20 - "apiGet"
Cohesion: 0.21
Nodes (9): BackendStatus(), CodeGraphHero(), CodeNode, communityColor(), apiGet(), FEATURES, GraphStats, LandingPage() (+1 more)

### Community 21 - "AdminPage.tsx"
Cohesion: 0.22
Nodes (8): AdminPage(), onUpload(), pollUntilDone(), refresh(), DOC_STATUS_COLOR, IngestDocument, IngestResult, IngestStatus

### Community 22 - "EvalPage.tsx"
Cohesion: 0.22
Nodes (8): CATEGORY_LABELS, CATEGORY_ORDER, CategorySummary, EvalPage(), poll(), run(), EvalResponse, EvalRow

### Community 23 - "Intent: Project Audit & Next-Phase Build-Out"
Cohesion: 0.22
Nodes (8): Constraint, Intent: Project Audit & Next-Phase Build-Out, Out of scope (for now), Outcome, Status, Success, User, Why now

### Community 24 - "ExplorerPage.tsx"
Cohesion: 0.29
Nodes (6): ExplorerPage(), expand(), GraphEdge, GraphNode, mergeSubgraph(), SubgraphResponse

### Community 25 - "api.ts"
Cohesion: 0.60
Nodes (4): apiPost(), apiUpload(), timeoutError(), withTimeout()

## Knowledge Gaps
- **134 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 199 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `ChatPage.tsx`, `plugins`, `ComparePage.tsx`, `apiGet`, `AdminPage.tsx`, `EvalPage.tsx`, `ExplorerPage.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `App.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `ingest_articles()` connect `ingest_articles` to `extraction.py`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Graph RAG Capstone — Product Requirements Document` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._