from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


def test_read_only_refuses_writes_but_serves_reads(monkeypatch):
    monkeypatch.setattr(settings, "read_only", True)
    client = TestClient(app)
    assert client.post("/eval/run").status_code == 403
    assert client.post("/ingest", files={"files": ("a.txt", b"hi")}).status_code == 403
    assert client.get("/health").status_code == 200
