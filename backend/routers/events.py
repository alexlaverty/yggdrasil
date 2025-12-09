"""API routes for events (births, deaths, burials, marriages)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Event
from utils import get_male_birth_year

router = APIRouter(tags=["events"])


@router.get("/births")
async def get_births(db: Session = Depends(get_db)):
    """Get all birth events."""
    events = db.query(Event).filter(Event.event_type == "BIRT").all()
    return [
        {
            "id": e.id,
            "individual": (
                e.individuals[0].first_name + " " + e.individuals[0].last_name
                if e.individuals
                else ""
            ),
            "date": e.event_date,
            "place": e.place,
        }
        for e in events
    ]


@router.get("/deaths")
async def get_deaths(db: Session = Depends(get_db)):
    """Get all death events."""
    events = db.query(Event).filter(Event.event_type == "DEAT").all()
    return [
        {
            "id": e.id,
            "individual": (
                e.individuals[0].first_name + " " + e.individuals[0].last_name
                if e.individuals
                else ""
            ),
            "date": e.event_date,
            "place": e.place,
        }
        for e in events
    ]


@router.get("/burials")
async def get_burials(db: Session = Depends(get_db)):
    """Get all burial events."""
    events = db.query(Event).filter(Event.event_type == "BURI").all()
    return [
        {
            "id": e.id,
            "individual": (
                e.individuals[0].first_name + " " + e.individuals[0].last_name
                if e.individuals
                else ""
            ),
            "date": e.event_date,
            "place": e.place,
        }
        for e in events
    ]


@router.get("/marriages")
async def get_marriages(db: Session = Depends(get_db)):
    """Get all marriage events, sorted by male's birth year (newest first)."""
    events = db.query(Event).filter(Event.event_type == "MARR").all()

    marriages_list = []
    for e in events:
        male_birth_year = None
        if e.families:
            male_birth_year = get_male_birth_year(e.families[0])

        marriages_list.append(
            {
                "id": e.id,
                "family": (
                    f"{e.families[0].spouse1.first_name} {e.families[0].spouse1.last_name} and {e.families[0].spouse2.first_name} {e.families[0].spouse2.last_name}"
                    if e.families and e.families[0].spouse1 and e.families[0].spouse2
                    else ""
                ),
                "date": e.event_date,
                "place": e.place,
                "male_birth_year": male_birth_year,
            }
        )

    # Sort by male birth year descending (newest first, None at end)
    marriages_list.sort(
        key=lambda x: (
            x["male_birth_year"] is None,
            -x["male_birth_year"] if x["male_birth_year"] else 0,
        )
    )
    return marriages_list


@router.get("/events/{event_id}")
async def get_event_details(event_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get all individuals associated with this event
    individuals_data = []
    for individual in event.individuals:
        individuals_data.append(
            {
                "id": individual.id,
                "first_name": individual.first_name,
                "last_name": individual.last_name,
                "sex": individual.sex,
            }
        )

    # Get all families associated with this event (for marriages)
    families_data = []
    for family in event.families:
        family_dict = {"id": family.id}
        if family.spouse1:
            family_dict["spouse1"] = {
                "id": family.spouse1.id,
                "first_name": family.spouse1.first_name,
                "last_name": family.spouse1.last_name,
                "sex": family.spouse1.sex,
            }
        if family.spouse2:
            family_dict["spouse2"] = {
                "id": family.spouse2.id,
                "first_name": family.spouse2.first_name,
                "last_name": family.spouse2.last_name,
                "sex": family.spouse2.sex,
            }
        families_data.append(family_dict)

    # Get all media associated with this event
    media_data = []
    for media in event.media:
        media_data.append(
            {
                "id": media.id,
                "filename": media.filename,
                "date": media.media_date,
                "description": media.description,
            }
        )

    return {
        "event": {
            "id": event.id,
            "date": event.event_date,
            "place": event.place,
            "description": event.description,
        },
        "individuals": individuals_data,
        "families": families_data,
        "media": media_data,
    }
