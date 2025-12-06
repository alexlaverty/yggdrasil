"""Pydantic schemas for media-related endpoints."""

from pydantic import BaseModel
from typing import Optional, List


class MediaUpdateRequest(BaseModel):
    media_date: Optional[str] = None
    description: Optional[str] = None
    individual_ids: List[int] = []
