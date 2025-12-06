"""Geocoding service for converting place names to coordinates."""

import time
import httpx
from sqlalchemy.orm import Session

from models import Place, Event


def geocode_place_nominatim(place_name: str) -> dict:
    """Geocode a place name using OpenStreetMap Nominatim API.

    Returns dict with lat/lng or None if not found.
    """
    try:
        response = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "format": "json",
                "q": place_name,
                "limit": 1
            },
            headers={"User-Agent": "YggdrasilGenealogy/1.0"},
            timeout=10.0
        )
        response.raise_for_status()
        data = response.json()

        if data and len(data) > 0:
            return {
                "lat": float(data[0]["lat"]),
                "lng": float(data[0]["lon"])
            }
    except Exception as e:
        print(f"Geocoding error for '{place_name}': {e}")

    return None


def sync_places_from_events(db: Session) -> int:
    """Scan all events and create Place records for unique place names.

    Returns number of new places added.
    """
    # Get all unique place names from events
    events_with_places = db.query(Event.place).filter(Event.place.isnot(None)).distinct().all()
    place_names = {e[0].strip() for e in events_with_places if e[0] and e[0].strip()}

    # Get existing places
    existing_places = db.query(Place.name).all()
    existing_names = {p[0] for p in existing_places}

    # Add new places
    new_count = 0
    for name in place_names:
        if name not in existing_names:
            place = Place(name=name, geocoded=0)
            db.add(place)
            new_count += 1

    db.commit()
    return new_count


def geocode_all_places(db: Session, force: bool = False) -> dict:
    """Geocode all places that haven't been geocoded yet.

    Args:
        db: Database session
        force: If True, re-geocode all places including previously failed ones

    Returns dict with counts of success, failed, skipped.
    """
    # First sync places from events
    new_places = sync_places_from_events(db)

    # Get places to geocode
    if force:
        places = db.query(Place).all()
    else:
        # Only geocode places that haven't been attempted
        places = db.query(Place).filter(Place.geocoded == 0).all()

    results = {"total": len(places), "success": 0, "failed": 0, "skipped": 0, "new_places": new_places}

    for place in places:
        # Skip if already geocoded successfully and not forcing
        if place.geocoded == 1 and not force:
            results["skipped"] += 1
            continue

        coords = geocode_place_nominatim(place.name)

        if coords:
            place.latitude = coords["lat"]
            place.longitude = coords["lng"]
            place.geocoded = 1
            results["success"] += 1
        else:
            place.geocoded = -1  # Mark as failed
            results["failed"] += 1

        db.commit()

        # Rate limit: Nominatim requests max 1 per second
        time.sleep(1.1)

    return results


def get_place_coordinates(db: Session, place_name: str) -> dict:
    """Get coordinates for a place from the database.

    Returns dict with lat/lng or None if not found/not geocoded.
    """
    place = db.query(Place).filter(Place.name == place_name).first()

    if place and place.geocoded == 1 and place.latitude and place.longitude:
        return {"lat": place.latitude, "lng": place.longitude}

    return None


def get_geocoding_stats(db: Session) -> dict:
    """Get statistics about geocoded places."""
    total = db.query(Place).count()
    success = db.query(Place).filter(Place.geocoded == 1).count()
    failed = db.query(Place).filter(Place.geocoded == -1).count()
    pending = db.query(Place).filter(Place.geocoded == 0).count()

    # Count unique places in events that aren't in Place table yet
    events_with_places = db.query(Event.place).filter(Event.place.isnot(None)).distinct().all()
    event_places = {e[0].strip() for e in events_with_places if e[0] and e[0].strip()}
    existing_places = {p[0] for p in db.query(Place.name).all()}
    unsynced = len(event_places - existing_places)

    return {
        "total": total,
        "success": success,
        "failed": failed,
        "pending": pending,
        "unsynced": unsynced
    }
