import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Numeric, BigInteger, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from apps.api.app.core.database import Base


class MarketData(Base):
    __tablename__ = "market_data"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    stock_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("stocks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    interval: Mapped[str] = mapped_column(String(10), default="1d", nullable=False)
    open: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    high: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    low: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    close: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    volume: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    adjustment_status: Mapped[str] = mapped_column(String(20), default="adjusted", nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="historical", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("stock_id", "interval", "timestamp", name="uq_stock_interval_timestamp"),
    )

    # Relationships
    stock = relationship("Stock", back_populates="market_data")
