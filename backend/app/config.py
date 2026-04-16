from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Home Bar Advantage"
    version: str = "0.1.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8907
    db_path: str = "hba.db"
    cors_origins: list[str] = [
        "http://localhost:5015",
        "http://100.64.0.7:5015",
        "https://hba.darrenarney.com",
    ]
    ollama_url: str = "http://192.168.0.99:11434"
    ollama_model: str = "llama3.1:8b"
    google_places_api_key: str = ""

    model_config = {"env_prefix": "HBA_"}


settings = Settings()
