from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from apps.api.app.core.database import get_db
from apps.api.app.models.user import User
from apps.api.app.models.stock import Stock
from apps.api.app.models.watchlist import Watchlist, WatchlistItem
from apps.api.app.auth.deps import get_current_user
from apps.api.app.schemas.watchlist import (
    WatchlistCreate,
    WatchlistResponse,
    WatchlistItemAdd,
    WatchlistItemResponse,
)
from apps.api.app.schemas.stock import StockResponse
from apps.api.app.data_providers.nse_provider import NSEDataProvider, NSE_UNIVERSE

router = APIRouter(prefix="/watchlists", tags=["Watchlists"])
data_provider = NSEDataProvider()


@router.get("", response_model=List[WatchlistResponse])
async def list_watchlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Watchlist)
        .options(
            selectinload(Watchlist.items).selectinload(WatchlistItem.stock)
        )
        .where(Watchlist.user_id == current_user.id)
        .order_by(Watchlist.created_at.asc())
    )
    result = await db.execute(stmt)
    watchlists = result.scalars().all()

    # If user has no watchlist yet, automatically initialize a default watchlist
    if not watchlists:
        default_wl = Watchlist(user_id=current_user.id, name="My Watchlist")
        db.add(default_wl)
        await db.commit()
        await db.refresh(default_wl)

        # Seed 2 popular stocks into default watchlist
        for sym in ["RELIANCE", "TCS"]:
            s_stmt = select(Stock).where(Stock.symbol == sym)
            stock = (await db.execute(s_stmt)).scalar_one_or_none()
            if not stock:
                meta = NSE_UNIVERSE.get(sym)
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

            item = WatchlistItem(watchlist_id=default_wl.id, stock_id=stock.id)
            db.add(item)
        await db.commit()

        # Re-query
        result = await db.execute(stmt)
        watchlists = result.scalars().all()

    responses = []
    for wl in watchlists:
        item_responses = []
        for it in wl.items:
            s = it.stock
            price_info = await data_provider.get_current_price(s.symbol, s.exchange)
            outlook = "Neutral"
            if price_info and price_info.get("change_percent_1d", 0) > 1.0:
                outlook = "Positive"
            elif price_info and price_info.get("change_percent_1d", 0) < -1.0:
                outlook = "Negative"

            stock_resp = StockResponse(
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
                is_owned=False,
                is_in_watchlist=True,
            )
            item_responses.append(
                WatchlistItemResponse(
                    id=it.id,
                    watchlist_id=wl.id,
                    stock_id=s.id,
                    stock=stock_resp,
                    created_at=it.created_at,
                )
            )

        responses.append(
            WatchlistResponse(
                id=wl.id,
                user_id=wl.user_id,
                name=wl.name,
                created_at=wl.created_at,
                items=item_responses,
            )
        )

    return responses


@router.post("", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
async def create_watchlist(
    wl_in: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wl = Watchlist(user_id=current_user.id, name=wl_in.name)
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return WatchlistResponse(
        id=wl.id,
        user_id=wl.user_id,
        name=wl.name,
        created_at=wl.created_at,
        items=[],
    )


@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist(
    watchlist_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Watchlist).where(Watchlist.id == watchlist_id)
    wl = (await db.execute(stmt)).scalar_one_or_none()

    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    if wl.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this watchlist.",
        )

    await db.delete(wl)
    await db.commit()
    return None


@router.post("/{watchlist_id}/items", response_model=WatchlistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item_to_watchlist(
    watchlist_id: str,
    item_in: WatchlistItemAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify watchlist ownership
    wl_stmt = select(Watchlist).where(Watchlist.id == watchlist_id)
    wl = (await db.execute(wl_stmt)).scalar_one_or_none()

    if not wl or wl.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found or unauthorized.",
        )

    # Resolve stock
    symbol = item_in.symbol.upper()
    s_stmt = select(Stock).where(Stock.symbol == symbol)
    stock = (await db.execute(s_stmt)).scalar_one_or_none()

    if not stock:
        meta = NSE_UNIVERSE.get(symbol)
        if meta:
            stock = Stock(
                symbol=symbol,
                exchange=item_in.exchange,
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
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    # Check if already in watchlist
    dup_stmt = select(WatchlistItem).where(
        WatchlistItem.watchlist_id == watchlist_id,
        WatchlistItem.stock_id == stock.id,
    )
    dup = (await db.execute(dup_stmt)).scalar_one_or_none()
    if dup:
        raise HTTPException(status_code=400, detail="Stock is already in this watchlist.")

    item = WatchlistItem(watchlist_id=watchlist_id, stock_id=stock.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)

    price_info = await data_provider.get_current_price(stock.symbol, stock.exchange)
    stock_resp = StockResponse(
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
        ai_outlook="Neutral",
        is_owned=False,
        is_in_watchlist=True,
    )

    return WatchlistItemResponse(
        id=item.id,
        watchlist_id=watchlist_id,
        stock_id=stock.id,
        stock=stock_resp,
        created_at=item.created_at,
    )


@router.delete("/{watchlist_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item_from_watchlist(
    watchlist_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wl_stmt = select(Watchlist).where(Watchlist.id == watchlist_id)
    wl = (await db.execute(wl_stmt)).scalar_one_or_none()

    if not wl or wl.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized to modify this watchlist.",
        )

    it_stmt = select(WatchlistItem).where(
        WatchlistItem.id == item_id,
        WatchlistItem.watchlist_id == watchlist_id,
    )
    item = (await db.execute(it_stmt)).scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    await db.delete(item)
    await db.commit()
    return None
