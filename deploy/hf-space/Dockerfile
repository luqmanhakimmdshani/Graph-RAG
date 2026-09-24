# Hugging Face Docker Space for the Graph RAG backend (FastAPI).
# Build context is the staged Space folder: app/, data/, chroma_data/,
# requirements.txt - see deploy/hf-space/README.md for how it's assembled.
FROM python:3.12-slim

# HF Spaces run the container as uid 1000; own everything it writes to
# (Chroma opens its SQLite store read-write, the model cache lives in $HOME).
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface \
    PYTHONUNBUFFERED=1
WORKDIR /home/user/app

# CPU-only torch first: the default wheel bundles CUDA (~2 GB) the Space can't use.
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir --user -r requirements.txt

# Bake the embedding model into the image so a cold start doesn't download it.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY --chown=user . .

# Public demo defaults; secrets (Neo4j, OmniRoute key/URL) come from Space settings.
ENV READ_ONLY=true \
    LLM_PROVIDER=openai \
    OPENAI_MODEL=rag-free

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
