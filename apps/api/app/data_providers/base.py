from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Any, Optional


class BaseDataProvider(ABC):
    """Abstract interface for financial market data providers."""

    @abstractmethod
    async def get_current_price(self, symbol: str, exchange: str = "NSE") -> Optional[Dict[str, Any]]:
        """Fetch current or latest available price and daily metrics."""
        pass

    @abstractmethod
    async def get_historical_candles(
        self,
        symbol: str,
        exchange: str = "NSE",
        interval: str = "1d",
        days: int = 180,
    ) -> List[Dict[str, Any]]:
        """Fetch historical OHLCV candles."""
        pass

    @abstractmethod
    async def get_fundamentals(self, symbol: str, exchange: str = "NSE") -> Optional[Dict[str, Any]]:
        """Fetch latest company fundamentals and ratios."""
        pass

    @abstractmethod
    async def get_news(self, symbol: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch relevant financial news and corporate announcements."""
        pass

    @abstractmethod
    async def get_regulatory_events(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch official regulatory circulars and notifications (e.g. SEBI)."""
        pass
