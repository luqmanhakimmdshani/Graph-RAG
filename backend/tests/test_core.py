"""Pure-logic tests - no Neo4j, Chroma or Gemini needed. Run: pytest (from backend/)."""
from google.genai import errors

from app.routers.query import MIN_CONFIDENCE, _confident, _graph_facts
from app.services.chunking import chunk_text
from app.services.extraction import _retry_delay_s
from app.services.graphdb import normalize_name
from app.services.resolution import plan_merges, resolution_key


def node(i, name, type="ORG", degree=0):
    return {"id": str(i), "type": type, "name": name, "norm_name": normalize_name(name), "degree": degree}


def merged(plans):
    return {(keep["name"], tuple(sorted(d["name"] for d in dups))) for keep, dups in plans}


def test_normalize_name():
    assert normalize_name("OpenAI, Inc.") == "openai"
    assert normalize_name("  Sam   Altman ") == "sam altman"


def test_resolution_key_spelling_variants():
    assert resolution_key("Space X") == resolution_key("SpaceX")
    assert resolution_key("Paramount+") == resolution_key("Paramount Plus")
    assert resolution_key("The Associated Press") == resolution_key("Associated Press")
    assert resolution_key("McKinsey & Company") == resolution_key("McKinsey and Company")
    assert resolution_key("ChatGPT Plus") != resolution_key("ChatGPT")


def test_plan_merges_spelling_keeps_most_connected():
    plans = plan_merges([node(1, "Space X"), node(2, "SpaceX", degree=3), node(3, "ChatGPT"), node(4, "ChatGPT Plus")])
    assert merged(plans) == {("SpaceX", ("Space X",))}


def test_plan_merges_never_crosses_types():
    assert plan_merges([node(1, "Facebook", "ORG"), node(2, "Facebook", "PRODUCT")]) == []


def test_plan_merges_surnames():
    people = [node(i, n, "PERSON") for i, n in enumerate([
        "Mark Zuckerberg", "Zuckerberg",           # unique surname -> merge
        "Mia Isaac", "Isaac Oyedepo", "Isaac",     # also a first name -> skip
        "Talal Hasan", "Shakib Al Hasan", "Hasan", # ambiguous -> skip
    ])]
    assert merged(plan_merges(people)) == {("Mark Zuckerberg", ("Zuckerberg",))}


def test_confidence_floor_and_fact_order():
    edges = [
        {"source": "a", "target": "b", "type": "FOUNDED", "confidence": 0.9, "source_article": "T1"},
        {"source": "a", "target": "c", "type": "ACQUIRED", "confidence": MIN_CONFIDENCE - 0.1},
        {"source": "a", "target": "d", "type": "INVESTED_IN", "confidence": None},
    ]
    kept = _confident(edges)
    assert [e["target"] for e in kept] == ["b", "d"]
    nodes = {k: {"name": k.upper()} for k in "abd"}
    assert _graph_facts(nodes, kept)[0] == "[1] A founded B (source: T1)"


def test_chunk_text_overlap():
    words = [str(i) for i in range(1000)]
    chunks = chunk_text(" ".join(words), chunk_words=500, overlap_words=75)
    assert chunks[1].split()[0] == "425"
    assert chunks[-1].split()[-1] == "999"
    assert chunk_text("") == []


def test_retry_delay_honours_server_hint():
    err = errors.ClientError(429, {"error": {"message": "quota", "details": [{"retryDelay": "26s"}]}})
    assert _retry_delay_s(err, default=5) == 28
    assert _retry_delay_s(ValueError("nope"), default=5) == 5


def test_generate_strips_bold_but_keeps_words(monkeypatch):
    from app.services import llm
    monkeypatch.setattr(llm.settings, "llm_provider", "openai")
    monkeypatch.setattr(llm, "_openai", lambda prompt: "It launched **Amazon Q** and **Bedrock**.")
    assert llm.generate("x") == "It launched Amazon Q and Bedrock."
