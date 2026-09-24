# Brag Plan: Graph RAG

## What is this app?
A question-answering system over 500 tech news articles that builds a knowledge graph of who is connected to whom, answers by walking it, and beats plain vector RAG 1.8× on relevance in its own 20-question benchmark. Live at graph-rag-virid.vercel.app.

## The angle
"Follow the connections." One real question whose answer is split across two articles: plain search shrugs, the graph walks two links from Anthropic and answers. Then zoom out: the real map (OpenAI's neighbourhood), the real receipts (today's benchmark), and the code that built it (graphify's map of the repo). Every answer, node, edge and number on screen comes out of the running system. Longer than a default brag by request ("don't constrain the length"): ~46s, because the story has four graphs worth holding on.

## Hook (first 2-3 seconds)
The Compare bar types: "Which two companies invested in Anthropic?" A trivia question with a two-part answer. Tension: can a search engine that reads five passages find two facts from two articles?

## Key moments (the middle)
- Plain text search's verbatim shrug: "The provided context does not contain information about which two companies invested in Anthropic." Held long enough to read.
- The walk: Anthropic in the centre; faint real neighbours (Dario Amodei — founded; OpenAI — competes with). Then two `invested in` links draw out: Amazon (from article 1), Google (from article 2). Answer: "Amazon and Google invested in Anthropic." Caption: two facts, two articles, one node.
- The map: OpenAI's real 1-hop neighbourhood (76 names, 130 links) blooms outward in the app's person / organisation / product colours; top names labelled. Counts: 500 articles · 5,091 names · 2,130 connections · 177 topics.
- The receipts: grouped bars per question type (Simple facts 4.75 vs 2.50, Connected facts 4.62 vs 2.50, Big-picture 3.75 vs 2.75), landing on "1.8× as relevant — 4.50 vs 2.55 out of 5".
- Under the hood: graphify's map of the codebase (559 parts, 898 links, 33 communities) blooms in community colours; stack line.

## Outro / punchline
Logo mark, "Graph RAG", the About page's headline "Answers that follow the connections", the live URL, and the builder: Luqman Hakim bin Md Shani · AI Engineer @ Pepper Labs · Universiti Malaya.

## User flow worth showing
Compare / Chat: type a question → press Ask → plain search answer vs Graph RAG answer, with the connections it used (scenes 1–3).

## Tone
- Preset: polished
- Creative direction: quiet premium product film that follows one question, then zooms out
- Interpretation: few words per scene, long readable holds, soft crossfades; motion comes from graphs blooming and links drawing, not from flashing text. No jokes beyond the contrast between the two answers.

## Format: landscape — 1920x1080
## Duration: 46.5s (user asked for no length limit; each scene carries one graph or one answer)

## Visual identity (from the project)
- Background: #08090a (dark `--bg`); surface #16191b; glass rgba(24,28,27,0.55), border rgba(255,255,255,0.09)
- Accent: #c3ef61 (dark `--accent`), soft rgba(195,239,97,0.12)
- Text: #f1f3f1, muted #979d9c, faint #676c6b
- Entity colours: person #a5620b, organisation #7fa500, product #4d84cf (app's chart tokens)
- Chart: Graph RAG #7fa500, plain search #5072bb (app's `--chart-graph` / `--chart-generic`)
- Code-graph communities: hsl((140 + c·47) mod 360, 70%, 62%) — same formula as the landing hero
- Display/body: system sans (Inter as render stand-in); mono labels JetBrains Mono, uppercase, tracked
- Strongest visuals: the Compare two-answer layout, the logo mark (frontend/public/logo-mark.svg), the 3D code-graph hero

## Share copy (draft)
Asked plain vector search which two companies invested in Anthropic. It said the context doesn't say — the answer was split across two articles. My knowledge graph walked Anthropic → Amazon, Anthropic → Google. 1.8× more relevant over 20 benchmark questions.

## Audio direction
- Role: warm bed with sparse professional accents
- Music: happy-beats-business-moves-vol-11 (114.8 BPM; different from the last video's vol-12)
- Music treatment: ~0.3 volume, short fade-in, fade out over the final ~2s under the outro
- Music cue guidance: bundled preset (full-track JSON). Strong cues used: 3.70 (Ask), 5.28 (baseline card), 12.65 / 14.22 (the two invested-in links), 16.86 (answer), 19.49 (map), 27.39 (receipts), 32.12 (1.8× headline), 35.28 (code graph), 40.02 (logo). Sequential bar groups snap to every other beat (~1.05s) so each label holds.
- Audio-reactive treatment: none — the graphs already carry motion; stillness keeps text readable (documented choice).
- SFX posture: sparse, motion-matched, low-HF picks
- Audio-coupled moments: typed question (key ticks), Ask (click), card arrivals (soft impact), each invested-in link (soft wood/glass tap), answer (bell), stats count-up (chips), bars (soft impact), logo (bell)
- Restraint rule: no sound on the baseline's failure — silence is the contrast; no error buzzers.

## Storyboard

### Scene 1 — The question — 0.0–5.28 (5.3s)
Compare page header ("A / B RETRIEVAL" label, "Comparison") and the question bar, centred and scaled up. The question types character by character, then the green Ask button is pressed (3.70, beat-locked) and shows "Asking".
Sequential/interaction: yes — typed question; simulated press on Ask.
Audio: music fades in; key ticks; click on Ask.
Transition: soft → Scene 2.

### Scene 2 — Plain search — 5.28–10.54 (5.3s)
Card "PLAIN TEXT SEARCH · 5 closest passages" with the verbatim shrug (held ≥4s), then small faint line "No single passage holds both facts."
Sequential: answer then note.
Audio: soft impact on arrival; otherwise silence over the shrug.
Transition: soft crossfade → Scene 3.

### Scene 3 — Follow the connections — 10.54–19.49 (9.0s)
Label "GRAPH RAG". Anthropic node appears centre; faint real neighbours (Dario Amodei, OpenAI) with their link names. `invested in` → Amazon draws at 12.65 ("from article 1"), `invested in` → Google at 14.22 ("from article 2"). At 16.86 the answer card: "Amazon and Google invested in Anthropic." + caption "Two facts. Two articles. One node." Hold.
Sequential: link, link, answer — each held ≥1.5s.
Audio: two soft taps on links; bell on the answer.
Transition: soft → Scene 4.

### Scene 4 — The map — 19.49–27.39 (7.9s)
Title "Two weeks of news, mapped". OpenAI's real neighbourhood blooms outward from the hub, nodes in person/org/product colours, top names labelled (ChatGPT, Microsoft, Sam Altman, Anthropic, Jony Ive…). At 22.65 four counts land: 500 news articles · 5,091 people, companies and products · 2,130 connections · 177 topic groups. Legend: person / organisation / product.
Sequential: stats count up together, then hold ≥3s.
Audio: soft impact on bloom; chips stack under the count-up.
Transition: soft crossfade → Scene 5.

### Scene 5 — The receipts — 27.39–35.28 (7.9s)
Label "20 TEST QUESTIONS · SCORED BY AN AI JUDGE (0–5)". Three grouped bar pairs grow one group at a time (Simple facts 4.75/2.50, Connected facts 4.62/2.50, Big-picture 3.75/2.75), legend Graph RAG vs plain text search. At 32.12 the headline: "1.8× as relevant" with "4.50 vs 2.55 overall".
Sequential: groups ~1.05s apart, then the headline held ≥3s.
Audio: soft impact per group (quiet), bell-less; one confident hit on the headline.
Transition: soft → Scene 6.

### Scene 6 — Under the hood — 35.28–40.02 (4.7s)
graphify's map of this repo blooms in community colours. Text: "Built from 559 parts of its own code" / mono "mapped by graphify · 33 communities". Stack line: React · FastAPI · Neo4j · ChromaDB · sentence-transformers.
Audio: soft impact on bloom.
Transition: soft → Scene 7.

### Scene 7 — Outro — 40.02–46.5 (6.5s)
Logo mark scales in (40.02, beat-locked), "Graph RAG", headline "Answers that follow the connections", mono URL "graph-rag-virid.vercel.app", then builder line "Luqman Hakim bin Md Shani · AI Engineer @ Pepper Labs · Universiti Malaya". Hold; music fades out.
Audio: bell on the logo, music rings out.

**Music mood:** warm, confident, understated.
**Audio summary:** a gentle bed that stays out of the way of the question, goes quiet over the shrug, and marks each link, the answer, the receipts and the logo with a few soft, well-placed hits.
