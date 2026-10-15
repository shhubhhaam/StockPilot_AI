from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.models.stock import Stock
from apps.api.app.models.prediction import Prediction
from apps.api.app.ml.adapter import ml_adapter, ModelStatus
from apps.api.app.schemas.prediction import (
    PredictionResponse,
    ModelStatusResponse,
    FeatureContribution,
)
from apps.api.app.data_providers.nse_provider import NSEDataProvider, NSE_UNIVERSE

router = APIRouter(prefix="/predictions", tags=["Predictions"])
data_provider = NSEDataProvider()


@router.get("/status", response_model=ModelStatusResponse)
async def get_model_status():
    """Returns the operational status of the ML inference engine and missing dependencies."""
    meta = ml_adapter.metadata
    status_str = "AVAILABLE" if ml_adapter.is_loaded else "UNAVAILABLE"
    missing = meta.get("missing_files", [])
    
    return ModelStatusResponse(
        status=status_str,
        model_name=meta.get("model_name", "StockPilot-NSE-AlphaModel"),
        model_version=meta.get("model_version", "1.0.0"),
        framework=meta.get("framework", "scikit-learn / XGBoost"),
        prediction_horizon=meta.get("prediction_horizon", "5d"),
        is_calibrated=meta.get("is_calibrated", False),
        features_required=ml_adapter.EXPECTED_FEATURES,
        missing_requirements=missing if missing else None,
        notes="No model weights were discovered in ml/artifacts/. Model adapter is in safe standby mode."
        if not ml_adapter.is_loaded
        else "Model loaded and ready for inference.",
    )


@router.get("", response_model=List[PredictionResponse])
async def list_predictions(
    sector: Optional[str] = None,
    outlook: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns stock-level predictions with supporting feature attribution.
    Uses time-strict feature extraction.
    """
    # Query active stocks
    stmt = select(Stock)
    if sector:
        stmt = stmt.where(Stock.sector.ilike(f"%{sector}%"))
    result = await db.execute(stmt)
    stocks = result.scalars().all()

    # If DB not seeded yet, seed from universe
    if not stocks:
        stocks = []
        for sym, meta in NSE_UNIVERSE.items():
            s = Stock(
                symbol=sym,
                exchange="NSE",
                company_name=meta["company_name"],
                sector=meta["sector"],
                industry=meta["industry"],
                currency="INR",
                is_active=True,
            )
            db.add(s)
            stocks.append(s)
        await db.commit()
        for s in stocks:
            await db.refresh(s)

    predictions = []
    now = datetime.now(timezone.utc)

    for s in stocks[:limit]:
        candles = await data_provider.get_historical_candles(s.symbol, s.exchange, days=90)
        res = ml_adapter.predict(s.symbol, candles, prediction_timestamp=now)

        # Standardized decision support labels based on technical posture
        computed_label = res.decision_support_label
        features = res.feature_snapshot
        pred_return = res.predicted_return

        if outlook and computed_label.lower() != outlook.lower():
            continue

        feat_contributions = [
            FeatureContribution(
                feature_name=f["feature_name"],
                value=f["value"],
                importance=f["importance"],
                description=f.get("description"),
            )
            for f in res.top_features
        ]

        predictions.append(
            PredictionResponse(
                id=f"pred-{s.symbol.lower()}-{now.strftime('%Y%m%d')}",
                stock_id=s.id,
                symbol=s.symbol,
                exchange=s.exchange,
                company_name=s.company_name,
                sector=s.sector,
                model_version=res.model_version,
                prediction_timestamp=res.prediction_timestamp,
                prediction_horizon=res.prediction_horizon,
                predicted_return=pred_return,
                predicted_class=computed_label,
                positive_return_probability=res.positive_return_probability,
                uncertainty_metadata=res.uncertainty_metadata or {"model_state": res.status.value},
                feature_snapshot_reference=features,
                top_features=feat_contributions,
                decision_support_label=computed_label,
                model_status=res.status.value,
                created_at=res.prediction_timestamp,
            )
        )

    return predictions


@router.get("/stocks/{symbol}", response_model=PredictionResponse)
async def get_stock_prediction(symbol: str, db: AsyncSession = Depends(get_db)):
    sym = symbol.upper()
    stmt = select(Stock).where(Stock.symbol == sym)
    stock = (await db.execute(stmt)).scalar_one_or_none()
    
    if not stock:
        meta = NSE_UNIVERSE.get(sym)
        if not meta:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
        stock = Stock(
            symbol=sym,
            exchange="NSE",
            company_name=meta["company_name"],
            sector=meta["sector"],
            industry=meta["industry"],
            currency="INR",
            is_active=True,
        )
        db.add(stock)
        await db.commit()
        await db.refresh(stock)

    candles = await data_provider.get_historical_candles(stock.symbol, stock.exchange, days=90)
    now = datetime.now(timezone.utc)
    res = ml_adapter.predict(stock.symbol, candles, prediction_timestamp=now)

    feat_contributions = [
        FeatureContribution(
            feature_name=f["feature_name"],
            value=f["value"],
            importance=f["importance"],
            description=f.get("description"),
        )
        for f in res.top_features
    ]

    return PredictionResponse(
        id=f"pred-{stock.symbol.lower()}-{now.strftime('%Y%m%d')}",
        stock_id=stock.id,
        symbol=stock.symbol,
        exchange=stock.exchange,
        company_name=stock.company_name,
        sector=stock.sector,
        model_version=res.model_version,
        prediction_timestamp=res.prediction_timestamp,
        prediction_horizon=res.prediction_horizon,
        predicted_return=res.predicted_return,
        predicted_class=res.decision_support_label,
        positive_return_probability=res.positive_return_probability,
        uncertainty_metadata=res.uncertainty_metadata or {"model_state": res.status.value},
        feature_snapshot_reference=res.feature_snapshot,
        top_features=feat_contributions,
        decision_support_label=res.decision_support_label,
        model_status=res.status.value,
        created_at=res.prediction_timestamp,
    )
