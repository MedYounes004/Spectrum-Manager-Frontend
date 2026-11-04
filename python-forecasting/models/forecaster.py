"""
Forecaster — Machine Learning module for revenue and budget predictions.

Strategy:
  1. If >= 12 monthly data points → use Facebook Prophet (time series)
  2. If < 12 data points → fallback to Linear Regression + weighted growth rate
  3. Per-service forecasting via proportional decomposition
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_percentage_error, r2_score
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MIN_DATAPOINTS_PROPHET, FORECAST_HORIZON_MONTHS, CONFIDENCE_INTERVAL

logger = logging.getLogger("forecasting.forecaster")

# ═══════════════════════════════════════════════════════════════
# Try to import Prophet — gracefully handle if not installed
# ═══════════════════════════════════════════════════════════════
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    logger.warning("Prophet is not installed. Falling back to Linear Regression only.")


# ═══════════════════════════════════════════════════════════════
# SERVICE LABELS (French)
# ═══════════════════════════════════════════════════════════════
SERVICE_LABELS = {
    "MOBILE_TERRESTRE": "Mobile Terrestre (5G/6G)",
    "FIXE": "Faisceaux Hertziens (Fixe)",
    "RADIODIFFUSION": "Radiodiffusion (TV/Radio)",
    "MARITIME": "Service Maritime",
    "MOBILE_AERONAUTIQUE": "Aéronautique",
    "AMATEUR": "Service Amateur",
    "SATELLITE": "Satellite",
    "AUTRE": "Autres Services",
}


def forecast_revenue_prophet(df_monthly: pd.DataFrame) -> dict:
    """
    Use Facebook Prophet to forecast monthly revenue for the next year.
    
    Args:
        df_monthly: DataFrame with columns ['ds', 'y']
    
    Returns:
        dict with forecast results
    """
    if not PROPHET_AVAILABLE or len(df_monthly) < MIN_DATAPOINTS_PROPHET:
        return forecast_revenue_regression(df_monthly)

    try:
        # Suppress Prophet's verbose output
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=CONFIDENCE_INTERVAL,
            changepoint_prior_scale=0.05
        )
        model.fit(df_monthly)

        # Create future dataframe for next 12 months
        future = model.make_future_dataframe(periods=FORECAST_HORIZON_MONTHS, freq="MS")
        forecast = model.predict(future)

        # Extract only the forecasted months (beyond the historical data)
        last_historical_date = df_monthly["ds"].max()
        forecast_future = forecast[forecast["ds"] > last_historical_date].copy()

        # Calculate annual totals
        forecast_year = int(last_historical_date.year) + 1
        predicted_annual = float(forecast_future["yhat"].sum())
        predicted_lower = float(forecast_future["yhat_lower"].sum())
        predicted_upper = float(forecast_future["yhat_upper"].sum())

        # Monthly breakdown
        monthly_predictions = []
        for _, row in forecast_future.iterrows():
            monthly_predictions.append({
                "month": row["ds"].strftime("%Y-%m"),
                "monthLabel": row["ds"].strftime("%b %Y"),
                "predicted": round(float(row["yhat"]), 2),
                "lower": round(float(row["yhat_lower"]), 2),
                "upper": round(float(row["yhat_upper"]), 2),
            })

        # Calculate model accuracy on historical data
        forecast_historical = forecast[forecast["ds"] <= last_historical_date]
        merged = df_monthly.merge(forecast_historical[["ds", "yhat"]], on="ds", how="inner")
        if len(merged) > 1:
            mape = mean_absolute_percentage_error(merged["y"], merged["yhat"])
            r2 = r2_score(merged["y"], merged["yhat"])
            confidence_score = max(0, min(100, round((1 - mape) * 100, 1)))
        else:
            mape = 0.0
            r2 = 0.0
            confidence_score = 50.0

        # Growth rate
        current_year_data = df_monthly[df_monthly["ds"].dt.year == last_historical_date.year]
        current_annual = float(current_year_data["y"].sum())
        growth_rate = ((predicted_annual - current_annual) / current_annual * 100) if current_annual > 0 else 0.0

        return {
            "method": "Prophet",
            "forecastYear": forecast_year,
            "predictedAnnualRevenue": round(predicted_annual, 2),
            "predictedLower": round(predicted_lower, 2),
            "predictedUpper": round(predicted_upper, 2),
            "monthlyPredictions": monthly_predictions,
            "confidenceScore": confidence_score,
            "mape": round(mape * 100, 2),
            "r2Score": round(r2, 4),
            "growthRate": round(growth_rate, 2),
            "currentYearRevenue": round(current_annual, 2),
            "dataPointsUsed": len(df_monthly),
            "trainedAt": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Prophet forecasting failed: {e}")
        return forecast_revenue_regression(df_monthly)


def forecast_revenue_regression(df_monthly: pd.DataFrame) -> dict:
    """
    Fallback: use Linear Regression on monthly revenue data.
    Works even with very few data points.
    """
    if df_monthly.empty or len(df_monthly) < 2:
        return _empty_forecast()

    try:
        df = df_monthly.copy().sort_values("ds").reset_index(drop=True)
        
        # Create numeric feature (month index)
        df["month_idx"] = range(len(df))
        X = df[["month_idx"]].values
        y = df["y"].values

        model = LinearRegression()
        model.fit(X, y)

        # Predict the next 12 months
        last_idx = len(df) - 1
        last_date = df["ds"].max()
        forecast_year = int(last_date.year) + 1

        future_indices = np.arange(last_idx + 1, last_idx + 1 + FORECAST_HORIZON_MONTHS).reshape(-1, 1)
        predictions = model.predict(future_indices)
        predictions = np.maximum(predictions, 0)  # No negative revenue

        # Calculate confidence based on R²
        y_pred_train = model.predict(X)
        r2 = r2_score(y, y_pred_train)
        mape = mean_absolute_percentage_error(y, y_pred_train) if len(y) > 1 else 0.5
        confidence_score = max(0, min(100, round((1 - mape) * 100, 1)))

        # Standard error for confidence bands
        residuals = y - y_pred_train
        std_err = float(np.std(residuals)) if len(residuals) > 1 else float(np.mean(y)) * 0.15

        # Monthly breakdown
        monthly_predictions = []
        for i in range(FORECAST_HORIZON_MONTHS):
            future_date = last_date + pd.DateOffset(months=i + 1)
            future_date = future_date.replace(day=1)
            pred_val = float(predictions[i])
            monthly_predictions.append({
                "month": future_date.strftime("%Y-%m"),
                "monthLabel": future_date.strftime("%b %Y"),
                "predicted": round(pred_val, 2),
                "lower": round(max(0, pred_val - 1.96 * std_err), 2),
                "upper": round(pred_val + 1.96 * std_err, 2),
            })

        predicted_annual = float(predictions.sum())
        current_year_data = df[df["ds"].dt.year == last_date.year]
        current_annual = float(current_year_data["y"].sum())
        growth_rate = ((predicted_annual - current_annual) / current_annual * 100) if current_annual > 0 else 0.0

        return {
            "method": "Régression Linéaire",
            "forecastYear": forecast_year,
            "predictedAnnualRevenue": round(predicted_annual, 2),
            "predictedLower": round(max(0, predicted_annual - 1.96 * std_err * 12), 2),
            "predictedUpper": round(predicted_annual + 1.96 * std_err * 12, 2),
            "monthlyPredictions": monthly_predictions,
            "confidenceScore": confidence_score,
            "mape": round(mape * 100, 2),
            "r2Score": round(r2, 4),
            "growthRate": round(growth_rate, 2),
            "currentYearRevenue": round(current_annual, 2),
            "dataPointsUsed": len(df_monthly),
            "trainedAt": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Regression forecasting failed: {e}")
        return _empty_forecast()


def forecast_by_service(
    df_service_totals: pd.DataFrame,
    predicted_annual: float
) -> list:
    """
    Decompose the annual forecast by service type using historical proportions.
    
    Args:
        df_service_totals: DataFrame with ['service', 'total_revenue']
        predicted_annual: total predicted revenue
    
    Returns:
        list of dicts with per-service forecasts
    """
    if df_service_totals.empty or predicted_annual <= 0:
        return []

    total_historical = float(df_service_totals["total_revenue"].sum())
    if total_historical <= 0:
        return []

    result = []
    for _, row in df_service_totals.iterrows():
        svc = row["service"]
        proportion = float(row["total_revenue"]) / total_historical
        predicted = round(predicted_annual * proportion, 2)
        label = SERVICE_LABELS.get(svc, svc)
        result.append({
            "service": svc,
            "label": label,
            "proportion": round(proportion * 100, 1),
            "predictedRevenue": predicted,
            "historicalRevenue": round(float(row["total_revenue"]), 2),
            "invoiceCount": int(row.get("invoice_count", 0)),
        })

    return result


def calculate_growth_rates(df_yearly: pd.DataFrame) -> dict:
    """
    Calculate year-over-year growth rates from historical yearly totals.
    """
    if df_yearly.empty or len(df_yearly) < 2:
        return {"rates": [], "averageGrowth": 0.0}

    df = df_yearly.sort_values("year").reset_index(drop=True)
    rates = []
    for i in range(1, len(df)):
        prev = float(df.iloc[i - 1]["total_revenue"])
        curr = float(df.iloc[i]["total_revenue"])
        if prev > 0:
            rate = round(((curr - prev) / prev) * 100, 2)
            rates.append({
                "year": int(df.iloc[i]["year"]),
                "rate": rate,
                "revenue": round(curr, 2),
            })

    avg = round(sum(r["rate"] for r in rates) / len(rates), 2) if rates else 0.0
    return {"rates": rates, "averageGrowth": avg}


def _empty_forecast() -> dict:
    """Return an empty forecast result when no data is available."""
    current_year = datetime.now().year
    return {
        "method": "Aucune donnée",
        "forecastYear": current_year + 1,
        "predictedAnnualRevenue": 0,
        "predictedLower": 0,
        "predictedUpper": 0,
        "monthlyPredictions": [],
        "confidenceScore": 0,
        "mape": 100,
        "r2Score": 0,
        "growthRate": 0,
        "currentYearRevenue": 0,
        "dataPointsUsed": 0,
        "trainedAt": datetime.now().isoformat(),
    }
