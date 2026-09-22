# Graph Report - RAG  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 236 nodes · 314 edges · 17 communities (13 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03cc5da3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graph RAG Capstone — Product Requirements Document
- compilerOptions
- devDependencies
- compilerOptions
- App.tsx
- main.py
- package.json
- plugins
- ingest_articles
- Graph RAG Capstone
- graphdb.py
- React + TypeScript + Vite
- query.py
- prepare_corpus.py
- tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `Graph RAG Capstone — Product Requirements Document` - 16 edges
3. `compilerOptions` - 15 edges
4. `ingest_articles()` - 11 edges
5. `query_vanilla_rag()` - 9 edges
6. `extract()` - 8 edges
7. `write_extraction()` - 7 edges
8. `main()` - 7 edges
9. `QueryRequest` - 5 edges
10. `_session()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `write_extraction()` --uses--> `Entity`  [INFERRED]
  backend/app/services/graphdb.py → backend/app/services/extraction.py
- `write_extraction()` --uses--> `Relationship`  [INFERRED]
  backend/app/services/graphdb.py → backend/app/services/extraction.py
- `ingest_articles()` --calls--> `extract()`  [EXTRACTED]
  backend/app/services/ingestion.py → backend/app/services/extraction.py
- `ingest_status()` --calls--> `stats()`  [EXTRACTED]
  backend/app/routers/ingest.py → backend/app/services/graphdb.py
- `ingest_articles()` --calls--> `write_extraction()`  [EXTRACTED]
  backend/app/services/ingestion.py → backend/app/services/graphdb.py

## Import Cycles
- None detected.

## Communities (17 total, 2 thin omitted)

### Community 0 - "Graph RAG Capstone — Product Requirements Document"
Cohesion: 0.07
Nodes (26): 10. Non-Functional Requirements, 11. Integrations & Dependencies, 12. Milestones & Phased Rollout, 13. Risks & Mitigations, 14. Open Questions / Assumptions, 15. Appendix, 1. Document Control, 2. Executive Summary (+18 more)

### Community 1 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 2 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, oxlint, react-router-dom, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom (+13 more)

### Community 3 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 4 - "App.tsx"
Cohesion: 0.13
Nodes (17): App(), BackendStatus(), tabs, apiGet(), apiPost(), apiUpload(), AdminPage(), onUpload() (+9 more)

### Community 5 - "main.py"
Cohesion: 0.22
Nodes (6): health(), get, eval_results(), get, post, run_eval()

### Community 6 - "package.json"
Cohesion: 0.13
Nodes (14): dependencies, react, react-dom, name, private, scripts, build, dev (+6 more)

### Community 7 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 8 - "ingest_articles"
Cohesion: 0.16
Nodes (15): ingest_documents(), ingest_status(), get, post, chunk_text(), Splits article bodies into overlapping word-count chunks. Token counts aren't…, ingest_articles(), articles: [{id, title, body, date, source, url}]. Chunks + embeds into Chroma… (+7 more)

### Community 9 - "Graph RAG Capstone"
Cohesion: 0.40
Nodes (4): Graph RAG Capstone, Run locally, Stack, Status

### Community 10 - "graphdb.py"
Cohesion: 0.12
Nodes (26): Settings, graph_stats(), get, subgraph(), _client(), Entity, extract(), ExtractionResult (+18 more)

### Community 11 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 12 - "query.py"
Cohesion: 0.23
Nodes (13): _build_prompt(), _citations(), BaseModel, post, query_compare(), query_graph_rag(), query_vanilla_rag(), QueryRequest (+5 more)

## Knowledge Gaps
- **91 isolated node(s):** `IngestStatus`, `Citation`, `QueryResponse`, `10. Non-Functional Requirements`, `11. Integrations & Dependencies` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 116 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `ingest_articles()` connect `ingest_articles` to `graphdb.py`, `query.py`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `IngestStatus`, `Citation`, `QueryResponse` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Graph RAG Capstone — Product Requirements Document` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._