from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class FeatureContribution(BaseModel):
    feature_name: str
    value: float
    importance: float
    description: Optional[str] = None


class PredictionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    stock_id: str
    symbol: str
    exchange: str
    company_name: str
    sector: str
    model_version: str
    prediction_timestamp: datetime
    prediction_horizon: str
    predicted_return: Optional[float] = None
    predicted_class: Optional[str] = None
    positive_return_probability: Optional[float] = None
    uncertainty_metadata: Optional[Dict[str, Any]] = None
    feature_snapshot_reference: Optional[Dict[str, Any]] = None
    top_features: List[FeatureContribution] = []
    decision_support_label: str
    model_status: str = "AVAILABLE"
    created_at: datetime


class ModelStatusResponse(BaseModel):
    status: str  # "AVAILABLE", "UNAVAILABLE", "UNINITIALIZED"
    model_name: str
    model_version: str
    framework: str
    prediction_horizon: str
    is_calibrated: bool
    features_required: List[str]
    missing_requirements: Optional[List[str]] = None
    notes: Optional[str] = None
