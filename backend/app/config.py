from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    # gemini-3.6-flash's free tier is 20 requests/DAY (found the hard way, mid
    # Phase 2 batch extraction) - unusable for both bulk extraction (1248
    # chunks) and even light interactive demo use. flash-lite gets a separate,
    # far larger daily quota bucket (~500/day) since it's a lighter model.
    gemini_model: str = "gemini-3.5-flash-lite"
    neo4j_uri: str = ""
    # Aura's own downloaded .env uses NEO4J_USERNAME/NEO4J_DATABASE, not the
    # NEO4J_USER this app otherwise uses - accept both so pasting Aura's file
    # in as-is doesn't silently break.
    neo4j_user: str = Field("neo4j", validation_alias=AliasChoices("NEO4J_USER", "NEO4J_USERNAME"))
    neo4j_password: str = ""
    neo4j_database: str = Field("neo4j", validation_alias=AliasChoices("NEO4J_DATABASE"))
    chroma_persist_dir: str = "./chroma_data"
    embedding_model: str = "all-MiniLM-L6-v2"
    # A hung/slow Gemini call previously blocked a request indefinitely, with
    # nothing enforcing the PRD's own "~8s acceptable" query latency budget.
    # 20s gives real answers room to finish while still failing a stuck one.
    gemini_timeout_ms: int = 20_000
    # "gemini", "ollama" or "openai" - Ollama is the local fallback when Gemini's
    # quota is spent (default model fits a 4 GB GPU; bigger ones spill to CPU).
    # "openai" is any OpenAI-compatible endpoint: OmniRoute, Groq, OpenRouter...
    llm_provider: str = "gemini"
    openai_base_url: str = "http://localhost:20128/v1"
    openai_api_key: str = ""
    openai_model: str = "auto/best-free"
    # Routers like OmniRoute fall back across providers inside one request.
    openai_timeout_s: float = 60.0
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_timeout_s: float = 20.0


settings = Settings()
