"""Splits article bodies into overlapping word-count chunks.

Token counts aren't computed exactly (no tokenizer dependency) — word count
is a close enough proxy at this corpus's scale (FR-2 target: ~500-800 tokens
per chunk, roughly 375-600 words).
"""
CHUNK_WORDS = 500
OVERLAP_WORDS = 75


def chunk_text(text: str, chunk_words: int = CHUNK_WORDS, overlap_words: int = OVERLAP_WORDS) -> list[str]:
    words = text.split()
    if not words:
        return []
    step = chunk_words - overlap_words
    chunks = []
    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + chunk_words])
        chunks.append(chunk)
        if start + chunk_words >= len(words):
            break
    return chunks
