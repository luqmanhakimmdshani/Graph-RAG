"""Filter the Kaggle Global News Dataset down to the tech-industry corpus.

Input:  backend/data/data.csv (raw Kaggle download, gitignored)
Output: backend/data/corpus.json (list of {id, title, body, date, source, url})
"""
import json
import re
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
TECH_CATEGORIES = [
    "Technology", "Artificial Intelligence", "Google", "Facebook", "Amazon",
    "YouTube", "Startups", "Games", "Microsoft", "Apple", "Cryptocurrency",
]
# Wire-service/PR/market-report boilerplate: near-zero named-entity density,
# dominates by volume, and isn't "news" in the sense the PRD's questions need.
EXCLUDE_SOURCES = {"ETF Daily News", "GlobeNewswire", "Globalsecurity.org"}
# The dataset's `category` tag is noisy (keyword-triggered, not true section) —
# a "Technology" article can be an unrelated tunnel-rescue story that happens to
# mention a phone brand. Require actual business-event language so the corpus
# is entity/relationship-dense (the PRD's whole premise), not just topically
# tagged product-feature or unrelated news.
BUSINESS_SIGNAL = re.compile(
    r"\b(?:acqui\w*|merger|merged|funding round|raised \$|series [a-e]\b|"
    r"valuation|invest\w*|partnership|partnered|IPO|stake in|co-founder|"
    r"founder|CEO|executive|startup|venture capital|backed by|layoffs?)\b",
    re.IGNORECASE,
)
MAX_ARTICLES = 500
MAX_PER_SOURCE = 100
MIN_BODY_CHARS = 400


def main() -> None:
    df = pd.read_csv(DATA_DIR / "data.csv")
    df = df[df["category"].isin(TECH_CATEGORIES)]
    df = df[~df["source_name"].isin(EXCLUDE_SOURCES)]
    df = df.dropna(subset=["full_content", "title"])
    df = df[df["full_content"].str.len() >= MIN_BODY_CHARS]
    signal = (df["title"] + " " + df["full_content"]).str.contains(BUSINESS_SIGNAL)
    df = df[signal]
    df = df.drop_duplicates(subset=["title"]).drop_duplicates(subset=["url"])
    df = df.sort_values("published_at", ascending=False)
    df = df.groupby("source_name", group_keys=False).head(MAX_PER_SOURCE)
    df = df.sort_values("published_at", ascending=False).head(MAX_ARTICLES)

    articles = [
        {
            "id": str(row.article_id),
            "title": row.title,
            "body": row.full_content,
            "date": row.published_at,
            "source": row.source_name if pd.notna(row.source_name) else "unknown",
            "url": row.url,
        }
        for row in df.itertuples()
    ]

    out_path = DATA_DIR / "corpus.json"
    out_path.write_text(json.dumps(articles, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(articles)} articles to {out_path}")


if __name__ == "__main__":
    main()
