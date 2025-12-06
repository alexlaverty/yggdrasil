"""API routes for map data and geocoding."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Event, Place
from services.geocoding import (
    geocode_all_places,
    sync_places_from_events,
    get_geocoding_stats
)

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/events")
async def get_map_events(db: Session = Depends(get_db)):
    """Get all events with location data for map display.

    Only returns events that have geocoded coordinates in the Place table.
    """
    # Get all geocoded places
    places = db.query(Place).filter(
        Place.geocoded == 1,
        Place.latitude.isnot(None),
        Place.longitude.isnot(None)
    ).all()

    place_coords = {p.name: {"lat": p.latitude, "lng": p.longitude} for p in places}

    # Get events with places
    events = db.query(Event).filter(Event.place.isnot(None)).all()

    events_list = []
    for event in events:
        place_name = event.place.strip() if event.place else None
        coords = place_coords.get(place_name) if place_name else None

        # Skip events without geocoded coordinates
        if not coords:
            continue

        # Get associated person or family name
        name = ""
        person_id = None
        family_id = None

        if event.event_type in ["BIRT", "DEAT", "BURI"]:
            if event.individuals:
                person = event.individuals[0]
                name = f"{person.first_name} {person.last_name}"
                person_id = person.id
        elif event.event_type == "MARR":
            if event.families:
                family = event.families[0]
                if family.spouse1 and family.spouse2:
                    name = f"{family.spouse1.first_name} {family.spouse1.last_name} & {family.spouse2.first_name} {family.spouse2.last_name}"
                elif family.spouse1:
                    name = f"{family.spouse1.first_name} {family.spouse1.last_name}"
                elif family.spouse2:
                    name = f"{family.spouse2.first_name} {family.spouse2.last_name}"
                family_id = family.id

        events_list.append({
            "id": event.id,
            "event_type": event.event_type,
            "date": event.event_date.isoformat() if event.event_date else None,
            "year": event.event_date.year if event.event_date else None,
            "place": event.place,
            "name": name,
            "person_id": person_id,
            "family_id": family_id,
            "lat": coords["lat"],
            "lng": coords["lng"]
        })

    # Sort by year for timeline feature
    events_list.sort(key=lambda x: (x["year"] is None, x["year"] if x["year"] else 0))

    return events_list


@router.get("/years")
async def get_event_years(db: Session = Depends(get_db)):
    """Get min and max years for timeline slider."""
    # Only count events that have geocoded places
    places = db.query(Place).filter(Place.geocoded == 1).all()
    place_names = {p.name for p in places}

    events = db.query(Event).filter(
        Event.place.isnot(None),
        Event.event_date.isnot(None)
    ).all()

    years = [
        e.event_date.year
        for e in events
        if e.event_date and e.place and e.place.strip() in place_names
    ]

    if not years:
        return {"min_year": None, "max_year": None, "years": []}

    return {
        "min_year": min(years),
        "max_year": max(years),
        "years": sorted(set(years))
    }


@router.get("/places/stats")
async def get_places_stats(db: Session = Depends(get_db)):
    """Get geocoding statistics."""
    return get_geocoding_stats(db)


@router.post("/places/sync")
async def sync_places(db: Session = Depends(get_db)):
    """Sync places from events to Place table without geocoding."""
    new_count = sync_places_from_events(db)
    stats = get_geocoding_stats(db)
    return {
        "message": f"Synced {new_count} new places",
        "new_places": new_count,
        "stats": stats
    }


class GeocodeRequest(BaseModel):
    force: bool = False


# Track geocoding status
geocoding_status = {
    "running": False,
    "progress": 0,
    "total": 0,
    "results": None
}


@router.post("/places/geocode")
async def start_geocoding(request: GeocodeRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Start geocoding all places.

    This runs synchronously since we need to respect rate limits.
    For large datasets, consider running as a background task.
    """
    global geocoding_status

    if geocoding_status["running"]:
        raise HTTPException(status_code=409, detail="Geocoding already in progress")

    # Sync places first
    sync_places_from_events(db)

    # Run geocoding
    geocoding_status["running"] = True
    geocoding_status["progress"] = 0
    geocoding_status["results"] = None

    try:
        results = geocode_all_places(db, force=request.force)
        geocoding_status["results"] = results
        return {
            "message": "Geocoding complete",
            "results": results,
            "stats": get_geocoding_stats(db)
        }
    finally:
        geocoding_status["running"] = False


@router.get("/places/geocode/status")
async def get_geocoding_status():
    """Get current geocoding status."""
    return geocoding_status


@router.get("/places")
async def get_all_places(db: Session = Depends(get_db)):
    """Get all places with their geocoding status."""
    places = db.query(Place).order_by(Place.name).all()

    return [
        {
            "id": p.id,
            "name": p.name,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "geocoded": p.geocoded
        }
        for p in places
    ]
