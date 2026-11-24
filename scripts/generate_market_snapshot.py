#!/usr/bin/env python3
"""Build a reproducible calibrated market snapshot for review and scheduled CI."""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from pypfopt import risk_models


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "data" / "market-snapshot.json"

ASSETS = [
    ("MM_PUAS", 0.054, 0.0085, 0.03, 0.12, 0.02, 0.01),
    ("MM_CONV", 0.0565, 0.009, 0.04, 0.14, 0.01, 0.01),
    ("FI_SUKUK", 0.0685, 0.032, 0.10, -0.52, 0.08, 0.02),
    ("FI_SBN", 0.071, 0.041, 0.12, -0.66, 0.06, 0.03),
    ("FI_CORP", 0.079, 0.0485, 0.2, -0.24, 0.05, 0.03),
    ("EQ_JII", 0.118, 0.164, 0.78, 0.02, -0.12, 0.08),
    ("EQ_LQ45", 0.124, 0.172, 0.86, 0.04, -0.1, 0.12),
    ("EQ_DIV", 0.132, 0.185, 0.92, 0.1, -0.08, 0.1),
    ("EQ_TECH", 0.149, 0.228, 0.64, 0.16, -0.04, 0.72),
    ("CM_GOLD", 0.096, 0.121, -0.12, -0.08, 0.82, 0.08),
]


def build_returns():
    periods = 60
    month = np.arange(periods)
    market_shock = np.where(month == 31, -2.8, np.where(month == 32, 1.55, np.where(month == 48, -1.35, 0.0)))
    rate_shock = np.where((month >= 17) & (month <= 21), 0.55, np.where(month == 31, -0.35, 0.0))
    market = np.sin(month * 0.62) * 0.48 + np.cos(month * 0.19) * 0.23 + market_shock
    rates = np.sin(month * 0.26 + 0.8) * 0.6 + np.cos(month * 0.11) * 0.22 + rate_shock
    gold = np.cos(month * 0.21 + 0.5) * 0.66 - market * 0.14 + np.sin(month * 0.47) * 0.2
    global_equity = np.sin(month * 0.51 + 1.1) * 0.65 + np.cos(month * 0.15 + 0.3) * 0.28 + market_shock * 0.72
    columns = {}
    for index, (asset_id, annual_return, annual_volatility, market_loading, rate_loading, gold_loading, global_loading) in enumerate(ASSETS):
        idiosyncratic = np.sin(month * (0.37 + index * 0.013) + index * 0.91) * 0.38 + np.cos(month * (0.79 + index * 0.009) + index * 0.41) * 0.2
        raw = market_loading * market + rate_loading * rates + gold_loading * gold + global_loading * global_equity + idiosyncratic
        raw = raw - raw.mean()
        raw = raw / raw.std(ddof=1) * (annual_volatility / np.sqrt(12)) + annual_return / 12
        columns[asset_id] = raw
    return pd.DataFrame(columns, index=pd.date_range("2021-11-30", periods=periods, freq="ME"))


def main():
    returns = build_returns()
    covariance = risk_models.CovarianceShrinkage(returns, returns_data=True, frequency=12).ledoit_wolf(shrinkage_target="constant_correlation")
    expected_returns = returns.mean() * 12
    payload = {
        "generatedAt": pd.Timestamp.now(tz="UTC").isoformat(),
        "source": "calibrated-synthetic-monthly-returns",
        "observationCount": int(len(returns)),
        "assetIds": list(returns.columns),
        "annualizedExpectedReturns": expected_returns.to_dict(),
        "annualizedCovarianceMatrix": covariance.to_dict(),
        "annualizedCorrelationMatrix": returns.corr().to_dict(),
        "shrinkage": "PyPortfolioOpt Ledoit-Wolf constant-correlation",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote synthetic market snapshot to {OUTPUT}")


if __name__ == "__main__":
    main()
