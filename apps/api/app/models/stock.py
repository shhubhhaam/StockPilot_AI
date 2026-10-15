import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from apps.api.app.core.database import Base


class Stock(Base):
    __tablename__ = "stocks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    symbol: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    exchange: Mapped[str] = mapped_column(String(10), default="NSE", nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sector: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    industry: Mapped[str] = mapped_column(String(100), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("symbol", "exchange", name="uq_stock_symbol_exchange"),
    )

    # Relationships
    holdings = relationship("Holding", back_populates="stock")
    watchlist_items = relationship("WatchlistItem", back_populates="stock")
    market_data = relationship("MarketData", back_populates="stock", cascade="all, delete-orphan")
    fundamentals = relationship("Fundamental", back_populates="stock", cascade="all, delete-orphan")
    news_events = relationship("NewsEvent", back_populates="stock")
    predictions = relationship("Prediction", back_populates="stock", cascade="all, delete-orphan")
