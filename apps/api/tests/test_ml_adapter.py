import pytest
from apps.api.app.ml.adapter import NSEAlphaModelAdapter, ModelStatus


def test_ml_adapter_missing_artifacts_safely_reported():
    adapter = NSEAlphaModelAdapter()
    # Artifacts do not exist in newly initialized repo
    assert adapter.is_loaded is False
    assert len(adapter.metadata.get("missing_files", [])) > 0

    # Minimum candles check
    res = adapter.predict("RELIANCE", [])
    assert res.status == ModelStatus.INSUFFICIENT_DATA
    assert res.decision_support_label == "Insufficient Data"


def test_ml_adapter_feature_extraction():
    adapter = NSEAlphaModelAdapter()
    # Provide 30 synthetic candles
    candles = []
    base = 100.0
    for i in range(30):
        candles.append({
            "open": base + i,
            "high": base + i + 2,
            "low": base + i - 1,
            "close": base + i + 1,
            "volume": 1000000,
        })
    features = adapter.extract_features(candles)
    assert features is not None
    for req in adapter.EXPECTED_FEATURES:
        assert req in features

    # When artifact is missing, status should be UNAVAILABLE, never fake prediction
    res = adapter.predict("RELIANCE", candles)
    assert res.status == ModelStatus.UNAVAILABLE
    assert len(res.missing_requirements) > 0
