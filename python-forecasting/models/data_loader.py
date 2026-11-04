"""
Data Loader — Extracts historical financial and authorization data from PostgreSQL.
Connects to the same database as the Spring Boot backend.
"""
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_URL

logger = logging.getLogger("forecasting.data_loader")


def get_engine():
    """Create a SQLAlchemy engine connected to the PostgreSQL database."""
    return create_engine(DATABASE_URL, pool_pre_ping=True)


def load_monthly_revenue() -> pd.DataFrame:
    """
    Load monthly revenue data from paid invoices (factures with statut='PAYEE').
    Returns a DataFrame with columns: ['ds', 'y'] (Prophet format)
    - ds: first day of the month (datetime)
    - y: total revenue for that month
    """
    engine = get_engine()
    query = text("""
        SELECT
            DATE_TRUNC('month', date_emission) AS month,
            SUM(montant) AS total_revenue
        FROM facture
        WHERE statut = 'PAYEE'
          AND date_emission IS NOT NULL
          AND montant > 0
        GROUP BY DATE_TRUNC('month', date_emission)
        ORDER BY month
    """)
    try:
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        if df.empty:
            logger.warning("No paid invoice data found in database.")
            return pd.DataFrame(columns=["ds", "y"])
        df.columns = ["ds", "y"]
        df["ds"] = pd.to_datetime(df["ds"])
        return df
    except Exception as e:
        logger.error(f"Error loading monthly revenue: {e}")
        return pd.DataFrame(columns=["ds", "y"])


def load_revenue_by_service() -> pd.DataFrame:
    """
    Load revenue data grouped by service type (type_autorisation on the facture).
    Returns a DataFrame with columns: ['service', 'total_revenue', 'invoice_count']
    """
    engine = get_engine()
    query = text("""
        SELECT
            COALESCE(type_autorisation, 'AUTRE') AS service,
            SUM(montant) AS total_revenue,
            COUNT(*) AS invoice_count
        FROM facture
        WHERE statut = 'PAYEE'
          AND montant > 0
        GROUP BY type_autorisation
        ORDER BY total_revenue DESC
    """)
    try:
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        return df
    except Exception as e:
        logger.error(f"Error loading revenue by service: {e}")
        return pd.DataFrame(columns=["service", "total_revenue", "invoice_count"])


def load_monthly_revenue_by_service() -> pd.DataFrame:
    """
    Load monthly revenue broken down by service type.
    Returns a DataFrame with columns: ['ds', 'service', 'y']
    """
    engine = get_engine()
    query = text("""
        SELECT
            DATE_TRUNC('month', date_emission) AS month,
            COALESCE(type_autorisation, 'AUTRE') AS service,
            SUM(montant) AS total_revenue
        FROM facture
        WHERE statut = 'PAYEE'
          AND date_emission IS NOT NULL
          AND montant > 0
        GROUP BY DATE_TRUNC('month', date_emission), type_autorisation
        ORDER BY month, service
    """)
    try:
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        if df.empty:
            return pd.DataFrame(columns=["ds", "service", "y"])
        df.columns = ["ds", "service", "y"]
        df["ds"] = pd.to_datetime(df["ds"])
        return df
    except Exception as e:
        logger.error(f"Error loading monthly revenue by service: {e}")
        return pd.DataFrame(columns=["ds", "service", "y"])


def load_authorization_stats() -> dict:
    """
    Load current authorization statistics for contextual analysis.
    Returns a dict with counts by type and status.
    """
    engine = get_engine()
    query_by_service = text("""
        SELECT
            COALESCE(service, 'AUTRE') AS service,
            statut,
            COUNT(*) AS cnt
        FROM autorisation
        GROUP BY service, statut
    """)
    try:
        with engine.connect() as conn:
            df = pd.read_sql(query_by_service, conn)
        result = {
            "total": int(df["cnt"].sum()),
            "by_service": {},
            "by_status": {}
        }
        for _, row in df.iterrows():
            svc = row["service"]
            stat = row["statut"]
            cnt = int(row["cnt"])
            result["by_service"][svc] = result["by_service"].get(svc, 0) + cnt
            result["by_status"][stat] = result["by_status"].get(stat, 0) + cnt
        return result
    except Exception as e:
        logger.error(f"Error loading authorization stats: {e}")
        return {"total": 0, "by_service": {}, "by_status": {}}


def load_yearly_totals() -> pd.DataFrame:
    """
    Load yearly revenue totals for growth rate calculation.
    Returns a DataFrame with columns: ['year', 'total_revenue']
    """
    engine = get_engine()
    query = text("""
        SELECT
            EXTRACT(YEAR FROM date_emission)::int AS year,
            SUM(montant) AS total_revenue
        FROM facture
        WHERE statut = 'PAYEE'
          AND date_emission IS NOT NULL
          AND montant > 0
        GROUP BY EXTRACT(YEAR FROM date_emission)
        ORDER BY year
    """)
    try:
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        return df
    except Exception as e:
        logger.error(f"Error loading yearly totals: {e}")
        return pd.DataFrame(columns=["year", "total_revenue"])


def load_invoice_count_by_month() -> pd.DataFrame:
    """
    Load the count of invoices per month (for volume forecasting).
    Returns a DataFrame with columns: ['ds', 'y']
    """
    engine = get_engine()
    query = text("""
        SELECT
            DATE_TRUNC('month', date_emission) AS month,
            COUNT(*) AS invoice_count
        FROM facture
        WHERE date_emission IS NOT NULL
        GROUP BY DATE_TRUNC('month', date_emission)
        ORDER BY month
    """)
    try:
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        if df.empty:
            return pd.DataFrame(columns=["ds", "y"])
        df.columns = ["ds", "y"]
        df["ds"] = pd.to_datetime(df["ds"])
        return df
    except Exception as e:
        logger.error(f"Error loading invoice count by month: {e}")
        return pd.DataFrame(columns=["ds", "y"])
