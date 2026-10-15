import math
from typing import List, Dict, Any, Optional


def calculate_sma(prices: List[float], period: int) -> List[Optional[float]]:
    if not prices or period <= 0:
        return []
    result = [None] * len(prices)
    if len(prices) < period:
        return result
    
    current_sum = sum(prices[:period])
    result[period - 1] = round(current_sum / period, 4)
    
    for i in range(period, len(prices)):
        current_sum += prices[i] - prices[i - period]
        result[i] = round(current_sum / period, 4)
        
    return result


def calculate_ema(prices: List[float], period: int) -> List[Optional[float]]:
    if not prices or period <= 0:
        return []
    result = [None] * len(prices)
    if len(prices) < period:
        return result
        
    # Start with SMA for first EMA point
    initial_sma = sum(prices[:period]) / period
    result[period - 1] = round(initial_sma, 4)
    multiplier = 2.0 / (period + 1)
    
    for i in range(period, len(prices)):
        prev_ema = result[i - 1]
        current_ema = (prices[i] - prev_ema) * multiplier + prev_ema
        result[i] = round(current_ema, 4)
        
    return result


def calculate_rsi(prices: List[float], period: int = 14) -> List[Optional[float]]:
    if not prices or len(prices) <= period:
        return [None] * len(prices)
        
    result = [None] * len(prices)
    gains = []
    losses = []
    
    for i in range(1, len(prices)):
        change = prices[i] - prices[i - 1]
        gains.append(max(0.0, change))
        losses.append(max(0.0, -change))
        
    if len(gains) < period:
        return result
        
    # Wilder's Smoothing
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    if avg_loss == 0.0:
        result[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        result[period] = round(100.0 - (100.0 / (1.0 + rs)), 2)
        
    for i in range(period, len(gains)):
        gain = gains[i]
        loss = losses[i]
        
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        
        if avg_loss == 0.0:
            result[i + 1] = 100.0
        else:
            rs = avg_gain / avg_loss
            result[i + 1] = round(100.0 - (100.0 / (1.0 + rs)), 2)
            
    return result


def calculate_macd(
    prices: List[float], fast_period: int = 12, slow_period: int = 26, signal_period: int = 9
) -> Dict[str, List[Optional[float]]]:
    fast_ema = calculate_ema(prices, fast_period)
    slow_ema = calculate_ema(prices, slow_period)
    
    macd_line = [None] * len(prices)
    for i in range(len(prices)):
        if fast_ema[i] is not None and slow_ema[i] is not None:
            macd_line[i] = round(fast_ema[i] - slow_ema[i], 4)
            
    # Calculate signal line as EMA of valid macd_line values
    valid_macd_indices = [i for i, v in enumerate(macd_line) if v is not None]
    signal_line = [None] * len(prices)
    histogram = [None] * len(prices)
    
    if len(valid_macd_indices) >= signal_period:
        valid_macd_values = [macd_line[i] for i in valid_macd_indices]
        valid_signal = calculate_ema(valid_macd_values, signal_period)
        
        for idx, orig_idx in enumerate(valid_macd_indices):
            signal_line[orig_idx] = valid_signal[idx]
            if macd_line[orig_idx] is not None and signal_line[orig_idx] is not None:
                histogram[orig_idx] = round(macd_line[orig_idx] - signal_line[orig_idx], 4)
                
    return {
        "macd": macd_line,
        "signal": signal_line,
        "histogram": histogram,
    }


def calculate_bollinger_bands(
    prices: List[float], period: int = 20, num_std: float = 2.0
) -> Dict[str, List[Optional[float]]]:
    sma = calculate_sma(prices, period)
    upper = [None] * len(prices)
    lower = [None] * len(prices)
    percent_b = [None] * len(prices)
    
    for i in range(period - 1, len(prices)):
        window = prices[i - period + 1 : i + 1]
        mean = sma[i]
        variance = sum((x - mean) ** 2 for x in window) / period
        std_dev = math.sqrt(variance)
        
        u = round(mean + (num_std * std_dev), 4)
        l = round(mean - (num_std * std_dev), 4)
        upper[i] = u
        lower[i] = l
        
        bandwidth = u - l
        if bandwidth > 0:
            percent_b[i] = round((prices[i] - l) / bandwidth, 4)
        else:
            percent_b[i] = 0.5
            
    return {
        "middle": sma,
        "upper": upper,
        "lower": lower,
        "percent_b": percent_b,
    }


def calculate_atr(
    highs: List[float], lows: List[float], closes: List[float], period: int = 14
) -> List[Optional[float]]:
    n = len(closes)
    if n < 2 or period <= 0:
        return [None] * n
        
    true_ranges = [highs[0] - lows[0]]
    for i in range(1, n):
        tr = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i - 1]),
            abs(lows[i] - closes[i - 1]),
        )
        true_ranges.append(tr)
        
    return calculate_sma(true_ranges, period)


def calculate_rolling_volatility(prices: List[float], window: int = 20) -> List[Optional[float]]:
    n = len(prices)
    result = [None] * n
    if n <= window:
        return result
        
    returns = []
    for i in range(1, n):
        prev = prices[i - 1]
        ret = (prices[i] - prev) / prev if prev != 0 else 0.0
        returns.append(ret)
        
    for i in range(window - 1, len(returns)):
        sub = returns[i - window + 1 : i + 1]
        mean = sum(sub) / window
        var = sum((r - mean) ** 2 for r in sub) / (window - 1)
        # Annualized volatility (assuming 252 trading days)
        ann_vol = math.sqrt(var) * math.sqrt(252)
        result[i + 1] = round(ann_vol, 4)
        
    return result


def detect_candlestick_patterns(
    opens: List[float], highs: List[float], lows: List[float], closes: List[float]
) -> List[str]:
    patterns = []
    if len(closes) < 3:
        return patterns
        
    idx = -1  # Latest candle
    o, h, l, c = opens[idx], highs[idx], lows[idx], closes[idx]
    prev_o, prev_h, prev_l, prev_c = opens[idx - 1], highs[idx - 1], lows[idx - 1], closes[idx - 1]
    
    candle_range = h - l
    if candle_range <= 0:
        return patterns
        
    body = abs(c - o)
    upper_wick = h - max(o, c)
    lower_wick = min(o, c) - l
    
    # 1. Doji
    if body / candle_range <= 0.10:
        patterns.append("Doji (Indecision)")
        
    # 2. Hammer / Inverted Hammer
    if lower_wick >= 2 * body and upper_wick <= 0.2 * body and c > o:
        patterns.append("Bullish Hammer")
    elif upper_wick >= 2 * body and lower_wick <= 0.2 * body:
        patterns.append("Shooting Star / Inverted Hammer")
        
    # 3. Bullish Engulfing
    if prev_c < prev_o and c > o and c > prev_o and o < prev_c:
        patterns.append("Bullish Engulfing")
        
    # 4. Bearish Engulfing
    if prev_c > prev_o and c < o and o > prev_c and c < prev_o:
        patterns.append("Bearish Engulfing")
        
    # 5. Morning Star
    if len(closes) >= 3:
        p2_o, p2_c = opens[idx - 2], closes[idx - 2]
        if p2_c < p2_o and abs(prev_c - prev_o) < (p2_o - p2_c) * 0.4 and c > o and c > (p2_o + p2_c) / 2:
            patterns.append("Morning Star (Reversal)")
            
    return patterns
