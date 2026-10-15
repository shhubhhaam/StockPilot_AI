from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from apps.api.app.core.database import get_db
from apps.api.app.models.user import User
from apps.api.app.models.stock import Stock
from apps.api.app.models.holding import Holding
from apps.api.app.models.portfolio_snapshot import PortfolioSnapshot
from apps.api.app.auth.deps import get_current_user
from apps.api.app.schemas.portfolio import (
    HoldingCreate,
    HoldingUpdate,
    HoldingResponse,
    PortfolioSummaryResponse,
)
from apps.api.app.data_providers.nse_provider import NSEDataProvider, NSE_UNIVERSE
from apps.api.app.services.portfolio import calculate_portfolio_analytics

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])
data_provider = NSEDataProvider()


@router.get("", response_model=PortfolioSummaryResponse)
async def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Holding)
        .options(selectinload(Holding.stock))
        .where(Holding.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    holdings = result.scalars().all()

    # Collect current market prices and daily changes
    current_prices = {}
    daily_changes = {}
    for h in holdings:
        if h.stock:
            quote = await data_provider.get_current_price(h.stock.symbol, h.stock.exchange)
            if quote:
                current_prices[h.stock.symbol] = quote.get("current_price")
                daily_changes[h.stock.symbol] = quote.get("change_1d")

    summary = calculate_portfolio_analytics(holdings, current_prices, daily_changes)
    return summary


@router.get("/holdings", response_model=List[HoldingResponse])
async def list_holdings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Holding)
        .options(selectinload(Holding.stock))
        .where(Holding.user_id == current_user.id)
        .order_by(Holding.created_at.desc())
    )
    result = await db.execute(stmt)
    holdings = result.scalars().all()

    # Compute portfolio total market value for weighting
    current_prices = {}
    total_market_val = 0.0

    for h in holdings:
        if h.stock:
            quote = await data_provider.get_current_price(h.stock.symbol, h.stock.exchange)
            if quote:
                p = quote.get("current_price", float(h.average_purchase_price))
                current_prices[h.stock.symbol] = p
                total_market_val += float(h.quantity) * p
            else:
                current_prices[h.stock.symbol] = float(h.average_purchase_price)
                total_market_val += float(h.quantity) * float(h.average_purchase_price)

    responses = []
    for h in holdings:
        qty = float(h.quantity)
        avg_price = float(h.average_purchase_price)
        inv_val = qty * avg_price
        curr_p = current_prices.get(h.stock.symbol, avg_price)
        mkt_val = qty * curr_p
        pnl = mkt_val - inv_val
        ret_pct = (pnl / inv_val * 100) if inv_val > 0 else 0.0
        weight = (mkt_val / total_market_val * 100) if total_market_val > 0 else 0.0

        responses.append(
            HoldingResponse(
                id=h.id,
                stock_id=h.stock_id,
                symbol=h.stock.symbol,
                exchange=h.stock.exchange,
                company_name=h.stock.company_name,
                sector=h.stock.sector,
                quantity=qty,
                average_purchase_price=avg_price,
                invested_value=round(inv_val, 2),
                current_price=round(curr_p, 2),
                current_market_value=round(mkt_val, 2),
                unrealized_pnl=round(pnl, 2),
                return_percentage=round(ret_pct, 2),
                portfolio_weight=round(weight, 2),
                valuation_status="CURRENT",
                created_at=h.created_at,
                updated_at=h.updated_at,
            )
        )

    return responses


