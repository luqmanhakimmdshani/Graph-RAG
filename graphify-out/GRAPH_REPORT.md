# Graph Report - RAG  (2026-09-21)

## Corpus Check
- 27 files · ~5,960 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 173 nodes · 215 edges · 20 communities (12 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `194a0922`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- database.py
- compilerOptions
- devDependencies
- PRD: Intelligent Document Processing (IDP) Platform for Logistics Documents
- models/__init__.py
- package.json
- documents.py
- main.py
- include
- IDP Platform
- layout.tsx
- frontend/README.md
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `PRD: Intelligent Document Processing (IDP) Platform for Logistics Documents` - 16 edges
3. `Base` - 13 edges
4. `include` - 7 edges
5. `Document` - 6 edges
6. `User` - 5 edges
7. `AuditLog` - 5 edges
8. `auth_callback()` - 5 edges
9. `upload_document()` - 5 edges
10. `get_document()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `auth_callback()` --uses--> `User`  [INFERRED]
  backend/app/routers/auth.py → backend/app/models/models.py
- `get_document()` --uses--> `Document`  [INFERRED]
  backend/app/routers/documents.py → backend/app/models/models.py
- `upload_document()` --uses--> `Document`  [INFERRED]
  backend/app/routers/documents.py → backend/app/models/models.py
- `get_audit_log()` --uses--> `AuditLog`  [INFERRED]
  backend/app/routers/audit.py → backend/app/models/models.py
- `AuditLog` --inherits--> `Base`  [EXTRACTED]
  backend/app/models/models.py → backend/app/database.py

## Import Cycles
- None detected.

## Communities (20 total, 4 thin omitted)

### Community 0 - "database.py"
Cohesion: 0.13
Nodes (14): OIDC auth. Phase 0: validates a bearer token against the IdP's JWKS via authlib…, require_role(), Config, Settings, get_db(), get_audit_log(), get, Session (+6 more)

### Community 1 - "compilerOptions"
Cohesion: 0.11
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 2 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 3 - "PRD: Intelligent Document Processing (IDP) Platform for Logistics Documents"
Cohesion: 0.12
Nodes (16): 10. Non-Functional Requirements, 11. Integrations & Dependencies, 12. Milestones & Phased Rollout, 13. Risks & Mitigations, 14. Open Questions / Assumptions, 15. Appendix, 1. Document Control, 2. Executive Summary (+8 more)

### Community 4 - "models/__init__.py"
Cohesion: 0.28
Nodes (14): Base, AuditLog, Document, DocumentChunk, ExtractedField, ExtractionRun, FieldCorrection, Metric (+6 more)

### Community 5 - "package.json"
Cohesion: 0.12
Nodes (15): dependencies, next, react, react-dom, name, private, scripts, build (+7 more)

### Community 6 - "documents.py"
Cohesion: 0.26
Nodes (12): get_current_user(), Request, get_document(), list_extractions(), get, post, Session, UUID (+4 more)

### Community 7 - "main.py"
Cohesion: 0.18
Nodes (9): health(), get, confirm_extraction(), correct_field(), post, UUID, benchmark(), get (+1 more)

### Community 8 - "include"
Cohesion: 0.20
Nodes (9): exclude, include, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+1 more)

### Community 9 - "IDP Platform"
Cohesion: 0.33
Nodes (5): Backend dev (outside Docker), IDP Platform, Run it, Stack, Status: Phase 0 (scaffolding)

### Community 10 - "layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 11 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **72 isolated node(s):** `Config`, `eslintConfig`, `nextConfig`, `name`, `version` (+67 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 101 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `compilerOptions` to `include`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `Config`, `eslintConfig`, `nextConfig` to the rest of the system?**
  _72 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `database.py` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `PRD: Intelligent Document Processing (IDP) Platform for Logistics Documents` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._