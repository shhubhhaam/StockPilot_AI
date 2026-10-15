from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from apps.api.app.schemas.stock import StockResponse


class WatchlistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class WatchlistItemAdd(BaseModel):
    symbol: str
    exchange: str = "NSE"


class WatchlistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    watchlist_id: str
    stock_id: str
    stock: StockResponse
    created_at: datetime


class WatchlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    created_at: datetime
    items: List[WatchlistItemResponse] = []
