from typing import List, Dict, Any, Optional
from apps.api.app.models.holding import Holding
from apps.api.app.models.stock import Stock
from apps.api.app.schemas.portfolio import (
    HoldingResponse,
    PortfolioSummaryResponse,
    SectorAllocation,
    StockAllocation,
)


def calculate_portfolio_analytics(
    holdings: List[Holding],
    current_prices: Dict[str, Optional[float]],
    daily_changes: Optional[Dict[str, Optional[float]]] = None,
) -> PortfolioSummaryResponse:
    if not holdings:
        return PortfolioSummaryResponse(
            total_invested_value=0.0,
            total_market_value=0.0,
            unrealized_pnl=0.0,
            total_return_percentage=0.0,
            daily_pnl=0.0,
            daily_return_percentage=0.0,
            holdings_count=0,
            valuation_status="EMPTY",
            sector_allocations=[],
            top_holdings=[],
            concentration_alert=None,
        )

    total_invested = 0.0
    total_market = 0.0
    total_daily_pnl = 0.0
    has_missing_prices = False
    
    holding_values = []
    sector_sums: Dict[str, float] = {}
    sector_counts: Dict[str, int] = {}

    for h in holdings:
        qty = float(h.quantity)
        avg_price = float(h.average_purchase_price)
        inv_val = qty * avg_price
        total_invested += inv_val

        symbol = h.stock.symbol if h.stock else "UNKNOWN"
        sector = h.stock.sector if (h.stock and h.stock.sector) else "General"
        curr_price = current_prices.get(symbol)

        if curr_price is not None and curr_price > 0:
            mkt_val = qty * curr_price
            total_market += mkt_val

            if daily_changes and symbol in daily_changes and daily_changes[symbol] is not None:
                day_change = daily_changes[symbol]
                total_daily_pnl += qty * day_change
        else:
            has_missing_prices = True
            mkt_val = inv_val  # Fallback to invested value for partial valuation display
            total_market += inv_val

        holding_values.append({
            "symbol": symbol,
            "company_name": h.stock.company_name if h.stock else symbol,
            "sector": sector,
            "market_value": mkt_val,
        })

        sector_sums[sector] = sector_sums.get(sector, 0.0) + mkt_val
        sector_counts[sector] = sector_counts.get(sector, 0) + 1

    unrealized_pnl = total_market - total_invested
    total_return_pct = (unrealized_pnl / total_invested * 100) if total_invested > 0 else 0.0
    daily_return_pct = (total_daily_pnl / total_market * 100) if total_market > 0 else 0.0

    # Sector breakdown
    sector_allocations: List[SectorAllocation] = []
    concentration_alert = None

    for sec, val in sorted(sector_sums.items(), key=lambda x: x[1], reverse=True):
        pct = (val / total_market * 100) if total_market > 0 else 0.0
        sector_allocations.append(
            SectorAllocation(
                sector=sec,
                value=round(val, 2),
                percentage=round(pct, 2),
                holding_count=sector_counts[sec],
            )
        )
        if pct > 40.0 and concentration_alert is None:
            concentration_alert = f"High sector concentration: {sec} accounts for {pct:.1f}% of portfolio."

    # Top holdings
    top_holdings: List[StockAllocation] = []
    for item in sorted(holding_values, key=lambda x: x["market_value"], reverse=True):
        pct = (item["market_value"] / total_market * 100) if total_market > 0 else 0.0
        top_holdings.append(
            StockAllocation(
                symbol=item["symbol"],
                company_name=item["company_name"],
                value=round(item["market_value"], 2),
                percentage=round(pct, 2),
            )
        )
        if pct > 25.0 and concentration_alert is None:
            concentration_alert = f"High stock concentration: {item['symbol']} accounts for {pct:.1f}% of portfolio."

    valuation_status = "PARTIAL_STALE" if has_missing_prices else "CURRENT"

    return PortfolioSummaryResponse(
        total_invested_value=round(total_invested, 2),
        total_market_value=round(total_market, 2),
        unrealized_pnl=round(unrealized_pnl, 2),
        total_return_percentage=round(total_return_pct, 2),
        daily_pnl=round(total_daily_pnl, 2) if daily_changes else None,
        daily_return_percentage=round(daily_return_pct, 2) if daily_changes else None,
        holdings_count=len(holdings),
        valuation_status=valuation_status,
        sector_allocations=sector_allocations,
        top_holdings=top_holdings[:5],
        concentration_alert=concentration_alert,
    )
