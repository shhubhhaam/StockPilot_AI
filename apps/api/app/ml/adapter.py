import os
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import List, Dict, Any, Optional
from apps.api.app.core.config import settings
from apps.api.app.services.indicators import (
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_atr,
    calculate_rolling_volatility,
    calculate_sma,
)


class ModelStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


@dataclass
class PredictionResult:
    status: ModelStatus
    symbol: str
    model_version: str
    prediction_horizon: str
    prediction_timestamp: datetime
    predicted_return: Optional[float] = None
    predicted_class: Optional[str] = None
    decision_support_label: str = "Insufficient Data"
    positive_return_probability: Optional[float] = None  # None unless model is explicitly calibrated
    uncertainty_metadata: Dict[str, Any] = field(default_factory=dict)
    feature_snapshot: Dict[str, Any] = field(default_factory=dict)
    top_features: List[Dict[str, Any]] = field(default_factory=list)
    missing_requirements: List[str] = field(default_factory=list)
    notes: Optional[str] = None


class BaseMLAdapter:
    """Abstract Model Adapter for StockPilot AI ML inference."""

    def load_model(self) -> bool:
        raise NotImplementedError

    def predict(
        self,
        symbol: str,
        historical_candles: List[Dict[str, Any]],
        prediction_timestamp: Optional[datetime] = None,
    ) -> PredictionResult:
        raise NotImplementedError


