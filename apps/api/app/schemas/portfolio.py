from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict


class HoldingCreate(BaseModel):
    symbol: str
    exchange: str = "NSE"
    quantity: float = Field(..., gt=0, description="Quantity must be greater than zero")
    average_purchase_price: float = Field(..., gt=0, description="Average purchase price must be positive")


class HoldingUpdate(BaseModel):
    quantity: Optional[float] = Field(None, gt=0)
    average_purchase_price: Optional[float] = Field(None, gt=0)


class HoldingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    stock_id: str
    symbol: str
    exchange: str
    company_name: str
    sector: str
    quantity: float
    average_purchase_price: float
    invested_value: float
    current_price: Optional[float] = None
    current_market_value: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    return_percentage: Optional[float] = None
    portfolio_weight: Optional[float] = None
    valuation_status: str = "CURRENT"
    created_at: datetime
    updated_at: datetime


class SectorAllocation(BaseModel):
    sector: str
    value: float
    percentage: float
    holding_count: int


class StockAllocation(BaseModel):
    symbol: str
    company_name: str
    value: float
    percentage: float


class PortfolioSummaryResponse(BaseModel):
    total_invested_value: float
    total_market_value: float
    unrealized_pnl: float
    total_return_percentage: float
    daily_pnl: Optional[float] = None
    daily_return_percentage: Optional[float] = None
    holdings_count: int
    valuation_status: str
    currency: str = "INR"
    sector_allocations: List[SectorAllocation] = []
    top_holdings: List[StockAllocation] = []
    concentration_alert: Optional[str] = None
