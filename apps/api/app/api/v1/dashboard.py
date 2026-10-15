from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from apps.api.app.core.database import get_db
from apps.api.app.models.user import User
from apps.api.app.models.holding import Holding
from apps.api.app.auth.deps import get_current_user
from apps.api.app.schemas.dashboard import DashboardOverviewResponse
from apps.api.app.schemas.portfolio import HoldingResponse
from apps.api.app.schemas.prediction import PredictionResponse, FeatureContribution
from apps.api.app.schemas.news import NewsEventResponse
from apps.api.app.schemas.regulatory import RegulatoryEventResponse
from apps.api.app.data_providers.nse_provider import NSEDataProvider, NSE_UNIVERSE
from apps.api.app.services.portfolio import calculate_portfolio_analytics
from apps.api.app.ml.adapter import ml_adapter

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
data_provider = NSEDataProvider()


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Fetch User Holdings
    stmt = (
        select(Holding)
        .options(selectinload(Holding.stock))
        .where(Holding.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    holdings = result.scalars().all()

    # 2. Market quotes
    current_prices = {}
    daily_changes = {}
    for h in holdings:
        if h.stock:
            quote = await data_provider.get_current_price(h.stock.symbol, h.stock.exchange)
            if quote:
                current_prices[h.stock.symbol] = quote.get("current_price")
                daily_changes[h.stock.symbol] = quote.get("change_1d")

    portfolio_summary = calculate_portfolio_analytics(holdings, current_prices, daily_changes)

    # 3. Holding item responses
    total_mkt = portfolio_summary.total_market_value
    holding_responses = []
    for h in holdings:
        qty = float(h.quantity)
        avg_price = float(h.average_purchase_price)
        inv = qty * avg_price
        curr_p = current_prices.get(h.stock.symbol, avg_price)
        mkt = qty * curr_p
        pnl = mkt - inv
        ret_pct = (pnl / inv * 100) if inv > 0 else 0.0
        weight = (mkt / total_mkt * 100) if total_mkt > 0 else 0.0

        holding_responses.append(
            HoldingResponse(
                id=h.id,
                stock_id=h.stock_id,
                symbol=h.stock.symbol,
                exchange=h.stock.exchange,
                company_name=h.stock.company_name,
                sector=h.stock.sector,
                quantity=qty,
                average_purchase_price=avg_price,
                invested_value=round(inv, 2),
                current_price=round(curr_p, 2),
                current_market_value=round(mkt, 2),
                unrealized_pnl=round(pnl, 2),
                return_percentage=round(ret_pct, 2),
                portfolio_weight=round(weight, 2),
                valuation_status="CURRENT",
                created_at=h.created_at,
                updated_at=h.updated_at,
            )
        )

    # 4. Top Predictions for Key Equities
    now = datetime.now(timezone.utc)
    top_predictions = []
    featured_symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "TATAMOTORS"]
    for sym in featured_symbols:
        candles = await data_provider.get_historical_candles(sym, days=60)
        res = ml_adapter.predict(sym, candles, prediction_timestamp=now)
        meta = NSE_UNIVERSE.get(sym, {})

        top_predictions.append(
            PredictionResponse(
                id=f"pred-{sym.lower()}",
                stock_id=f"stock-{sym.lower()}",
                symbol=sym,
                exchange="NSE",
                company_name=meta.get("company_name", sym),
                sector=meta.get("sector", "General"),
                model_version=res.model_version,
                prediction_timestamp=res.prediction_timestamp,
                prediction_horizon=res.prediction_horizon,
                predicted_return=res.predicted_return,
                predicted_class=res.decision_support_label,
                positive_return_probability=res.positive_return_probability,
                uncertainty_metadata=res.uncertainty_metadata or {"model_state": res.status.value},
                feature_snapshot_reference=res.feature_snapshot,
                top_features=[
                    FeatureContribution(
                        feature_name=f["feature_name"],
                        value=f["value"],
                        importance=f["importance"],
                        description=f.get("description"),
                    )
                    for f in res.top_features[:3]
                ],
                decision_support_label=res.decision_support_label,
                model_status=res.status.value,
                created_at=res.prediction_timestamp,
            )
        )

    # 5. News & Regulatory
    raw_news = await data_provider.get_news(limit=5)
    recent_news = [
        NewsEventResponse(
            id=f"dash-news-{i}",
            symbol=n.get("symbol"),
            company_name=NSE_UNIVERSE.get(n.get("symbol", ""), {}).get("company_name", n.get("symbol")),
            title=n["title"],
            summary=n["summary"],
            source=n["source"],
            source_url=n.get("source_url"),
            published_at=n["published_at"],
            event_type=n["event_type"],
            sentiment_score=n.get("sentiment_score"),
            sentiment_label="Positive" if (n.get("sentiment_score") or 0) > 0.3 else "Neutral",
            relevance_score=n.get("relevance_score"),
            created_at=n["published_at"],
        )
        for i, n in enumerate(raw_news)
    ]

    raw_reg = await data_provider.get_regulatory_events(limit=3)
    regulatory_alerts = [
        RegulatoryEventResponse(
            id=f"dash-reg-{i}",
            authority=r["authority"],
            document_title=r["document_title"],
            document_url=r.get("document_url"),
            published_at=r["published_at"],
            summary=r["summary"],
            event_type=r["event_type"],
            affected_sector=r.get("affected_sector"),
            impact_level=r["impact_level"],
            created_at=r["published_at"],
        )
        for i, r in enumerate(raw_reg)
    ]

    return DashboardOverviewResponse(
        portfolio=portfolio_summary,
        holdings=holding_responses,
        top_predictions=top_predictions,
        recent_news=recent_news,
        regulatory_alerts=regulatory_alerts,
        market_status="OPEN" if (9 <= now.hour <= 15 and now.weekday() < 5) else "CLOSED",
        is_demo_data=False,
    )
