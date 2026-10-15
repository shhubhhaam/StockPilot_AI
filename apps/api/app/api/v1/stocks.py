from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.models.stock import Stock
from apps.api.app.models.holding import Holding
from apps.api.app.models.watchlist import Watchlist, WatchlistItem
from apps.api.app.models.user import User
from apps.api.app.auth.deps import get_optional_current_user
from apps.api.app.schemas.stock import (
    StockResponse,
    CandleResponse,
    TechnicalIndicatorResponse,
    FundamentalResponse,
)
from apps.api.app.schemas.news import NewsEventResponse
from apps.api.app.data_providers.nse_provider import NSEDataProvider, NSE_UNIVERSE
from apps.api.app.services.indicators import (
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_atr,
    calculate_rolling_volatility,
    calculate_sma,
    calculate_ema,
    detect_candlestick_patterns,
)

router = APIRouter(prefix="/stocks", tags=["Stocks"])
data_provider = NSEDataProvider()


@router.get("", response_model=List[StockResponse])
async def list_stocks(
    sector: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    # Fetch user's holdings and watchlist for personalized tags
    user_holding_stock_ids = set()
    user_watchlist_stock_ids = set()

    if current_user:
        h_stmt = select(Holding.stock_id).where(Holding.user_id == current_user.id)
        user_holding_stock_ids = set((await db.execute(h_stmt)).scalars().all())

        w_stmt = (
            select(WatchlistItem.stock_id)
            .join(Watchlist, Watchlist.id == WatchlistItem.watchlist_id)
            .where(Watchlist.user_id == current_user.id)
        )
        user_watchlist_stock_ids = set((await db.execute(w_stmt)).scalars().all())

    # Ensure stocks are seeded in database from NSE_UNIVERSE
    stmt = select(Stock)
    if sector:
        stmt = stmt.where(Stock.sector.ilike(f"%{sector}%"))
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where((Stock.symbol.ilike(search_filter)) | (Stock.company_name.ilike(search_filter)))

    result = await db.execute(stmt)
    db_stocks = result.scalars().all()

    # If DB is empty, sync from universe
    if not db_stocks and not search and not sector:
        db_stocks = []
        for sym, meta in NSE_UNIVERSE.items():
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
            db_stocks.append(stock)
        await db.commit()
        for s in db_stocks:
            await db.refresh(s)

    responses = []
    for s in db_stocks:
        price_info = await data_provider.get_current_price(s.symbol, s.exchange)
        # Determine outlook tag
        outlook = "Neutral"
        if price_info and price_info.get("change_percent_1d", 0) > 1.0:
            outlook = "Positive"
        elif price_info and price_info.get("change_percent_1d", 0) < -1.0:
            outlook = "Negative"

        responses.append(
            StockResponse(
                id=s.id,
                symbol=s.symbol,
                exchange=s.exchange,
                company_name=s.company_name,
                sector=s.sector,
                industry=s.industry,
                currency=s.currency,
                is_active=s.is_active,
                current_price=price_info.get("current_price") if price_info else None,
                change_1d=price_info.get("change_1d") if price_info else None,
                change_percent_1d=price_info.get("change_percent_1d") if price_info else None,
                high_52w=price_info.get("high_52w") if price_info else None,
                low_52w=price_info.get("low_52w") if price_info else None,
                volume=price_info.get("volume") if price_info else None,
                ai_outlook=outlook,
                is_owned=s.id in user_holding_stock_ids,
                is_in_watchlist=s.id in user_watchlist_stock_ids,
            )
        )

    return responses


@router.get("/{symbol}", response_model=StockResponse)
async def get_stock(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    stmt = select(Stock).where(Stock.symbol == symbol.upper())
    stock = (await db.execute(stmt)).scalar_one_or_none()
    
    if not stock:
        # Check universe
        meta = NSE_UNIVERSE.get(symbol.upper())
        if meta:
            stock = Stock(
                symbol=symbol.upper(),
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
        else:
            raise HTTPException(status_code=404, detail=f"Stock symbol {symbol} not found")

    price_info = await data_provider.get_current_price(stock.symbol, stock.exchange)
    is_owned = False
    is_in_watchlist = False

    if current_user:
        h_stmt = select(Holding).where(Holding.user_id == current_user.id, Holding.stock_id == stock.id)
        is_owned = (await db.execute(h_stmt)).scalar_one_or_none() is not None

        w_stmt = (
            select(WatchlistItem)
            .join(Watchlist, Watchlist.id == WatchlistItem.watchlist_id)
            .where(Watchlist.user_id == current_user.id, WatchlistItem.stock_id == stock.id)
        )
        is_in_watchlist = (await db.execute(w_stmt)).scalar_one_or_none() is not None

    outlook = "Neutral"
    if price_info and price_info.get("change_percent_1d", 0) > 1.0:
        outlook = "Positive"
    elif price_info and price_info.get("change_percent_1d", 0) < -1.0:
        outlook = "Negative"

    return StockResponse(
        id=stock.id,
        symbol=stock.symbol,
        exchange=stock.exchange,
        company_name=stock.company_name,
        sector=stock.sector,
        industry=stock.industry,
        currency=stock.currency,
        is_active=stock.is_active,
        current_price=price_info.get("current_price") if price_info else None,
        change_1d=price_info.get("change_1d") if price_info else None,
        change_percent_1d=price_info.get("change_percent_1d") if price_info else None,
        high_52w=price_info.get("high_52w") if price_info else None,
        low_52w=price_info.get("low_52w") if price_info else None,
        volume=price_info.get("volume") if price_info else None,
        ai_outlook=outlook,
        is_owned=is_owned,
        is_in_watchlist=is_in_watchlist,
    )


@router.get("/{symbol}/candles", response_model=List[CandleResponse])
async def get_stock_candles(
    symbol: str,
    days: int = Query(180, ge=7, le=730),
    interval: str = "1d",
):
    candles = await data_provider.get_historical_candles(symbol.upper(), interval=interval, days=days)
    if not candles:
        raise HTTPException(status_code=404, detail=f"No candle data available for {symbol}")
    return candles


@router.get("/{symbol}/indicators", response_model=TechnicalIndicatorResponse)
async def get_stock_indicators(symbol: str):
    candles = await data_provider.get_historical_candles(symbol.upper(), days=100)
    if not candles or len(candles) < 25:
        raise HTTPException(status_code=400, detail="Insufficient candle data to calculate indicators")

    closes = [c["close"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    opens = [c["open"] for c in candles]

    rsi = calculate_rsi(closes, period=14)[-1]
    macd_res = calculate_macd(closes)
    bb_res = calculate_bollinger_bands(closes, period=20)
    atr = calculate_atr(highs, lows, closes, period=14)[-1]
    vol = calculate_rolling_volatility(closes, window=20)[-1]
    sma_20 = calculate_sma(closes, period=20)[-1]
    sma_50 = calculate_sma(closes, period=50)[-1]
    ema_20 = calculate_ema(closes, period=20)[-1]
    patterns = detect_candlestick_patterns(opens, highs, lows, closes)

    return TechnicalIndicatorResponse(
        symbol=symbol.upper(),
        timestamp=candles[-1]["timestamp"],
        rsi_14=rsi,
        macd=macd_res["macd"][-1],
        macd_signal=macd_res["signal"][-1],
        macd_histogram=macd_res["histogram"][-1],
        bb_upper=bb_res["upper"][-1],
        bb_middle=bb_res["middle"][-1],
        bb_lower=bb_res["lower"][-1],
        sma_20=sma_20,
        sma_50=sma_50,
        ema_20=ema_20,
        atr_14=round(atr, 2) if atr else None,
        volatility_20d=vol,
        detected_patterns=patterns,
    )


@router.get("/{symbol}/fundamentals", response_model=FundamentalResponse)
async def get_stock_fundamentals(symbol: str, db: AsyncSession = Depends(get_db)):
    fund = await data_provider.get_fundamentals(symbol.upper())
    if not fund:
        raise HTTPException(status_code=404, detail=f"No fundamental records for {symbol}")

    stmt = select(Stock).where(Stock.symbol == symbol.upper())
    stock = (await db.execute(stmt)).scalar_one_or_none()
    stock_id = stock.id if stock else "temp-stock-id"

    return FundamentalResponse(
        id=f"fund-{symbol.lower()}",
        stock_id=stock_id,
        **fund,
    )


@router.get("/{symbol}/news", response_model=List[NewsEventResponse])
async def get_stock_news(symbol: str, limit: int = 10):
    items = await data_provider.get_news(symbol=symbol.upper(), limit=limit)
    responses = []
    for idx, item in enumerate(items):
        score = item.get("sentiment_score")
        label = "Neutral"
        if score is not None:
            if score > 0.3:
                label = "Positive"
            elif score < -0.3:
                label = "Negative"

        responses.append(
            NewsEventResponse(
                id=f"news-{symbol.lower()}-{idx}",
                symbol=item.get("symbol"),
                company_name=NSE_UNIVERSE.get(item.get("symbol", ""), {}).get("company_name", item.get("symbol")),
                title=item["title"],
                summary=item["summary"],
                source=item["source"],
                source_url=item.get("source_url"),
                published_at=item["published_at"],
                event_type=item["event_type"],
                sentiment_score=score,
                sentiment_label=label,
                relevance_score=item.get("relevance_score"),
                created_at=item["published_at"],
            )
        )
    return responses
