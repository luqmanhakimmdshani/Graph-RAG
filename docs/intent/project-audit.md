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
Confirmed 2026-09-23. Audit in progress — see gap-analysis findings once
delivered for the prioritized list this intent produces.
