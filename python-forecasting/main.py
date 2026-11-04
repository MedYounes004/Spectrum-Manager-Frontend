"""
SFM Spectre — AI Forecasting Microservice
==========================================
FastAPI server that provides ML-powered revenue and budget predictions
by analyzing historical invoice and authorization data from PostgreSQL.

Endpoints:
  GET /api/forecast/summary     → Full forecast summary (revenue, services, confidence)
  GET /api/forecast/revenue     → Revenue forecast for next year
  GET /api/forecast/by-service  → Revenue breakdown by service type
  GET /api/forecast/health      → Health check & DB connectivity status
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging

from config import CORS_ORIGINS
from models.data_loader import (
    load_monthly_revenue,
    load_revenue_by_service,
    load_yearly_totals,
    load_authorization_stats,
    load_invoice_count_by_month,
)
from models.forecaster import (
    forecast_revenue_prophet,
    forecast_by_service,
    calculate_growth_rates,
)

# ═══════════════════════════════════════════════════════════════
# LOGGING SETUP
# ═══════════════════════════════════════════════════════════════
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("forecasting")

# ═══════════════════════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════════════════════
app = FastAPI(
    title="SFM Spectre — Service de Prévisions IA",
    description="Microservice de prévisions budgétaires et de revenus basé sur l'IA",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════
# CACHE — avoid retraining the model on every request
# ═══════════════════════════════════════════════════════════════
_forecast_cache = {
    "result": None,
    "timestamp": None,
    "ttl_seconds": 300,  # Cache for 5 minutes
}


def _is_cache_valid() -> bool:
    if _forecast_cache["result"] is None or _forecast_cache["timestamp"] is None:
        return False
    elapsed = (datetime.now() - _forecast_cache["timestamp"]).total_seconds()
    return elapsed < _forecast_cache["ttl_seconds"]


def _run_full_forecast() -> dict:
    """Execute the full forecasting pipeline."""
    logger.info("Running full forecast pipeline...")

    # 1. Load data from PostgreSQL
    df_monthly = load_monthly_revenue()
    df_service = load_revenue_by_service()
    df_yearly = load_yearly_totals()
    auth_stats = load_authorization_stats()

    # 2. Run revenue forecast (Prophet or regression fallback)
    revenue_forecast = forecast_revenue_prophet(df_monthly)

    # 3. Decompose by service
    service_forecast = forecast_by_service(
        df_service,
        revenue_forecast.get("predictedAnnualRevenue", 0)
    )

    # 4. Historical growth rates
    growth_data = calculate_growth_rates(df_yearly)

    # 5. Build historical monthly data for charts
    historical_monthly = []
    if not df_monthly.empty:
        for _, row in df_monthly.iterrows():
            historical_monthly.append({
                "month": row["ds"].strftime("%Y-%m"),
                "monthLabel": row["ds"].strftime("%b %Y"),
                "revenue": round(float(row["y"]), 2),
            })

    # 6. Assemble full result
    result = {
        "revenue": revenue_forecast,
        "byService": service_forecast,
        "growthHistory": growth_data,
        "authorizationStats": auth_stats,
        "historicalMonthly": historical_monthly,
        "generatedAt": datetime.now().isoformat(),
    }

    # Cache the result
    _forecast_cache["result"] = result
    _forecast_cache["timestamp"] = datetime.now()

    logger.info(
        f"Forecast complete: {revenue_forecast['method']} | "
        f"Year={revenue_forecast['forecastYear']} | "
        f"Predicted={revenue_forecast['predictedAnnualRevenue']} TND | "
        f"Confidence={revenue_forecast['confidenceScore']}%"
    )
    return result


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/api/forecast/summary")
def get_forecast_summary():
    """
    Full forecast summary including revenue prediction, service breakdown,
    growth history, and model confidence metrics.
    """
    if _is_cache_valid():
        return _forecast_cache["result"]
    try:
        return _run_full_forecast()
    except Exception as e:
        logger.error(f"Forecast pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/forecast/revenue")
def get_revenue_forecast():
    """Revenue forecast for the next year with monthly breakdown."""
    summary = get_forecast_summary()
    return summary["revenue"]


@app.get("/api/forecast/by-service")
def get_service_forecast():
    """Revenue forecast broken down by authorization service type."""
    summary = get_forecast_summary()
    return summary["byService"]


@app.get("/api/forecast/refresh")
def refresh_forecast():
    """Force re-run of the forecasting model (invalidate cache)."""
    _forecast_cache["result"] = None
    _forecast_cache["timestamp"] = None
    try:
        result = _run_full_forecast()
        return {"status": "ok", "message": "Modèle réentraîné avec succès", "data": result}
    except Exception as e:
        logger.error(f"Refresh error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/forecast/health")
def health_check():
    """Health check — verifies DB connectivity."""
    try:
        from models.data_loader import get_engine
        engine = get_engine()
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
