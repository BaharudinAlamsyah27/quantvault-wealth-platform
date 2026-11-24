import json
import math
import time
from http.server import BaseHTTPRequestHandler

import numpy as np
from scipy.optimize import minimize

_RATE_BUCKETS = {}


def _rate_allowed(key):
    now = time.time()
    bucket = _RATE_BUCKETS.get(key)
    if bucket is None or bucket[1] <= now:
        _RATE_BUCKETS[key] = [1, now + 60]
        return True, 59, 60
    bucket[0] += 1
    return bucket[0] <= 60, max(0, 60 - bucket[0]), max(1, int(bucket[1] - now))


def _project_simplex(values, upper):
    values = np.asarray(values, dtype=float)
    upper = min(1.0, max(float(upper), 1.0 / len(values)))
    low = float(np.min(values) - 1.0)
    high = float(np.max(values))
    for _ in range(70):
        theta = (low + high) / 2.0
        total = np.clip(values - theta, 0.0, upper).sum()
        if total > 1.0:
            low = theta
        else:
            high = theta
    weights = np.clip(values - (low + high) / 2.0, 0.0, upper)
    residual = 1.0 - float(weights.sum())
    if abs(residual) > 1e-12:
        for index in range(len(weights)):
            if -1e-12 <= weights[index] + residual <= upper + 1e-12:
                weights[index] += residual
                break
    return weights, upper


def _number(value, name, lower, upper, default):
    number = float(default if value is None else value)
    if not math.isfinite(number) or number < lower or number > upper:
        raise ValueError(f"{name} must be between {lower} and {upper}")
    return number


