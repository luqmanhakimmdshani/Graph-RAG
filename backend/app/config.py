from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://idp:idp@db:5432/idp"
    vector_db_url: str = "http://vector-db:6333"
    oidc_issuer: str = "http://keycloak:8080/realms/idp"
    oidc_client_id: str = "idp-backend"
    oidc_client_secret: str = "changeme"
    openai_api_key: str = ""
    gemini_api_key: str = ""
    storage_dir: str = "/data/uploads"

    class Config:
        env_file = ".env"


settings = Settings()
