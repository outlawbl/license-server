from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )

    # App
    APP_NAME: str = "Panconnect License Server"
    APP_VERSION: str = "1.1.0"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str

    # JWT Secret za signing license tokens
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"

    # RS256 keypair za potpisivanje license tokena.
    # Ako je JWT_PRIVATE_KEY_FILE postavljen, tokeni se potpisuju sa RS256 i
    # klijenti (Panconnect) ih mogu verifikovati ugrađenim javnim ključem,
    # a ne mogu ih krivotvoriti. Generisanje: python scripts/generate_signing_keys.py
    JWT_PRIVATE_KEY_FILE: str = ""
    JWT_PUBLIC_KEY_FILE: str = ""

    # License token expiry (u satima)
    LICENSE_TOKEN_EXPIRY_HOURS: int = 24

    # Admin credentials
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str = ""

    # CORS - JSON string in env, will be parsed
    ALLOWED_ORIGINS_JSON: str = '["http://localhost:3000","http://localhost:3001"]'

    @property
    def ALLOWED_ORIGINS(self):
        """Parse JSON string to list"""
        try:
            return json.loads(self.ALLOWED_ORIGINS_JSON)
        except:
            return ["http://localhost:3000", "http://localhost:3001"]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
