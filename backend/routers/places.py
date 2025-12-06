"""API routes for places."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Individual, Event

router = APIRouter(prefix="/places", tags=["places"])


@router.get("")
async def get_places(db: Session = Depends(get_db)):
    """Get all unique places from events."""
    events = db.query(Event).filter(Event.place.isnot(None)).all()
    places = {}

    for event in events:
        if event.place:
            place = event.place.strip()
            if place not in places:
                places[place] = {
                    "name": place,
                    "count": 0
                }
            places[place]["count"] += 1

    sorted_places = sorted(places.values(), key=lambda x: x["name"])
    return sorted_places


@router.get("/{place_name}")
async def get_place_details(place_name: str, db: Session = Depends(get_db)):
    """Get all events and people associated with a specific place."""
    events = db.query(Event).filter(Event.place == place_name).all()

    if not events:
        raise HTTPException(status_code=404, detail="Place not found")

    births = []
    deaths = []
    marriages = []
    people_ids = set()

    for event in events:
        event_data = {
            "id": event.id,
            "date": event.event_date,
            "place": event.place
        }

        if event.event_type == "BIRT":
            if event.individuals:
                person = event.individuals[0]
                people_ids.add(person.id)
                births.append({
                    **event_data,
                    "individual_id": person.id,
                    "individual_name": f"{person.first_name} {person.last_name}"
                })
        elif event.event_type == "DEAT":
            if event.individuals:
                person = event.individuals[0]
                people_ids.add(person.id)
                deaths.append({
                    **event_data,
                    "individual_id": person.id,
                    "individual_name": f"{person.first_name} {person.last_name}"
                })
        elif event.event_type == "MARR":
            if event.individuals:
                person = event.individuals[0]
                people_ids.add(person.id)
                marriages.append({
                    **event_data,
                    "individual_id": person.id,
                    "individual_name": f"{person.first_name} {person.last_name}"
                })

    # Get unique people associated with this place
    people = []
    for person_id in people_ids:
        person = db.query(Individual).filter(Individual.id == person_id).first()
        if person:
            people.append({
                "id": person.id,
                "name": f"{person.first_name} {person.last_name}",
                "sex": person.sex
            })

    return {
        "place_name": place_name,
        "event_count": len(events),
        "people_count": len(people),
        "births": births,
        "deaths": deaths,
        "marriages": marriages,
        "people": sorted(people, key=lambda x: x["name"])
    }
