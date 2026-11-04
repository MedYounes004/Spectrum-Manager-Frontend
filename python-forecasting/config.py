"""
Configuration for the SFM Spectre Forecasting Service.
Database connection settings and application config.
"""
import os

# ═══════════════════════════════════════════════════════════════
# DATABASE CONFIGURATION (PostgreSQL)
# Override with environment variables for production
# ═══════════════════════════════════════════════════════════════
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "sfmspectre_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "2004")

# SQLAlchemy connection string for PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# ═══════════════════════════════════════════════════════════════
# ML MODEL CONFIGURATION
# ═══════════════════════════════════════════════════════════════
# Minimum number of monthly data points for Prophet
MIN_DATAPOINTS_PROPHET = 12
# Forecast horizon in months
FORECAST_HORIZON_MONTHS = 12
# Confidence interval width (0-1)
CONFIDENCE_INTERVAL = 0.95

# ═══════════════════════════════════════════════════════════════
# APP CONFIGURATION
# ═══════════════════════════════════════════════════════════════
CORS_ORIGINS = ["http://localhost:4200", "http://localhost:8083"]
