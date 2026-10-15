from typing import List, Optional
from pydantic import BaseModel
from apps.api.app.schemas.portfolio import PortfolioSummaryResponse, HoldingResponse
from apps.api.app.schemas.prediction import PredictionResponse
from apps.api.app.schemas.news import NewsEventResponse
from apps.api.app.schemas.regulatory import RegulatoryEventResponse


class DashboardOverviewResponse(BaseModel):
    portfolio: PortfolioSummaryResponse
    holdings: List[HoldingResponse] = []
    top_predictions: List[PredictionResponse] = []
    recent_news: List[NewsEventResponse] = []
    regulatory_alerts: List[RegulatoryEventResponse] = []
    market_status: str = "OPEN"
    is_demo_data: bool = False
