from typing import List, Optional
from fastapi import APIRouter, Query
from apps.api.app.schemas.news import NewsEventResponse
from apps.api.app.data_providers.nse_provider import NSEDataProvider, NSE_UNIVERSE

router = APIRouter(prefix="/news", tags=["News"])
data_provider = NSEDataProvider()


@router.get("", response_model=List[NewsEventResponse])
async def list_news(
    symbol: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
):
    items = await data_provider.get_news(symbol=symbol, limit=limit)
    responses = []
    for idx, item in enumerate(items):
        score = item.get("sentiment_score")
        label = "Neutral"
        if score is not None:
            if score > 0.3:
                label = "Positive"
            elif score < -0.3:
                label = "Negative"

        sym = item.get("symbol")
        cname = NSE_UNIVERSE.get(sym, {}).get("company_name", sym) if sym else "Macro / Markets"

        responses.append(
            NewsEventResponse(
                id=f"news-feed-{idx}",
                symbol=sym,
                company_name=cname,
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