def _handler(body):
    started = time.perf_counter()
    means = np.asarray(body.get("means", []), dtype=float)
    covariance = np.asarray(body.get("covarianceMatrix", []), dtype=float)
    returns_matrix = np.asarray(body.get("returnsMatrix", []), dtype=float)
    if means.ndim != 1 or covariance.shape != (len(means), len(means)) or not len(means):
        raise ValueError("means and covarianceMatrix must have matching dimensions")
    if returns_matrix.ndim != 2 or returns_matrix.shape[1] != len(means) or returns_matrix.shape[0] < 2:
        raise ValueError("returnsMatrix must contain at least two monthly observations for every asset")
    if not np.isfinite(means).all() or not np.isfinite(covariance).all():
        raise ValueError("market estimates must contain finite values")
    if not np.isfinite(returns_matrix).all():
        raise ValueError("returnsMatrix must contain finite values")
    if len(means) > 100:
        raise ValueError("at most 100 assets can be optimized")
    covariance = (covariance + covariance.T) / 2.0
    assets = body.get("assets", [])
    if not isinstance(assets, list) or len(assets) != len(means):
        assets = [{"id": str(index), "isSharia": True, "active": True} for index in range(len(means))]
    active = [index for index, asset in enumerate(assets) if asset.get("active", True) and (not body.get("shariaOnly") or asset.get("isSharia", False))]
    if not active:
        raise ValueError("at least one eligible asset is required")
    active_means = means[active]
    active_covariance = covariance[np.ix_(active, active)]
    max_weight = max(_number(body.get("maxWeight"), "maxWeight", 0.01, 1.0, 0.35), 1.0 / len(active))
    risk_free_rate = _number(body.get("riskFreeRate"), "riskFreeRate", 0.0, 0.5, 0.0625)
    risk_aversion = _number(body.get("riskAversion"), "riskAversion", 0.1, 50.0, 2.6)
    objective = body.get("objective", "RISK_MATCHED")
    if objective not in {"RISK_MATCHED", "MIN_VOLATILITY", "MAX_SHARPE", "TARGET_RETURN"}:
        raise ValueError("objective is not supported")
    initial = np.full(len(active), 1.0 / len(active))
    initial, _ = _project_simplex(initial, max_weight)
    bounds = [(0.0, max_weight)] * len(active)
    constraints = ({"type": "eq", "fun": lambda weights: float(np.sum(weights) - 1.0), "jac": lambda weights: np.ones_like(weights)},)

    def variance(weights):
        return float(weights @ active_covariance @ weights)

    def negative_sharpe(weights):
        vol = max(math.sqrt(max(variance(weights), 1e-16)), 1e-12)
        return -float((weights @ active_means - risk_free_rate) / vol)

    def negative_sharpe_jac(weights):
        var = max(variance(weights), 1e-16)
        vol = math.sqrt(var)
        sigma_w = active_covariance @ weights
        excess = float(weights @ active_means - risk_free_rate)
        return -(active_means * vol - excess * (sigma_w / vol)) / var

    if objective == "MIN_VOLATILITY":
        fun = lambda weights: 0.5 * variance(weights)
        jac = lambda weights: active_covariance @ weights
    elif objective == "MAX_SHARPE":
        fun = negative_sharpe
        jac = negative_sharpe_jac
    elif objective == "TARGET_RETURN":
        target = _number(body.get("targetReturn"), "targetReturn", -1.0, 2.0, np.mean(active_means))
        fun = lambda weights: 0.5 * variance(weights) + 900.0 * float(weights @ active_means - target) ** 2
        jac = lambda weights: active_covariance @ weights + 1800.0 * float(weights @ active_means - target) * active_means
    else:
        fun = lambda weights: -float(weights @ active_means) + 0.5 * risk_aversion * variance(weights)
        jac = lambda weights: -active_means + risk_aversion * (active_covariance @ weights)
    result = minimize(fun, initial, method="SLSQP", jac=jac, bounds=bounds, constraints=constraints, options={"maxiter": 500, "ftol": 1e-12, "disp": False})
    if not result.success and not np.isfinite(result.x).all():
        raise ValueError("SLSQP could not find a feasible portfolio")
    active_weights, _ = _project_simplex(result.x, max_weight)
    full_weights = np.zeros(len(means))
    full_weights[active] = active_weights
    expected_return = float(full_weights @ means)
    volatility = float(math.sqrt(max(float(full_weights @ covariance @ full_weights), 0.0)))
    sharpe = (expected_return - risk_free_rate) / volatility if volatility > 1e-12 else 0.0
    portfolio_monthly_returns = returns_matrix @ full_weights
    monthly_risk_free = risk_free_rate / 12.0
    downside = np.minimum(0.0, portfolio_monthly_returns - monthly_risk_free)
    downside_deviation = float(math.sqrt(float(np.mean(downside**2)) * 12.0))
    sortino = (expected_return - risk_free_rate) / downside_deviation if downside_deviation > 1e-12 else 0.0
    var95 = max(0.0, -(expected_return - 1.64485 * volatility))
    cvar95 = max(0.0, -(expected_return - 2.06271 * volatility))
    historical_var95 = max(0.0, -float(np.quantile(portfolio_monthly_returns, 0.05)) * math.sqrt(12.0))
    wealth = 1.0
    peak = 1.0
    max_drawdown = 0.0
    for monthly_return in portfolio_monthly_returns:
        wealth *= max(0.0, 1.0 + float(monthly_return))
        peak = max(peak, wealth)
        if peak > 0:
            max_drawdown = min(max_drawdown, (wealth - peak) / peak)
    risk_vector = covariance @ full_weights
    variance_full = max(float(full_weights @ covariance @ full_weights), 1e-14)
    contributions = full_weights * risk_vector / variance_full
    return {
        "weights": {str(assets[index].get("id", index)): float(full_weights[index]) for index in range(len(full_weights))},
        "metrics": {"expectedReturn": expected_return, "volatility": volatility, "sharpeRatio": sharpe, "sortinoRatio": sortino, "var95": var95, "cvar95": cvar95, "historicalVaR95": historical_var95, "maxDrawdown": max_drawdown, "riskContributions": {str(assets[index].get("id", index)): float(contributions[index]) for index in range(len(contributions))}},
        "engine": "python-scipy-slsqp",
        "success": bool(result.success),
        "message": str(result.message),
        "executionTimeMs": (time.perf_counter() - started) * 1000.0,
        "effectiveMaxWeight": max_weight,
    }


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        forwarded = self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        allowed, remaining, retry_after = _rate_allowed(forwarded or self.client_address[0])
        self.remaining = remaining
        if not allowed:
            self._send(429, {"error": "Rate limit exceeded."}, retry_after)
            return
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length > 16 * 1024:
            self._send(413, {"error": "Request body must be smaller than 16 KB."})
            return
        try:
            body = json.loads(self.rfile.read(content_length) or b"{}")
            if not isinstance(body, dict):
                raise ValueError("JSON body must be an object")
            self._send(200, _handler(body))
        except Exception as error:
            self._send(400, {"error": str(error)})

    def do_GET(self):
        self._send(405, {"error": "Use POST with market estimates and optimization constraints."})

    def _send(self, status, payload, retry_after=None):
        encoded = json.dumps(payload, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-RateLimit-Limit", "60")
        self.send_header("X-RateLimit-Remaining", str(getattr(self, "remaining", 59)))
        self.send_header("Content-Length", str(len(encoded)))
        if retry_after is not None:
            self.send_header("Retry-After", str(retry_after))
        self.end_headers()
        self.wfile.write(encoded)
