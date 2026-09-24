# Hyperframes Composition Brief: Graph RAG

## Objective
An updated launch-style brag video for Graph RAG that follows one question through the product, then zooms out through three real graphs.

## Output
- Composition directory: `brag-output-2026-09-24-224119/composition/`
- Rendered video: `brag-output-2026-09-24-224119/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 46.5s (user explicitly lifted the 15–25s limit)

## Source Material
- Project root: D:\RAG
- Read: frontend/src/pages/{ComparePage,ChatPage,AboutPage,LandingPage,DashboardPage}.tsx, frontend/src/index.css, frontend/public/logo-mark.svg, backend/data/eval_results.json, live Neo4j subgraphs, frontend/src/data/codeGraph.json
- Graph data (real, seeded 2D layouts): `graph-data.json` beside this brief — anthropic (5 nodes, 7 links), openai (76 nodes, 130 links), code (559 nodes, 898 links, 33 communities)
- Verbatim copy:
  - "Which two companies invested in Anthropic?"
  - "The provided context does not contain information about which two companies invested in Anthropic."
  - "Amazon and Google invested in Anthropic."
  - "Answers that follow the connections"
  - Numbers: 500 · 5,091 · 2,130 · 177; 4.75/2.50, 4.62/2.50, 3.75/2.75; 4.50 vs 2.55; 1.8×; 559 parts · 898 links · 33 communities

## Creative Direction
- Tone preset: polished — quiet premium product film that follows one question, then zooms out
- Angle / hook / outro: see brag-plan.md
- Avoid: generic SaaS language, abstract filler, invented numbers, error buzzers

## Visual Identity
Background #08090a · text #f1f3f1 / #979d9c / #676c6b · accent #c3ef61 · person #a5620b · org #7fa500 · product #4d84cf · chart graph #7fa500 / plain #5072bb · Inter + JetBrains Mono · glass cards (rgba(24,28,27,0.55), 1px rgba(255,255,255,0.09), 14px radius)

## Storyboard
Contract: brag-plan.md. Scenes: 1 question 0–5.28 · 2 plain search 5.28–10.54 · 3 follow the connections 10.54–19.49 · 4 the map 19.49–27.39 · 5 receipts 27.39–35.28 · 6 under the hood 35.28–40.02 · 7 outro 40.02–46.5

## Audio
- Music: happy-beats-business-moves-vol-11-by-ende-dot-app.mp3, ~0.3, short fade-in, ~2s fade-out
- Cue guidance: preset JSON; locks at 3.70, 5.28, 12.65, 14.22, 16.86, 19.49, 27.39, 32.12, 35.28, 40.02
- Audio-reactive: none (documented choice: graphs carry the motion; text stays still)
- SFX: key ticks, Ask click, soft impacts on arrivals, soft taps on the two links, bell on the answer and the logo, chips under the count-up. Silence over the baseline shrug.

## Hyperframes Instructions
Standalone composition, one paused GSAP timeline on `window.__timelines["main"]`, SVG graphs built from the inlined data at load (deterministic, no network data), bloom animated by radius rings rather than per-node tweens for the 559-node graph. Run `npx hyperframes check` before render.
