"""
Application Configuration
=========================
Loads configuration from environment variables using pydantic-settings.

This module uses python-dotenv to load .env file automatically,
and pydantic-settings for type validation and defaults.

Usage:
    from config import get_settings
    
    settings = get_settings()
    print(settings.DATABASE_URL)

The settings are cached using @lru_cache for efficiency.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file before creating Settings
# This ensures environment variables are available
load_dotenv()


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All settings can be overridden via environment variables.
    The .env file is automatically loaded by python-dotenv.
    """
    
    # -------------------------------------------------------------------------
    # Database Configuration
    # -------------------------------------------------------------------------
    # Database connection parameters
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "toki"
    
    # Optional: Full URL override
    DATABASE_URL: str = ""
    
    @property
    def SQLALCHEMY_DATABASE_URL(self) -> str:
        """Construct the database URL from components or use the override."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
            
        # Default to MySQL
        from sqlalchemy.engine.url import URL
        return URL.create(
            "mysql+mysqlconnector",
            username=self.DB_USER,
            password=self.DB_PASSWORD,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=self.DB_NAME
        ).render_as_string(hide_password=False)
    
    # -------------------------------------------------------------------------
    # JWT Authentication
    # -------------------------------------------------------------------------
    # Secret key for signing JWT tokens - MUST be changed in production!
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # -------------------------------------------------------------------------
    # Google OAuth Configuration
    # -------------------------------------------------------------------------
    # Get these from Google Cloud Console: https://console.cloud.google.com/
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:8081"
    
    # -------------------------------------------------------------------------
    # AI Model API Keys
    # -------------------------------------------------------------------------
    # Google Gemini API key for AI responses
    GEMINI_API_KEY: str = ""
    
    # -------------------------------------------------------------------------
    # ML Model Paths
    # -------------------------------------------------------------------------
    # Path to the trained policy model for teaching strategy selection
    POLICY_MODEL_PATH: str = "./models/policy_model.joblib"
    
    # Paths to Phi-3 model files
    # The base model will be downloaded from Hugging Face
    PHI3_MODEL_PATH: str = "microsoft/Phi-3-mini-4k-instruct"
    PHI3_LORA_PATH: str = "./models/phi3-tutor-lora"
    
    # -------------------------------------------------------------------------
    # Application Settings
    # -------------------------------------------------------------------------
    # API prefix for all routes
    API_PREFIX: str = "/api"
    
    # Debug mode enables:
    # - SQL query logging
    # - Skipping Phi-3 model loading for faster startup
    # - More verbose error messages
    DEBUG: bool = True
    
    # -------------------------------------------------------------------------
    # Email / SMTP Configuration
    # -------------------------------------------------------------------------
    # SMTP server settings for sending verification emails
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""  # Your email address
    SMTP_PASSWORD: str = ""  # App password (not regular password for Gmail)
    SMTP_FROM_EMAIL: str = ""  # Sender email address
    SMTP_FROM_NAME: str = "LearnAI"
    
    # Email verification settings
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    
    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Using @lru_cache ensures settings are only loaded once,
    improving performance for repeated access.
    
    Returns:
        Settings: The application settings instance
    """
    return Settings()
