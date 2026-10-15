import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from apps.api.app.core.database import Base


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    stock_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("stocks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    quantity: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    average_purchase_price: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
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
        UniqueConstraint("user_id", "stock_id", name="uq_user_stock_holding"),
    )

    # Relationships
    user = relationship("User", back_populates="holdings")
    stock = relationship("Stock", back_populates="holdings")
