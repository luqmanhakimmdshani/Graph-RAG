"""Merge duplicate entities in Neo4j (FR-5): spelling variants and bare surnames,
per the rules in app/services/resolution.py. Run after ingestion, before
detect_communities.py.

Dry run by default - prints the merge plan. Pass --apply to write it. Merges
are not reversible (the dup nodes are folded into the kept one), so read the
plan first. Rerunnable: already-merged names are aliases, not nodes, and
write_extraction() routes new mentions of them to the canonical node.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services import graphdb  # noqa: E402
from app.services.resolution import plan_merges  # noqa: E402


def main() -> None:
    apply = "--apply" in sys.argv
    plans = plan_merges(graphdb.resolution_candidates())
    for keep, dups in plans:
        print(f"[{keep['type']}] {keep['name']!r} <- {', '.join(repr(d['name']) for d in dups)}")
    print(f"\n{len(plans)} merge groups, {sum(len(d) for _, d in plans)} nodes to fold in.")

    if not apply:
        print("Dry run - pass --apply to write these merges.")
        return
    for keep, dups in plans:
        aliases = [a for d in dups for a in [d["norm_name"], *d["alias_norms"]]]
        graphdb.merge_entities(keep["id"], [d["id"] for d in dups], aliases)
    print("Applied. Restart the API (entity-link cache) and re-run detect_communities.py.")


if __name__ == "__main__":
    main()
