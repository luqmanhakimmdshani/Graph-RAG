"""Assemble the Hugging Face Space folder from the repo.

Usage: python deploy/hf-space/stage.py <out_dir>

Copies only what the running API needs. Never .env (secrets live in the Space
settings), .venv, tests, scripts, or the 400 MB raw Kaggle CSV.
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
HERE = Path(__file__).resolve().parent
DATA_FILES = ["corpus.json", "benchmark.json", "eval_results.json"]


def stage(out: Path) -> None:
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    shutil.copytree(BACKEND / "app", out / "app", ignore=shutil.ignore_patterns("__pycache__"))
    shutil.copytree(BACKEND / "chroma_data", out / "chroma_data")
    (out / "data").mkdir()
    for name in DATA_FILES:
        shutil.copy2(BACKEND / "data" / name, out / "data" / name)
    shutil.copy2(BACKEND / "requirements.txt", out / "requirements.txt")
    for name in ("Dockerfile", "README.md"):
        shutil.copy2(HERE / name, out / name)
    (out / ".dockerignore").write_text("**/__pycache__\n.env\n", encoding="utf-8")

    leaked = [p for p in out.rglob("*") if p.name == ".env" or p.suffix == ".env"]
    assert not leaked, f"secrets file staged: {leaked}"


if __name__ == "__main__":
    target = Path(sys.argv[1])
    stage(target)
    size = sum(p.stat().st_size for p in target.rglob("*") if p.is_file())
    print(f"staged {target} ({size / 1e6:.1f} MB)")
