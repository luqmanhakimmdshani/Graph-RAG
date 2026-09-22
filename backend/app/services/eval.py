"""LLM-as-judge benchmark scoring (FR-21) - relevance and faithfulness, 0-5 each,
scored against the curated reference answers in data/benchmark.json. No team
capacity for full human annotation at this scale, so an LLM judge substitutes."""
from pydantic import BaseModel

from app.services import llm


class JudgeScore(BaseModel):
    relevance: int
    faithfulness: int
    reasoning: str


PROMPT = """You are grading a RAG system's answer against a reference answer for the same
question. Score two dimensions from 0 (poor) to 5 (excellent):
- relevance: does the answer address the question and cover the same key facts as the reference?
- faithfulness: is the answer grounded, not inventing facts unsupported by real information?

Question: {question}
Reference answer: {reference}
System's answer: {answer}

Return your scores and a one-sentence reasoning."""


def score(question: str, reference: str, answer: str) -> JudgeScore:
    return llm.generate_json(PROMPT.format(question=question, reference=reference, answer=answer), JudgeScore)