@router.post("/holdings", response_model=HoldingResponse, status_code=status.HTTP_201_CREATED)
async def add_holding(
    holding_in: HoldingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    symbol = holding_in.symbol.upper()
    # Resolve stock
    stmt = select(Stock).where(Stock.symbol == symbol)
    stock = (await db.execute(stmt)).scalar_one_or_none()

    if not stock:
        # Check if symbol is in initial universe
        meta = NSE_UNIVERSE.get(symbol)
        if meta:
            stock = Stock(
                symbol=symbol,
                exchange=holding_in.exchange,
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock symbol '{symbol}' is not recognized in the supported universe.",
            )

    # Check for duplicate holding for this user and stock
    existing_stmt = select(Holding).where(
        Holding.user_id == current_user.id,
        Holding.stock_id == stock.id,
    )
    existing_holding = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing_holding:
        # Update existing holding by recalculating weighted average purchase price
        old_qty = float(existing_holding.quantity)
        old_price = float(existing_holding.average_purchase_price)
        new_qty = old_qty + holding_in.quantity
        new_avg = ((old_qty * old_price) + (holding_in.quantity * holding_in.average_purchase_price)) / new_qty

        existing_holding.quantity = new_qty
        existing_holding.average_purchase_price = new_avg
        existing_holding.updated_at = datetime.now(timezone.utc)
        db.add(existing_holding)
        await db.commit()
        await db.refresh(existing_holding)
        holding = existing_holding
    else:
        new_holding = Holding(
            user_id=current_user.id,
            stock_id=stock.id,
            quantity=holding_in.quantity,
            average_purchase_price=holding_in.average_purchase_price,
        )
        db.add(new_holding)
        await db.commit()
        await db.refresh(new_holding)
        holding = new_holding

    quote = await data_provider.get_current_price(stock.symbol, stock.exchange)
    curr_price = quote.get("current_price", float(holding.average_purchase_price)) if quote else float(holding.average_purchase_price)
    qty = float(holding.quantity)
    inv_val = qty * float(holding.average_purchase_price)
    mkt_val = qty * curr_price
    pnl = mkt_val - inv_val
    ret_pct = (pnl / inv_val * 100) if inv_val > 0 else 0.0

    return HoldingResponse(
        id=holding.id,
        stock_id=stock.id,
        symbol=stock.symbol,
        exchange=stock.exchange,
        company_name=stock.company_name,
        sector=stock.sector,
        quantity=qty,
        average_purchase_price=float(holding.average_purchase_price),
        invested_value=round(inv_val, 2),
        current_price=round(curr_price, 2),
        current_market_value=round(mkt_val, 2),
        unrealized_pnl=round(pnl, 2),
        return_percentage=round(ret_pct, 2),
        portfolio_weight=100.0,
        valuation_status="CURRENT",
        created_at=holding.created_at,
        updated_at=holding.updated_at,
    )


@router.patch("/holdings/{holding_id}", response_model=HoldingResponse)
async def update_holding(
    holding_id: str,
    holding_in: HoldingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Holding)
        .options(selectinload(Holding.stock))
        .where(Holding.id == holding_id)
    )
    holding = (await db.execute(stmt)).scalar_one_or_none()

    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    # Enforce strict user isolation: User A cannot edit User B's holding
    if holding.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify this holding.",
        )

    if holding_in.quantity is not None:
        holding.quantity = holding_in.quantity
    if holding_in.average_purchase_price is not None:
        holding.average_purchase_price = holding_in.average_purchase_price

    holding.updated_at = datetime.now(timezone.utc)
    db.add(holding)
    await db.commit()
    await db.refresh(holding)

    quote = await data_provider.get_current_price(holding.stock.symbol, holding.stock.exchange)
    curr_price = quote.get("current_price", float(holding.average_purchase_price)) if quote else float(holding.average_purchase_price)
    qty = float(holding.quantity)
    inv_val = qty * float(holding.average_purchase_price)
    mkt_val = qty * curr_price
    pnl = mkt_val - inv_val
    ret_pct = (pnl / inv_val * 100) if inv_val > 0 else 0.0

    return HoldingResponse(
        id=holding.id,
        stock_id=holding.stock.id,
        symbol=holding.stock.symbol,
        exchange=holding.stock.exchange,
        company_name=holding.stock.company_name,
        sector=holding.stock.sector,
        quantity=qty,
        average_purchase_price=float(holding.average_purchase_price),
        invested_value=round(inv_val, 2),
        current_price=round(curr_price, 2),
        current_market_value=round(mkt_val, 2),
        unrealized_pnl=round(pnl, 2),
        return_percentage=round(ret_pct, 2),
        portfolio_weight=100.0,
        valuation_status="CURRENT",
        created_at=holding.created_at,
        updated_at=holding.updated_at,
    )


@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(
    holding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Holding).where(Holding.id == holding_id)
    holding = (await db.execute(stmt)).scalar_one_or_none()

    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    # Enforce strict user isolation: User A cannot delete User B's holding
    if holding.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this holding.",
        )

    await db.delete(holding)
    await db.commit()
    return None
