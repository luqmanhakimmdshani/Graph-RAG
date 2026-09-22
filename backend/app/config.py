from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    neo4j_uri: str = ""
    # Aura's own downloaded .env uses NEO4J_USERNAME/NEO4J_DATABASE, not the
    # NEO4J_USER this app otherwise uses - accept both so pasting Aura's file
    # in as-is doesn't silently break.
    neo4j_user: str = Field("neo4j", validation_alias=AliasChoices("NEO4J_USER", "NEO4J_USERNAME"))
    neo4j_password: str = ""
    neo4j_database: str = Field("neo4j", validation_alias=AliasChoices("NEO4J_DATABASE"))
    chroma_persist_dir: str = "./chroma_data"
    embedding_model: str = "all-MiniLM-L6-v2"


settings = Settings()
