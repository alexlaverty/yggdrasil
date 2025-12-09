"""API routes for families."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Individual, Family
from utils import get_male_birth_year

router = APIRouter(prefix="/families", tags=["families"])


@router.get("")
async def get_families(db: Session = Depends(get_db)):
    """Get all families with their spouses and children count, sorted by male's birth year (newest first)."""
    families = db.query(Family).all()
    families_list = []

    for family in families:
        spouse1_name = ""
        spouse2_name = ""
        if family.spouse1:
            spouse1_name = f"{family.spouse1.first_name} {family.spouse1.last_name}"
        if family.spouse2:
            spouse2_name = f"{family.spouse2.first_name} {family.spouse2.last_name}"

        male_birth_year = get_male_birth_year(family)

        families_list.append(
            {
                "id": family.id,
                "gedcom_id": family.gedcom_id,
                "spouse1_name": spouse1_name,
                "spouse2_name": spouse2_name,
                "spouse1_id": family.spouse1_id,
                "spouse2_id": family.spouse2_id,
                "children_count": len(family.children) if family.children else 0,
                "male_birth_year": male_birth_year,
            }
        )

    # Sort by male birth year descending (newest first, None at end)
    families_list.sort(
        key=lambda x: (
            x["male_birth_year"] is None,
            -x["male_birth_year"] if x["male_birth_year"] else 0,
        )
    )
    return families_list


@router.get("/{family_id}")
async def get_family_details(family_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific family."""
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    # Get spouse information
    spouse1_data = None
    spouse2_data = None

    if family.spouse1:
        spouse1_data = {
            "id": family.spouse1.id,
            "first_name": family.spouse1.first_name,
            "last_name": family.spouse1.last_name,
            "sex": family.spouse1.sex,
        }

    if family.spouse2:
        spouse2_data = {
            "id": family.spouse2.id,
            "first_name": family.spouse2.first_name,
            "last_name": family.spouse2.last_name,
            "sex": family.spouse2.sex,
        }

    # Get children information
    children_data = []
    for child in family.children:
        birth_year = None
        for event in child.events:
            if event.event_type == "BIRT" and event.event_date:
                birth_year = event.event_date.year
                break

        children_data.append(
            {
                "id": child.id,
                "first_name": child.first_name,
                "last_name": child.last_name,
                "sex": child.sex,
                "birth_year": birth_year,
            }
        )

    children_data.sort(
        key=lambda x: (
            x["birth_year"] is None,
            x["birth_year"] if x["birth_year"] else 0,
        )
    )

    # Get marriage events
    marriages = []
    for event in family.events:
        if event.event_type == "MARR":
            marriages.append(
                {"id": event.id, "date": event.event_date, "place": event.place}
            )

    # Get all family member IDs for media lookup
    member_ids = []
    if family.spouse1_id:
        member_ids.append(family.spouse1_id)
    if family.spouse2_id:
        member_ids.append(family.spouse2_id)
    for child in family.children:
        member_ids.append(child.id)

    # Get media tagged to any family member
    media_list = []
    seen_media_ids = set()

    if member_ids:
        members = db.query(Individual).filter(Individual.id.in_(member_ids)).all()
        for member in members:
            for media in member.media:
                if media.id not in seen_media_ids:
                    seen_media_ids.add(media.id)
                    tagged_individuals = [
                        {"id": ind.id, "name": f"{ind.first_name} {ind.last_name}"}
                        for ind in media.individuals
                    ]
                    media_list.append(
                        {
                            "id": media.id,
                            "filename": media.filename,
                            "media_type": media.media_type,
                            "file_size": media.file_size,
                            "media_date": (
                                media.media_date.isoformat()
                                if media.media_date
                                else None
                            ),
                            "description": media.description,
                            "tagged_individuals": tagged_individuals,
                        }
                    )

    return {
        "id": family.id,
        "gedcom_id": family.gedcom_id,
        "spouse1": spouse1_data,
        "spouse2": spouse2_data,
        "children": children_data,
        "marriages": marriages,
        "media": media_list,
    }
