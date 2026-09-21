from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://idp:idp@db:5432/idp"
    vector_db_url: str = "http://vector-db:6333"
    # Canonical issuer / browser-facing base (what `iss` claims and the
    # authorize redirect use) vs. the internal docker network base the API
    # calls Keycloak on directly for token exchange, JWKS, and userinfo.
    # Same value outside Docker (see .env.example) since there's no network
    # split when running the API directly on the host.
    oidc_issuer: str = "http://localhost:8081/realms/idp"
    oidc_public_base: str = "http://localhost:8081/realms/idp"
    oidc_internal_base: str = "http://localhost:8081/realms/idp"
    oidc_client_id: str = "idp-backend"
    oidc_client_secret: str = "changeme"
    openai_api_key: str = ""
    gemini_api_key: str = ""
    storage_dir: str = "/data/uploads"

    class Config:
        env_file = ".env"


settings = Settings()
