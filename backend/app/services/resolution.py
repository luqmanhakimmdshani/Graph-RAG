"""Entity resolution beyond exact-match normalization (FR-5).

Deliberately rule-based, not "merge anything that shares a token": a probe of
the real graph showed token-subset merging is mostly wrong here (Google vs
Google DeepMind, BBC vs BBC News, Max vs HBO Max are distinct entities). Two
rules held up against the data instead:

1. Spelling variants of the same name, same type: spacing, a leading "the",
   "&"/"and", "+"/"plus" ("Space X"/"SpaceX", "Paramount+"/"Paramount Plus",
   "The Associated Press"/"Associated Press"). "+" maps to "plus" rather than
   being dropped, so "ChatGPT Plus" stays separate from "ChatGPT".
2. A bare PERSON surname ("Zuckerberg") that is the last name of exactly one
   full-name PERSON and not anyone's first name ("Isaac" is skipped: it's both
   "Mia Isaac"'s surname and "Isaac Oyedepo"'s first name).

ponytail: corpus-wide surname matching can still merge two different people
who share a rare surname; scope it to co-occurring articles if that shows up.
"""
import re
from collections import defaultdict

from app.services.graphdb import normalize_name


def resolution_key(name: str) -> str:
    n = normalize_name(name.replace("+", " plus ").replace("&", " and "))
    n = re.sub(r"^the ", "", n)
    n = re.sub(r"\band\b", "", n)
    return n.replace(" ", "")


def plan_merges(nodes: list[dict]) -> list[tuple[dict, list[dict]]]:
    """nodes: {id, type, name, norm_name, degree}. Returns [(keep, [duplicates])];
    each node appears in at most one group."""
    plans, used = [], set()

    groups = defaultdict(list)
    for n in nodes:
        if n["norm_name"]:
            groups[(n["type"], resolution_key(n["name"]))].append(n)
    for group in groups.values():
        if len(group) < 2:
            continue
        # Most-connected spelling wins; longer name breaks ties ("The Wall Street
        # Journal" over "Wall Street Journal" when neither has edges).
        group.sort(key=lambda n: (n["degree"], len(n["name"])), reverse=True)
        plans.append((group[0], group[1:]))
        used.update(n["id"] for n in group)

    persons = [n for n in nodes if n["type"] == "PERSON" and n["id"] not in used and n["norm_name"]]
    by_surname, first_names = defaultdict(list), set()
    for p in persons:
        tokens = p["norm_name"].split()
        if len(tokens) > 1:
            by_surname[tokens[-1]].append(p)
            first_names.add(tokens[0])
    for p in persons:
        tokens = p["norm_name"].split()
        if len(tokens) != 1 or tokens[0] in first_names:
            continue
        full = by_surname.get(tokens[0], [])
        if len(full) == 1:
            plans.append((full[0], [p]))
    return plans
