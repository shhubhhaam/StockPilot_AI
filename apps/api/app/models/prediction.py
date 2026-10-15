import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Numeric, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from apps.api.app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    stock_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("stocks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    prediction_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    prediction_horizon: Mapped[str] = mapped_column(String(20), default="5d", nullable=False)
    predicted_return: Mapped[Optional[float]] = mapped_column(Numeric(8, 5), nullable=True)
    predicted_class: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    positive_return_probability: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    uncertainty_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    feature_snapshot_reference: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    stock = relationship("Stock", back_populates="predictions")
    outcomes = relationship("PredictionOutcome", back_populates="prediction", cascade="all, delete-orphan")


class PredictionOutcome(Base):
    __tablename__ = "prediction_outcomes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    prediction_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("predictions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    evaluation_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_return: Mapped[float] = mapped_column(Numeric(8, 5), nullable=False)
    outcome_status: Mapped[str] = mapped_column(String(20), default="Evaluated", nullable=False)
    calculation_method: Mapped[str] = mapped_column(String(50), default="close_to_close", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    prediction = relationship("Prediction", back_populates="outcomes")
