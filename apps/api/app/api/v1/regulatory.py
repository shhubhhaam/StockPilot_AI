from typing import List
from fastapi import APIRouter, Query, HTTPException
from apps.api.app.schemas.regulatory import RegulatoryEventResponse
from apps.api.app.data_providers.nse_provider import NSEDataProvider

router = APIRouter(prefix="/regulatory-events", tags=["Regulatory"])
data_provider = NSEDataProvider()


@router.get("", response_model=List[RegulatoryEventResponse])
async def list_regulatory_events(limit: int = Query(10, ge=1, le=50)):
    items = await data_provider.get_regulatory_events(limit=limit)
    responses = []
    for idx, item in enumerate(items):
        responses.append(
            RegulatoryEventResponse(
                id=f"reg-{idx}",
                authority=item["authority"],
                document_title=item["document_title"],
                document_url=item.get("document_url"),
                published_at=item["published_at"],
                summary=item["summary"],
                event_type=item["event_type"],
                affected_sector=item.get("affected_sector"),
                impact_level=item["impact_level"],
                created_at=item["published_at"],
            )
        )
    return responses


@router.get("/{event_id}", response_model=RegulatoryEventResponse)
async def get_regulatory_event(event_id: str):
    items = await data_provider.get_regulatory_events(limit=10)
    for idx, item in enumerate(items):
        if f"reg-{idx}" == event_id:
            return RegulatoryEventResponse(
                id=f"reg-{idx}",
                authority=item["authority"],
                document_title=item["document_title"],
                document_url=item.get("document_url"),
                published_at=item["published_at"],
                summary=item["summary"],
                event_type=item["event_type"],
                affected_sector=item.get("affected_sector"),
                impact_level=item["impact_level"],
                created_at=item["published_at"],
            )
    raise HTTPException(status_code=404, detail="Regulatory event not found")
