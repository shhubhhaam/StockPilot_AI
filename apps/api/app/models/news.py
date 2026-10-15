import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from apps.api.app.core.database import Base


class NewsEvent(Base):
    __tablename__ = "news_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    stock_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("stocks.id", ondelete="SET NULL"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), default="Corporate Announcement", nullable=False)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    relevance_score: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    stock = relationship("Stock", back_populates="news_events")