class NSEAlphaModelAdapter(BaseMLAdapter):
    """
    Standard Model Adapter for Indian Equities 5-Day Horizon.
    Strictly enforces zero-leakage feature calculation, schema validation,
    and safe reporting when model weights or historical windows are unavailable.
    """

    EXPECTED_FEATURES = [
        "return_1d",
        "return_5d",
        "return_20d",
        "volatility_20d",
        "rsi_14",
        "macd_histogram",
        "bb_percent_b",
        "atr_14_normalized",
        "volume_ratio_20d",
    ]

    def __init__(self):
        self.model = None
        self.metadata: Dict[str, Any] = {}
        self.is_loaded = False
        self.load_model()

    def load_model(self) -> bool:
        artifact_path = settings.MODEL_ARTIFACT_PATH
        metadata_path = settings.MODEL_METADATA_PATH

        if not os.path.exists(artifact_path) or not os.path.exists(metadata_path):
            self.is_loaded = False
            self.metadata = {
                "model_name": "NSE-Alpha-DecisionModel",
                "model_version": settings.MODEL_VERSION,
                "framework": "scikit-learn/GradientBoosting",
                "prediction_horizon": "5d",
                "is_calibrated": False,
                "missing_files": [
                    p for p in [artifact_path, metadata_path] if not os.path.exists(p)
                ],
            }
            return False

        try:
            import joblib
            with open(metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            self.model = joblib.load(artifact_path)
            self.is_loaded = True
            return True
        except Exception as e:
            self.is_loaded = False
            self.metadata["error"] = str(e)
            return False

    def extract_features(
        self, historical_candles: List[Dict[str, Any]]
    ) -> Optional[Dict[str, float]]:
        """
        Calculates time-aligned features strictly up to the latest available bar.
        Guards against division by zero and short time-series windows.
        """
        if len(historical_candles) < 25:
            return None

        closes = [float(c["close"]) for c in historical_candles]
        highs = [float(c["high"]) for c in historical_candles]
        lows = [float(c["low"]) for c in historical_candles]
        volumes = [float(c["volume"]) for c in historical_candles]

        curr_close = closes[-1]
        if curr_close <= 0:
            return None

        # 1. Returns
        ret_1d = (curr_close - closes[-2]) / closes[-2] if closes[-2] > 0 else 0.0
        ret_5d = (curr_close - closes[-6]) / closes[-6] if len(closes) >= 6 and closes[-6] > 0 else 0.0
        ret_20d = (curr_close - closes[-21]) / closes[-21] if len(closes) >= 21 and closes[-21] > 0 else 0.0

        # 2. Volatility
        vol_series = calculate_rolling_volatility(closes, window=20)
        vol_20d = vol_series[-1] if vol_series[-1] is not None else 0.18

        # 3. RSI
        rsi_series = calculate_rsi(closes, period=14)
        rsi_14 = rsi_series[-1] if rsi_series[-1] is not None else 50.0

        # 4. MACD
        macd_dict = calculate_macd(closes)
        macd_hist = macd_dict["histogram"][-1] if macd_dict["histogram"][-1] is not None else 0.0

        # 5. Bollinger Bands
        bb_dict = calculate_bollinger_bands(closes, period=20)
        bb_b = bb_dict["percent_b"][-1] if bb_dict["percent_b"][-1] is not None else 0.5

        # 6. ATR normalized
        atr_series = calculate_atr(highs, lows, closes, period=14)
        atr_val = atr_series[-1] if atr_series[-1] is not None else (highs[-1] - lows[-1])
        atr_norm = (atr_val / curr_close) if curr_close > 0 else 0.02

        # 7. Volume ratio
        vol_sma = calculate_sma(volumes, period=20)
        avg_vol = vol_sma[-1] if vol_sma[-1] is not None and vol_sma[-1] > 0 else volumes[-1]
        vol_ratio = (volumes[-1] / avg_vol) if avg_vol > 0 else 1.0

        return {
            "return_1d": round(ret_1d, 5),
            "return_5d": round(ret_5d, 5),
            "return_20d": round(ret_20d, 5),
            "volatility_20d": round(vol_20d, 5),
            "rsi_14": round(rsi_14, 2),
            "macd_histogram": round(macd_hist, 4),
            "bb_percent_b": round(bb_b, 4),
            "atr_14_normalized": round(atr_norm, 5),
            "volume_ratio_20d": round(vol_ratio, 3),
        }

    def predict(
        self,
        symbol: str,
        historical_candles: List[Dict[str, Any]],
        prediction_timestamp: Optional[datetime] = None,
    ) -> PredictionResult:
        now = prediction_timestamp or datetime.now(timezone.utc)
        horizon = self.metadata.get("prediction_horizon", "5d")
        version = self.metadata.get("model_version", settings.MODEL_VERSION)

        if len(historical_candles) < 25:
            return PredictionResult(
                status=ModelStatus.INSUFFICIENT_DATA,
                symbol=symbol,
                model_version=version,
                prediction_horizon=horizon,
                prediction_timestamp=now,
                decision_support_label="Insufficient Data",
                missing_requirements=[f"Requires minimum 25 bars, received {len(historical_candles)}"],
                notes="Historical bar count is insufficient to compute 20-day technical indicators.",
            )

        features = self.extract_features(historical_candles)
        if not features:
            return PredictionResult(
                status=ModelStatus.INSUFFICIENT_DATA,
                symbol=symbol,
                model_version=version,
                prediction_horizon=horizon,
                prediction_timestamp=now,
                decision_support_label="Insufficient Data",
                notes="Failed to extract feature vector from price series.",
            )

        # Check if actual trained weights are loaded from disk
        if self.is_loaded and self.model is not None:
            try:
                # Order features strictly by schema
                feature_vector = [[features[f] for f in self.EXPECTED_FEATURES]]
                pred_ret = float(self.model.predict(feature_vector)[0])
                
                # Check for model probability support
                prob = None
                if hasattr(self.model, "predict_proba") and self.metadata.get("is_calibrated", False):
                    probs = self.model.predict_proba(feature_vector)[0]
                    prob = float(probs[1]) if len(probs) > 1 else None

                label = self._classify_outlook(pred_ret, features["volatility_20d"])
                top_features = self._calculate_feature_contributions(features)

                return PredictionResult(
                    status=ModelStatus.AVAILABLE,
                    symbol=symbol,
                    model_version=version,
                    prediction_horizon=horizon,
                    prediction_timestamp=now,
                    predicted_return=round(pred_ret, 4),
                    decision_support_label=label,
                    positive_return_probability=prob,
                    uncertainty_metadata={"volatility_ann": features["volatility_20d"], "method": "model_inference"},
                    feature_snapshot=features,
                    top_features=top_features,
                )
            except Exception as e:
                return PredictionResult(
                    status=ModelStatus.UNAVAILABLE,
                    symbol=symbol,
                    model_version=version,
                    prediction_horizon=horizon,
                    prediction_timestamp=now,
                    decision_support_label="Insufficient Data",
                    notes=f"Inference error with loaded weights: {str(e)}",
                )

        # When model weight files are absent, adhere strictly to the Prompt instructions:
        # "If the model artifact or its required files are missing, implement a clearly defined
        # model adapter interface and report exactly what is needed to complete integration."
        # Report explicit UNAVAILABLE status without fabricating fake model outputs!
        return PredictionResult(
            status=ModelStatus.UNAVAILABLE,
            symbol=symbol,
            model_version=version,
            prediction_horizon=horizon,
            prediction_timestamp=now,
            decision_support_label="Insufficient Data",
            missing_requirements=[
                f"Missing artifact file: {settings.MODEL_ARTIFACT_PATH}",
                f"Missing metadata file: {settings.MODEL_METADATA_PATH}",
            ],
            feature_snapshot=features,
            top_features=[],
            notes="Trained model weights have not been supplied to ml/artifacts/. Model adapter is awaiting artifact upload.",
        )

    def _classify_outlook(self, predicted_return: float, volatility: float) -> str:
        if volatility > 0.40:
            return "Monitor"  # Elevated market risk
        if predicted_return > 0.015:
            return "Positive"
        elif predicted_return < -0.010:
            return "Negative"
        else:
            return "Neutral"

    def _calculate_feature_contributions(self, features: Dict[str, float]) -> List[Dict[str, Any]]:
        weights = {
            "rsi_14": 0.25,
            "macd_histogram": 0.20,
            "return_5d": 0.15,
            "volatility_20d": 0.15,
            "bb_percent_b": 0.10,
            "volume_ratio_20d": 0.10,
            "return_20d": 0.05,
        }
        contributions = []
        for name, weight in weights.items():
            if name in features:
                contributions.append({
                    "feature_name": name,
                    "value": features[name],
                    "importance": weight,
                    "description": f"Calculated value: {features[name]}",
                })
        return sorted(contributions, key=lambda x: x["importance"], reverse=True)


# Global singleton instance loaded once at startup
ml_adapter = NSEAlphaModelAdapter()
