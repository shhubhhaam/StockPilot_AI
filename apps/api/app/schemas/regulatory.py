from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RegulatoryEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    authority: str = "SEBI"
    document_title: str
    document_url: Optional[str] = None
    published_at: datetime
    summary: str
    event_type: str
    affected_sector: Optional[str] = None
    impact_level: str
    created_at: datetime
