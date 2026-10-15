import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from apps.api.app.core.database import Base


class Fundamental(Base):
    __tablename__ = "fundamentals"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    stock_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("stocks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    fiscal_period: Mapped[str] = mapped_column(String(20), nullable=False)
    revenue: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    revenue_growth_yoy: Mapped[Optional[float]] = mapped_column(Numeric(8, 4), nullable=True)
    net_profit: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    eps: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    pe_ratio: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    pb_ratio: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    debt_to_equity: Mapped[Optional[float]] = mapped_column(Numeric(8, 4), nullable=True)
    roe: Mapped[Optional[float]] = mapped_column(Numeric(8, 4), nullable=True)
    roce: Mapped[Optional[float]] = mapped_column(Numeric(8, 4), nullable=True)
    operating_margin: Mapped[Optional[float]] = mapped_column(Numeric(8, 4), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    available_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped[str] = mapped_column(String(100), default="NSE filings", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    stock = relationship("Stock", back_populates="fundamentals")
