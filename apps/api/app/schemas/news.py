from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NewsEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    stock_id: Optional[str] = None
    symbol: Optional[str] = None
    company_name: Optional[str] = None
    title: str
    summary: str
    source: str
    source_url: Optional[str] = None
    published_at: datetime
    event_type: str
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None  # Positive, Neutral, Negative
    relevance_score: Optional[float] = None
    created_at: datetime
