"""Build composition/index.html from template.html + graph-data.json (real graphs,
seeded layouts). Run: python build.py"""
import json
from pathlib import Path

HERE = Path(__file__).parent
data = json.loads((HERE / "graph-data.json").read_text(encoding="utf-8"))

# Anthropic: fixed, readable positions for the five real nodes; links by id.
a = data["anthropic"]
name = {n["id"]: n["name"] for n in a["nodes"]}
anthropic = {
    "nodes": [{"name": n["name"], "type": n["type"]} for n in a["nodes"]],
    "edges": [{"from": name[e["source"]], "to": name[e["target"]], "type": e["type"]} for e in a["edges"]],
}

payload = {"anthropic": anthropic, "openai": data["openai"], "code": data["code"]}
html = (HERE / "template.html").read_text(encoding="utf-8")
html = html.replace("/*__DATA__*/null", json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
(HERE / "composition" / "index.html").write_text(html, encoding="utf-8")
print("wrote composition/index.html", len(html) // 1024, "KB")
