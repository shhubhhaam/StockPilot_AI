import pytest
from apps.api.app.services.indicators import (
    calculate_sma,
    calculate_ema,
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_atr,
    calculate_rolling_volatility,
    detect_candlestick_patterns,
)


def test_sma_calculation():
    prices = [10.0, 20.0, 30.0, 40.0, 50.0]
    sma_3 = calculate_sma(prices, period=3)
    assert sma_3[0] is None
    assert sma_3[1] is None
    assert sma_3[2] == 20.0  # (10+20+30)/3
    assert sma_3[3] == 30.0  # (20+30+40)/3
    assert sma_3[4] == 40.0  # (30+40+50)/3


def test_ema_calculation():
    prices = [10.0, 10.0, 10.0, 10.0, 10.0]
    ema_3 = calculate_ema(prices, period=3)
    assert ema_3[2] == 10.0
    assert ema_3[3] == 10.0
    assert ema_3[4] == 10.0


def test_rsi_bounds_and_extremes():
    # Monotonically increasing prices -> RSI should be high
    rising = [100.0 + i * 2 for i in range(25)]
    rsi_rising = calculate_rsi(rising, period=14)
    valid_rsi = [r for r in rsi_rising if r is not None]
    assert len(valid_rsi) > 0
    assert all(0.0 <= r <= 100.0 for r in valid_rsi)
    assert valid_rsi[-1] >= 80.0  # Strong upward momentum

    # Monotonically falling prices -> RSI should be low
    falling = [200.0 - i * 2 for i in range(25)]
    rsi_falling = calculate_rsi(falling, period=14)
    valid_fall = [r for r in rsi_falling if r is not None]
    assert len(valid_fall) > 0
    assert all(0.0 <= r <= 100.0 for r in valid_fall)
    assert valid_fall[-1] <= 20.0


def test_macd_calculation():
    prices = [100.0 + (i % 5) * 2 for i in range(40)]
    macd_res = calculate_macd(prices, fast_period=12, slow_period=26, signal_period=9)
    assert "macd" in macd_res
    assert "signal" in macd_res
    assert "histogram" in macd_res
    assert len(macd_res["macd"]) == len(prices)


def test_bollinger_bands_bounds():
    prices = [100.0, 102.0, 101.0, 103.0, 105.0] * 5
    bb = calculate_bollinger_bands(prices, period=20, num_std=2.0)
    for i in range(19, len(prices)):
        assert bb["upper"][i] >= bb["middle"][i]
        assert bb["middle"][i] >= bb["lower"][i]


def test_atr_positive():
    highs = [105.0, 106.0, 108.0, 107.0, 110.0] * 4
    lows = [95.0, 96.0, 97.0, 96.0, 99.0] * 4
    closes = [100.0, 102.0, 103.0, 100.0, 105.0] * 4
    atr = calculate_atr(highs, lows, closes, period=14)
    valid_atr = [a for a in atr if a is not None]
    assert len(valid_atr) > 0
    assert all(a > 0 for a in valid_atr)


def test_candlestick_pattern_doji():
    # Doji has close almost equal to open
    opens = [100.0, 100.0, 100.0]
    highs = [105.0, 105.0, 105.0]
    lows = [95.0, 95.0, 95.0]
    closes = [100.0, 100.0, 100.1]  # body is 0.1, range is 10
    patterns = detect_candlestick_patterns(opens, highs, lows, closes)
    assert any("Doji" in p for p in patterns)
