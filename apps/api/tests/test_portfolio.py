import pytest
from apps.api.app.models.holding import Holding
from apps.api.app.models.stock import Stock
from apps.api.app.services.portfolio import calculate_portfolio_analytics


def test_empty_portfolio():
    summary = calculate_portfolio_analytics([], {})
    assert summary.total_invested_value == 0.0
    assert summary.total_market_value == 0.0
    assert summary.unrealized_pnl == 0.0
    assert summary.holdings_count == 0
    assert summary.valuation_status == "EMPTY"


def test_portfolio_valuation_and_pnl():
    stock1 = Stock(symbol="RELIANCE", company_name="Reliance Industries", sector="Energy")
    stock2 = Stock(symbol="TCS", company_name="TCS Ltd", sector="Technology")

    # Holding 1: 10 shares bought at 2500 = 25000
    h1 = Holding(id="h1", user_id="u1", stock_id="s1", quantity=10.0, average_purchase_price=2500.0)
    h1.stock = stock1

    # Holding 2: 5 shares bought at 3000 = 15000
    h2 = Holding(id="h2", user_id="u1", stock_id="s2", quantity=5.0, average_purchase_price=3000.0)
    h2.stock = stock2

    # Current prices: RELIANCE at 2800 (+300/sh), TCS at 3200 (+200/sh)
    # Market value = (10*2800) + (5*3200) = 28000 + 16000 = 44000
    # Invested = 25000 + 15000 = 40000
    # PnL = 4000 (+10.0%)
    prices = {"RELIANCE": 2800.0, "TCS": 3200.0}
    daily_changes = {"RELIANCE": 50.0, "TCS": -20.0}

    summary = calculate_portfolio_analytics([h1, h2], prices, daily_changes)
    assert summary.total_invested_value == 40000.0
    assert summary.total_market_value == 44000.0
    assert summary.unrealized_pnl == 4000.0
    assert summary.total_return_percentage == 10.0
    assert summary.holdings_count == 2
    assert summary.valuation_status == "CURRENT"

    # Daily PnL = (10 * 50) + (5 * -20) = 500 - 100 = 400
    assert summary.daily_pnl == 400.0


def test_sector_concentration_alert():
    stock1 = Stock(symbol="RELIANCE", company_name="Reliance", sector="Energy")
    stock2 = Stock(symbol="ONGC", company_name="ONGC", sector="Energy")

    h1 = Holding(id="h1", user_id="u1", stock_id="s1", quantity=100.0, average_purchase_price=100.0)
    h1.stock = stock1
    h2 = Holding(id="h2", user_id="u1", stock_id="s2", quantity=50.0, average_purchase_price=100.0)
    h2.stock = stock2

    prices = {"RELIANCE": 100.0, "ONGC": 100.0}
    summary = calculate_portfolio_analytics([h1, h2], prices)
    # Energy is 100% of portfolio (>40%), so concentration alert should trigger
    assert summary.concentration_alert is not None
    assert "Energy" in summary.concentration_alert
