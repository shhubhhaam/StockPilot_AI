import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from apps.api.app.core.database import Base


class RegulatoryEvent(Base):
    __tablename__ = "regulatory_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    authority: Mapped[str] = mapped_column(String(50), default="SEBI", nullable=False)
    document_title: Mapped[str] = mapped_column(String(255), nullable=False)
    document_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), default="Circular", nullable=False)
    affected_sector: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    impact_level: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
