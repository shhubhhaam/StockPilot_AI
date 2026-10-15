from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class StockBase(BaseModel):
    symbol: str
    exchange: str = "NSE"
    company_name: str
    sector: str
    industry: Optional[str] = None
    currency: str = "INR"


class StockResponse(StockBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
    current_price: Optional[float] = None
    change_1d: Optional[float] = None
    change_percent_1d: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    volume: Optional[int] = None
    ai_outlook: Optional[str] = None
    is_owned: Optional[bool] = False
    is_in_watchlist: Optional[bool] = False


class CandleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class TechnicalIndicatorResponse(BaseModel):
    symbol: str
    timestamp: datetime
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    ema_20: Optional[float] = None
    atr_14: Optional[float] = None
    volatility_20d: Optional[float] = None
    detected_patterns: List[str] = []


class FundamentalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    stock_id: str
    fiscal_period: str
    revenue: Optional[float] = None
    revenue_growth_yoy: Optional[float] = None
    net_profit: Optional[float] = None
    eps: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    debt_to_equity: Optional[float] = None
    roe: Optional[float] = None
    roce: Optional[float] = None
    operating_margin: Optional[float] = None
    currency: str = "INR"
    published_at: Optional[datetime] = None
    available_at: Optional[datetime] = None
    source: str
