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
    monkeypatch.setattr(llm, "_openai", lambda prompt: "It launched **Amazon Q** and **Bedrock**【13】【2†L4】.")
    assert llm.generate("x") == "It launched Amazon Q and Bedrock[13][2]."


def _text_pdf(text: str) -> bytes:
    """Smallest valid one-page PDF with a real text layer (pypdf can't author text)."""
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode()
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = bytearray(b"%PDF-1.4\n"), []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + body + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    out += b"".join(b"%010d 00000 n \n" % o for o in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
    return bytes(out)


def test_parse_upload_formats():
    import io
    from docx import Document
    from pypdf import PdfWriter
    from app.routers.ingest import parse_upload

    arts, bad = parse_upload("note.txt", "﻿OpenAI hired Sam Altman.".encode("utf-8"))
    assert bad == [] and arts[0]["body"] == "OpenAI hired Sam Altman." and arts[0]["title"] == "note"

    arts, bad = parse_upload("report.pdf", _text_pdf("Nvidia partnered with Reliance"))
    assert bad == [] and "Nvidia partnered with Reliance" in arts[0]["body"]

    buf = io.BytesIO(); d = Document(); d.add_paragraph("Google acquired DeepMind."); d.save(buf)
    arts, bad = parse_upload("memo.docx", buf.getvalue())
    assert bad == [] and arts[0]["body"].strip() == "Google acquired DeepMind."

    buf = io.BytesIO(); w = PdfWriter(); w.add_blank_page(612, 792); w.write(buf)
    assert "scanned PDF" in parse_upload("scan.pdf", buf.getvalue())[1][0]["reason"]


def test_parse_upload_rejects_bad_input_per_item():
    import json
    from app.routers.ingest import parse_upload

    items = [{"title": "ok", "body": "Amazon invested in Anthropic."}, {"title": "no body"}, {"body": "  "}, "junk"]
    arts, bad = parse_upload("batch.json", json.dumps(items).encode())
    assert [a["title"] for a in arts] == ["ok"]
    assert [b["file"] for b in bad] == ["batch.json[1]", "batch.json[2]", "batch.json[3]"]

    assert "invalid JSON" in parse_upload("x.json", b"{nope")[1][0]["reason"]
    assert "UTF-8" in parse_upload("x.txt", b"\xff\xfe\xfa")[1][0]["reason"]
    assert "unsupported" in parse_upload("x.pptx", b"...")[1][0]["reason"]
    assert "corrupt" in parse_upload("x.pdf", b"not a pdf")[1][0]["reason"]
