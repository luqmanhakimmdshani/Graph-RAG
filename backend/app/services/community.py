"""LLM community summarization (FR-8) - one summary per Louvain cluster, used by
the global-question retrieval path (Phase 5) since no single chunk or subgraph
answers a corpus-wide synthesis question."""
from app.services import llm

PROMPT = """Below are entities from one cluster of a knowledge graph built from tech-industry
news, plus the relationships found between them. Write a 2-3 sentence summary of what this
cluster is about. Be specific - name the entities, don't just describe the category.

Entities: {members}

Relationships:
{relationships}

Summary:"""


def summarize(members: list[dict], relationships: list[dict]) -> str:
    member_names = ", ".join(m["name"] for m in members[:40])
    rel_lines = "\n".join(
        f"- {r['source']} {r['type'].replace('_', ' ').lower()} {r['target']}" for r in relationships
    ) or "(no relationships extracted within this cluster)"
    return llm.generate(PROMPT.format(members=member_names, relationships=rel_lines))
