import os
import secrets
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration with security best practices"""
    # Use a fixed secret key - in production, set JWT_SECRET_KEY in .env file
    # Generate once: python -c "import secrets; print(secrets.token_hex(32))"
    _default_secret = 'ems-hanger-secret-key-change-in-production-2026'
    SECRET_KEY = os.getenv('JWT_SECRET_KEY', _default_secret)
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', _default_secret)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)  # 8 hours for better security
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # Database Configuration
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'ems_hanger')
    
    # CORS Configuration
    CORS_HEADERS = 'Content-Type'
    
    # Security Headers
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
