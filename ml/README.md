# StockPilot AI - Machine Learning Integration Layer

## Overview
This directory defines the machine learning model contracts, artifacts, feature schemas, and evaluation utilities for **StockPilot AI**.

## Model Inspection Report (Stage 1)
- **Status at initialization**: No pre-existing model weights, preprocessing pickles, or inference scripts were discovered in the repository.
- **Model Adapter Pattern**: StockPilot AI adheres strictly to an extensible `ModelAdapter` interface (`apps/api/app/ml/adapter.py`). The backend application never assumes arbitrary internal neural/tree architectures or fabricates uncalibrated probabilities.
- **Model Availability Contract**: If an artifact (`.joblib`, `.pt`, `.onnx`) is missing or invalid, the system exposes an explicit `ModelStatus.UNAVAILABLE` / `Insufficient Data` state through the API (`GET /api/v1/predictions`). It **never** fabricates fake successful predictions in production.

---

## Model Artifact Specification

To integrate a trained model, place the model files into `ml/artifacts/`:

1. **Model Weights**: `ml/artifacts/stockpilot_model.joblib` (or `.pkl`, `.onnx`, `.pt`)
2. **Metadata & Preprocessing Specs**: `ml/artifacts/model_metadata.json`

### Metadata Schema (`model_metadata.json`):
```json
{
  "model_name": "StockPilot-NSE-GradientBoosting",
  "model_version": "1.0.0",
  "framework": "scikit-learn / XGBoost / PyTorch",
  "target": "5_day_forward_excess_return",
  "prediction_horizon_days": 5,
  "calibration_status": "uncalibrated",
  "feature_names": [
    "return_1d",
    "return_5d",
    "return_20d",
    "volatility_20d",
    "rsi_14",
    "macd_histogram",
    "bb_percent_b",
    "atr_14_normalized",
    "volume_ratio_20d"
  ],
  "scaler_path": "ml/artifacts/scaler.joblib",
  "created_at": "2026-10-15T00:00:00Z"
}
```

---

## Feature Definitions and Preprocessing

All features are calculated using time-strict historical bars with strictly zero forward-looking lookahead bias:

| Feature Name | Description | Formula / Source |
|---|---|---|
| `return_1d` | 1-day percentage close return | `(C_t - C_{t-1}) / C_{t-1}` |
| `return_5d` | 5-day cumulative return | `(C_t - C_{t-5}) / C_{t-5}` |
| `return_20d` | 20-day cumulative return | `(C_t - C_{t-20}) / C_{t-20}` |
| `volatility_20d` | 20-day annualized rolling volatility | `std(returns_1d[-20:]) * sqrt(252)` |
| `rsi_14` | Relative Strength Index (14 periods) | Wilder's RSI (14) bounded [0, 100] |
| `macd_histogram` | MACD difference | `MACD(12, 26) - Signal(9)` |
| `bb_percent_b` | Bollinger Band %b | `(Close - Lower) / (Upper - Lower)` |
| `atr_14_normalized`| Average True Range normalized | `ATR(14) / Close` |
| `volume_ratio_20d` | Volume vs 20-day SMA | `Volume / SMA(Volume, 20)` |

---

## Prediction Output Semantics

The model adapter validates output shapes and returns a strongly-typed `PredictionResult`:
- `predicted_return`: Expected % return over the specified horizon (e.g. +0.024 for +2.4%)
- `outlook_label`: Standardized decision-support label (`Positive`, `Neutral`, `Negative`, `Monitor`, or `Insufficient Data`)
- `positive_return_probability`: Float between 0.0 and 1.0 **only** if the model explicitly provides calibrated probabilities. Otherwise set to `null` to avoid misleading users.
- `uncertainty_score`: Rolling prediction interval or error metric (standard deviation)
- `feature_importances`: Dict mapping top input feature names to their contribution or attribution values.
- `model_version`: Immutable string tag matching training metadata.
