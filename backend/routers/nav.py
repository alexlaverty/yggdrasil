"""API routes for navigation info."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Individual, Family, Event, Media

router = APIRouter(prefix="/nav", tags=["navigation"])


@router.get("/people")
async def get_people_nav_info(db: Session = Depends(get_db)):
    """Get navigation info for people (min and max IDs)."""
    result = db.query(func.min(Individual.id), func.max(Individual.id), func.count(Individual.id)).first()
    return {"min_id": result[0] or 0, "max_id": result[1] or 0, "count": result[2] or 0}


@router.get("/media")
async def get_media_nav_info(db: Session = Depends(get_db)):
    """Get navigation info for media (min and max IDs)."""
    result = db.query(func.min(Media.id), func.max(Media.id), func.count(Media.id)).first()
    return {"min_id": result[0] or 0, "max_id": result[1] or 0, "count": result[2] or 0}


@router.get("/events")
async def get_events_nav_info(db: Session = Depends(get_db)):
    """Get navigation info for events (min and max IDs)."""
    result = db.query(func.min(Event.id), func.max(Event.id), func.count(Event.id)).first()
    return {"min_id": result[0] or 0, "max_id": result[1] or 0, "count": result[2] or 0}


@router.get("/families")
async def get_families_nav_info(db: Session = Depends(get_db)):
    """Get navigation info for families (min and max IDs)."""
    result = db.query(func.min(Family.id), func.max(Family.id), func.count(Family.id)).first()
    return {"min_id": result[0] or 0, "max_id": result[1] or 0, "count": result[2] or 0}
