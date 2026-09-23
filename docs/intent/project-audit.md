# Intent: Project Audit & Next-Phase Build-Out

## Outcome
Audit the current implementation against the PRD (functional gaps), defense-day
robustness, and quality/depth — then actually build fixes for what's found,
not just report them.

## User
Project owner, continuing active development. No deadline pressure.

## Why now
All 6 PRD phases (`PRD.md` §12) are marked done via commit history, but likely
thin in places — features that technically exist but haven't been stress-tested.

## Success
A prioritized gap list across three categories:
- **Functional**: PRD requirements spec'd but never fully built or half-working
- **Defense-readiness**: things that would embarrass in a live demo (error
  handling, edge cases, flaky UI, stale docs)
- **Quality/depth**: things that work but are thin (weak entity resolution,
  small benchmark set, no deployment) that a sharp evaluator would poke at

...with the highest-value items actually implemented, not just documented.

## Constraint
No hard timeline — this can be real multi-session work, not a rushed patch job.

## Out of scope (for now)
- Writing a new formal spec/PRD revision
- Deployment/hosting work (PRD §14.4 already flags this as optional stretch)
- Anything not surfaced by the actual audit — no inventing work

## Status
Confirmed 2026-09-23. Audit delivered the same day: 23 gaps across
functional/defense-readiness/quality, tiered by cost and blast radius.

- **Tier 1** (docs staleness, safety clamps, error handling, timeouts) — done,
  commit `0408d92`.
- **Tier 2** (async ingestion/eval, entity-cache invalidation, frontend
  timeouts, error boundary) — done, commit `fc6856d`. Caught and fixed a real
  bug mid-implementation: the first async-eval-job pass froze the entire
  server during a run (blocking `time.sleep()` inside an `async def` blocks
  the whole event loop, not just that task), found via a live concurrent-
  request test, not by inspection.
- **Tier 3** (query routing/global fallback, Chat switched to Graph RAG per
  FR-17, idempotent ingestion, per-document status, Compare's benchmark
  dropdown, configurable hop depth) — done, commit `808d31e`. Two items
  (Chat's RAG mode, where global questions surface) resolved via an explicit
  product decision rather than guessed at.
- **Tier 4** (entity resolution, confidence scores, test suite) — done.
  Resolution is rule-based (`services/resolution.py`, applied by
  `scripts/resolve_entities.py`): a probe of the live graph showed naive
  token-subset merging is mostly wrong (Google vs Google DeepMind, BBC vs BBC
  News), so only spelling variants and unambiguous bare surnames merge. 80
  nodes folded in (4083 -> 4003 entities, 1622 -> 1599 relationships after
  duplicate edges combined); merged names live on as `alias_norms`, honoured
  by ingestion, entity linking and Explorer lookup. Confidence now ranks edges
  within each hop tier and Graph RAG drops facts under 0.5. `backend/tests/`
  covers the pure logic (9 tests, no services needed).
- **Follow-ups found while finishing Tier 4** (branch `tier4-entity-resolution`):
  - Community summaries were keyed on Louvain id, which renumbers whenever
    the graph changes — re-running after the merge would have pinned old
    summaries onto different clusters. Now keyed on a member-set fingerprint:
    140/150 summaries reused, 10 regenerated.
  - Eval judged empty answers from errored pipelines (a small judge scored
    one 4/5); failed pipelines now score 0 and record the error.
  - Gemini free quota ran out, so the LLM layer is now provider-switchable
    (`LLM_PROVIDER`): `gemini`, `ollama` (local), or `openai` (any OpenAI-
    compatible endpoint). Current config: OmniRoute combo `rag-free` (Groq
    gpt-oss-120b, OpenRouter fallback for long prompts) with the eval judge
    pinned to NVIDIA nemotron-3-super-120b (`JUDGE_MODEL`), so one run is
    scored by one judge from a different model family than the answers.
  - Local Ollama (llama3.2:3b, 4 GB GPU) was tried and rejected: its 2048-
    token default context silently truncated global (~12k tokens) and
    generic (~3.5k) prompts, and a larger context spilled to CPU past the
    20s budget. Its eval numbers are not a valid comparison.
  - Compare's frontend timeout raised 25s → 45s (two sequential LLM calls).
  - Eval on `rag-free` + pinned judge (20 questions, 0 errors after one
    judge 503 on G4 was re-run), vs the Gemini baseline:

    | Group (n) | Graph rel | Graph faith | Generic rel | Generic faith |
    |---|---|---|---|---|
    | overall (20) | 4.90 → 4.95 | 4.80 → 4.80 | 1.65 → 2.40 | 4.75 → 4.80 |
    | local (8) | 4.88 → 5.00 | 4.88 → 5.00 | 1.25 → 2.50 | 4.88 → 5.00 |
    | multi_hop (8) | 4.88 → 5.00 | 4.62 → 4.50 | 1.88 → 2.38 | 5.00 → 5.00 |
    | global (4) | 5.00 → 4.75 | 5.00 → 5.00 | 2.00 → 2.25 | 4.00 → 4.00 |

    Graph RAG holds its lead over generic RAG across every category. The
    judge changed (Gemini → nemotron), so small deltas are not meaningful;
    the Gemini-judged baseline stays in git history (`ef64e2e`).
  - Explorer/Chat/Compare subgraph now has the hero's bloom glow (dark
    theme only), toned down so node-type colours stay distinguishable.
  - Not done: graph not re-extracted with the new model (1248 calls vs
    Groq's 8k tokens/min — would mostly land on fallback models); the
    "Who" → `WHO` case-insensitive entity-linking false positive.

Every backend change in Tiers 2-3 was tested live against the real Neo4j/
Chroma stores (not just import/build checks), with test writes fully cleaned
up afterward each time.
