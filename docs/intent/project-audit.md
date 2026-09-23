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
- **Tier 4** (deeper investment: real entity resolution beyond exact-match
  normalization, using the confidence scores that are written but never
  read, an automated test suite) — not started. These are bigger asks than
  Tiers 1-3, not quick fixes; worth scoping as their own follow-up rather
  than folded into this pass.

Every backend change in Tiers 2-3 was tested live against the real Neo4j/
Chroma stores (not just import/build checks), with test writes fully cleaned
up afterward each time.
