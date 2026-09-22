# Graph Report - RAG  (2026-09-23)

## Corpus Check
- 47 files · ~499,865 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 324 nodes · 482 edges · 24 communities (20 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e329b8b9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graph RAG Capstone — Product Requirements Document
- compilerOptions
- devDependencies
- compilerOptions
- App.tsx
- api.ts
- package.json
- plugins
- extraction.py
- Graph RAG Capstone
- graphdb.py
- React + TypeScript + Vite
- query.py
- prepare_corpus.py
- tsconfig.json
- detect_communities.py
- LandingPage.tsx
- ComparePage.tsx
- EvalPage.tsx
- ExplorerPage.tsx
- vectorstore.py
- SubgraphView.tsx

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `Graph RAG Capstone — Product Requirements Document` - 16 edges
3. `compilerOptions` - 15 edges
4. `query_graph_rag()` - 12 edges
5. `_session()` - 12 edges
6. `query_generic_rag()` - 11 edges
7. `ingest_articles()` - 11 edges
8. `react` - 11 edges
9. `run_eval()` - 10 edges
10. `apiGet()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `run_eval()` --uses--> `QueryRequest`  [INFERRED]
  backend/app/routers/eval.py → backend/app/routers/query.py
- `ingest_status()` --calls--> `stats()`  [EXTRACTED]
  backend/app/routers/ingest.py → backend/app/services/graphdb.py
- `query_graph_rag()` --calls--> `find_entities()`  [EXTRACTED]
  backend/app/routers/query.py → backend/app/services/graphdb.py
- `query_graph_rag()` --calls--> `query_subgraph()`  [EXTRACTED]
  backend/app/routers/query.py → backend/app/services/graphdb.py
- `query_generic_rag()` --calls--> `embed()`  [EXTRACTED]
  backend/app/routers/query.py → backend/app/services/embeddings.py

## Import Cycles
- None detected.

## Communities (24 total, 2 thin omitted)

### Community 0 - "Graph RAG Capstone — Product Requirements Document"
Cohesion: 0.07
Nodes (26): 10. Non-Functional Requirements, 11. Integrations & Dependencies, 12. Milestones & Phased Rollout, 13. Risks & Mitigations, 14. Open Questions / Assumptions, 15. Appendix, 1. Document Control, 2. Executive Summary (+18 more)

### Community 1 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 2 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, oxlint, react-router-dom, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom (+15 more)

### Community 3 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 4 - "App.tsx"
Cohesion: 0.23
Nodes (7): App(), navItems, apiPost(), ChatPage(), Citation, QueryResponse, react

### Community 5 - "api.ts"
Cohesion: 0.25
Nodes (8): BackendStatus(), apiGet(), apiUpload(), AdminPage(), onUpload(), refresh(), IngestStatus, LandingPage()

### Community 6 - "package.json"
Cohesion: 0.11
Nodes (18): 3d-force-graph, dependencies, 3d-force-graph, lucide-react, react, react-dom, name, private (+10 more)

### Community 7 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 8 - "extraction.py"
Cohesion: 0.10
Nodes (25): Settings, ingest_documents(), post, chunk_text(), Splits article bodies into overlapping word-count chunks. Token counts aren't…, embed(), _model(), _client() (+17 more)

### Community 9 - "Graph RAG Capstone"
Cohesion: 0.40
Nodes (4): Graph RAG Capstone, Run locally, Stack, Status

### Community 10 - "graphdb.py"
Cohesion: 0.13
Nodes (28): graph_stats(), get, subgraph(), Entity, BaseModel, Relationship, all_nodes_and_edges(), community_members() (+20 more)

### Community 11 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 12 - "query.py"
Cohesion: 0.10
Nodes (32): health(), get, eval_results(), get, post, Runs the curated benchmark (FR-20) through both pipelines and scores each…, run_eval(), _summarize() (+24 more)

### Community 17 - "detect_communities.py"
Cohesion: 0.31
Nodes (7): LLM community summarization (FR-8) - one summary per Louvain cluster, used by…, summarize(), Exception, Phase 5: Louvain community detection over the Neo4j graph, then an LLM summary…, _retry_delay_s(), _summarize_with_retry(), _throttle()

### Community 18 - "LandingPage.tsx"
Cohesion: 0.24
Nodes (7): CodeGraphHero(), CodeNode, communityColor(), seededNodes, FEATURES, GraphStats, STEPS

### Community 19 - "ComparePage.tsx"
Cohesion: 0.20
Nodes (7): Citation, ComparePage(), CompareResponse, GenericAnswer, GraphAnswer, GraphEdge, GraphNode

### Community 20 - "EvalPage.tsx"
Cohesion: 0.22
Nodes (6): CATEGORY_LABELS, CATEGORY_ORDER, CategorySummary, EvalPage(), EvalResponse, EvalRow

### Community 21 - "ExplorerPage.tsx"
Cohesion: 0.29
Nodes (6): ExplorerPage(), expand(), GraphEdge, GraphNode, mergeSubgraph(), SubgraphResponse

### Community 22 - "vectorstore.py"
Cohesion: 0.43
Nodes (6): ingest_status(), get, add_chunks(), chunk_count(), _collection(), query()

### Community 23 - "SubgraphView.tsx"
Cohesion: 0.33
Nodes (6): cssVar(), GraphEdge, GraphNode, Node3D, SubgraphView(), TYPE_COLORS

## Knowledge Gaps
- **117 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+112 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 163 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `api.ts`, `plugins`, `LandingPage.tsx`, `ComparePage.tsx`, `EvalPage.tsx`, `ExplorerPage.tsx`, `SubgraphView.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `App.tsx`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _117 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Graph RAG Capstone — Product Requirements Document` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._