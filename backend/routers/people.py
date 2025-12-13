"""API routes for people/individuals."""

import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from models import Individual, Family, Event, Media
from schemas.people import (
    CreatePersonRequest,
    UpdatePersonRequest,
    AddRelationshipRequest,
)
from services.storage import minio_client

router = APIRouter(prefix="/people", tags=["people"])


@router.get("")
async def get_people(db: Session = Depends(get_db)):
    """Get all people with basic info."""
    individuals = db.query(Individual).all()
    people_list = []

    for i in individuals:
        birth_year = None
        for event in i.events:
            if event.event_type == "BIRT" and event.event_date:
                birth_year = event.event_date.year
                break

        people_list.append(
            {
                "id": i.id,
                "first_name": i.first_name,
                "last_name": i.last_name,
                "sex": i.sex,
                "birth_year": birth_year,
                "profile_image_id": i.profile_image_id,
            }
        )

    # Sort by birth year descending (youngest first, None at end)
    people_list.sort(
        key=lambda x: (
            x["birth_year"] is None,
            -x["birth_year"] if x["birth_year"] else 0,
        )
    )
    return people_list


@router.get("/{person_id}")
async def get_person_details(person_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific person."""
    person = db.query(Individual).filter(Individual.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Get birth events
    births = []
    for event in person.events:
        if event.event_type == "BIRT":
            births.append({"date": event.event_date, "place": event.place})

    # Get death events
    deaths = []
    for event in person.events:
        if event.event_type == "DEAT":
            deaths.append({"date": event.event_date, "place": event.place})

    # Get burial events
    burials = []
    for event in person.events:
        if event.event_type == "BURI":
            burials.append({"date": event.event_date, "place": event.place})

    # Get family relationships (as spouse)
    families_as_spouse = person.families_as_spouse + person.families_as_spouse2
    marriages = []
    spouses = []
    seen_spouse_ids = set()
    for family in families_as_spouse:
        spouse = None
        if family.spouse1_id == person_id and family.spouse2:
            spouse = family.spouse2
        elif family.spouse2_id == person_id and family.spouse1:
            spouse = family.spouse1

        if spouse and spouse.id not in seen_spouse_ids:
            seen_spouse_ids.add(spouse.id)
            spouses.append(
                {
                    "id": spouse.id,
                    "name": f"{spouse.first_name} {spouse.last_name}",
                    "sex": spouse.sex,
                }
            )

        # Get marriage events for this family
        for event in family.events:
            if event.event_type == "MARR":
                marriages.append(
                    {
                        "date": event.event_date,
                        "place": event.place,
                        "spouse": (
                            f"{spouse.first_name} {spouse.last_name}"
                            if spouse
                            else "Unknown"
                        ),
                    }
                )

    # Get children (deduplicated)
    children = []
    seen_children_ids = set()
    for family in families_as_spouse:
        for child in family.children:
            if child.id not in seen_children_ids:
                seen_children_ids.add(child.id)
                children.append(
                    {
                        "id": child.id,
                        "name": f"{child.first_name} {child.last_name}",
                        "sex": child.sex,
                    }
                )

    # Get parents (from family as child) - deduplicated
    parents = []
    seen_parent_ids = set()
    for family in person.families_as_child:
        if family.spouse1:
            if family.spouse1.id not in seen_parent_ids:
                seen_parent_ids.add(family.spouse1.id)
                parents.append(
                    {
                        "id": family.spouse1.id,
                        "name": f"{family.spouse1.first_name} {family.spouse1.last_name}",
                        "sex": family.spouse1.sex,
                    }
                )
        if family.spouse2:
            if family.spouse2.id not in seen_parent_ids:
                seen_parent_ids.add(family.spouse2.id)
                parents.append(
                    {
                        "id": family.spouse2.id,
                        "name": f"{family.spouse2.first_name} {family.spouse2.last_name}",
                        "sex": family.spouse2.sex,
                    }
                )

    # Get media tagged to this person
    media_files = []
    for media in person.media:
        media_files.append(
            {
                "id": media.id,
                "filename": media.filename,
                "media_type": media.media_type,
                "file_size": media.file_size,
                "media_date": (
                    media.media_date.isoformat() if media.media_date else None
                ),
                "description": media.description,
            }
        )

    return {
        "id": person.id,
        "first_name": person.first_name,
        "last_name": person.last_name,
        "sex": person.sex,
        "gedcom_id": person.gedcom_id,
        "profile_image_id": person.profile_image_id,
        "births": births,
        "deaths": deaths,
        "burials": burials,
        "marriages": marriages,
        "spouses": spouses,
        "children": children,
        "parents": parents,
        "media": media_files,
    }


@router.post("")
async def create_person(
    person_data: CreatePersonRequest, db: Session = Depends(get_db)
):
    """Create a new person."""
    try:
        new_person = Individual(
            first_name=person_data.first_name,
            last_name=person_data.last_name,
            sex=person_data.sex if person_data.sex in ["M", "F"] else None,
        )
        db.add(new_person)
        db.flush()

        # Add birth event if provided
        if person_data.birth_date or person_data.birth_place:
            birth_event = Event(event_type="BIRT")
            if person_data.birth_date:
                try:
                    birth_event.event_date = datetime.strptime(
                        person_data.birth_date, "%Y-%m-%d"
                    ).date()
                except ValueError:
                    pass
            if person_data.birth_place:
                birth_event.place = person_data.birth_place
            db.add(birth_event)
            db.flush()
            new_person.events.append(birth_event)

        # Add death event if provided
        if person_data.death_date or person_data.death_place:
            death_event = Event(event_type="DEAT")
            if person_data.death_date:
                try:
                    death_event.event_date = datetime.strptime(
                        person_data.death_date, "%Y-%m-%d"
                    ).date()
                except ValueError:
                    pass
            if person_data.death_place:
                death_event.place = person_data.death_place
            db.add(death_event)
            db.flush()
            new_person.events.append(death_event)

        # Add burial event if provided
        if person_data.burial_date or person_data.burial_place:
            burial_event = Event(event_type="BURI")
            if person_data.burial_date:
                try:
                    burial_event.event_date = datetime.strptime(
                        person_data.burial_date, "%Y-%m-%d"
                    ).date()
                except ValueError:
                    pass
            if person_data.burial_place:
                burial_event.place = person_data.burial_place
            db.add(burial_event)
            db.flush()
            new_person.events.append(burial_event)

        db.commit()
        db.refresh(new_person)

        return {
            "id": new_person.id,
            "first_name": new_person.first_name,
            "last_name": new_person.last_name,
            "sex": new_person.sex,
            "message": "Person created successfully",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{person_id}")
async def update_person(
    person_id: int, person_data: UpdatePersonRequest, db: Session = Depends(get_db)
):
    """Update an existing person."""
    person = db.query(Individual).filter(Individual.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    try:
        if person_data.first_name is not None:
            person.first_name = person_data.first_name
        if person_data.last_name is not None:
            person.last_name = person_data.last_name
        if person_data.sex is not None and person_data.sex in ["M", "F", ""]:
            person.sex = person_data.sex if person_data.sex else None
        if person_data.profile_image_id is not None:
            if person_data.profile_image_id > 0:
                media = (
                    db.query(Media)
                    .filter(Media.id == person_data.profile_image_id)
                    .first()
                )
                if media:
                    person.profile_image_id = person_data.profile_image_id
            else:
                person.profile_image_id = None

        # Handle birth event update/creation
        if person_data.birth_date is not None or person_data.birth_place is not None:
            birth_event = None
            for event in person.events:
                if event.event_type == "BIRT":
                    birth_event = event
                    break
            if not birth_event:
                birth_event = Event(event_type="BIRT")
                db.add(birth_event)
                db.flush()
                person.events.append(birth_event)
            if person_data.birth_date:
                try:
                    birth_event.event_date = datetime.strptime(
                        person_data.birth_date, "%Y-%m-%d"
                    ).date()
                except ValueError:
                    pass
            if person_data.birth_place:
                birth_event.place = person_data.birth_place

        # Handle death event update/creation
        if person_data.death_date is not None or person_data.death_place is not None:
            death_event = None
            for event in person.events:
                if event.event_type == "DEAT":
                    death_event = event
                    break
            if not death_event:
                death_event = Event(event_type="DEAT")
                db.add(death_event)
                db.flush()
                person.events.append(death_event)
            if person_data.death_date:
                try:
                    death_event.event_date = datetime.strptime(
                        person_data.death_date, "%Y-%m-%d"
                    ).date()
                except ValueError:
                    pass
            if person_data.death_place:
                death_event.place = person_data.death_place

        # Handle burial event update/creation
        if person_data.burial_date is not None or person_data.burial_place is not None:
            burial_event = None
            for event in person.events:
                if event.event_type == "BURI":
                    burial_event = event
                    break
            if not burial_event:
                burial_event = Event(event_type="BURI")
                db.add(burial_event)
                db.flush()
                person.events.append(burial_event)
            if person_data.burial_date:
                try:
                    burial_event.event_date = datetime.strptime(
                        person_data.burial_date, "%Y-%m-%d"
                    ).date()
                except ValueError:
                    pass
            if person_data.burial_place:
                burial_event.place = person_data.burial_place

        db.commit()
        db.refresh(person)

        return {
            "id": person.id,
            "first_name": person.first_name,
            "last_name": person.last_name,
            "sex": person.sex,
            "profile_image_id": person.profile_image_id,
            "message": "Person updated successfully",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{person_id}/profile-image")
async def upload_profile_image(
    person_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)
):
    """Upload a profile image for a person."""
    person = db.query(Individual).filter(Individual.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    try:
        file_content = await file.read()
        file_size = len(file_content)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"profile_{person_id}_{timestamp}_{file.filename}"

        minio_client.put_object(
            "media",
            filename,
            io.BytesIO(file_content),
            file_size,
            content_type=file.content_type,
        )

        new_media = Media(
            filename=file.filename,
            file_path=filename,
            media_type="image",
            file_size=file_size,
        )
        db.add(new_media)
        db.flush()

        person.profile_image_id = new_media.id
        person.media.append(new_media)

        db.commit()

        return {
            "id": new_media.id,
            "filename": new_media.filename,
            "message": "Profile image uploaded successfully",
        }
    except Exception as e:
        db.rollback()
        print(f"Error uploading profile image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{person_id}/add-parent")
async def add_parent(
    person_id: int, data: AddRelationshipRequest, db: Session = Depends(get_db)
):
    """Add a parent to a person by creating or updating a Family relationship."""
    child = db.query(Individual).filter(Individual.id == person_id).first()
    parent = (
        db.query(Individual).filter(Individual.id == data.related_person_id).first()
    )

    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    try:
        # Check if child already has a family
        child_family = child.families_as_child[0] if child.families_as_child else None

        # Check if parent already has a family as a spouse
        parent_families = parent.families_as_spouse + parent.families_as_spouse2

        if child_family:
            # Child already has a family - add parent to it if not already there
            if parent.id not in [child_family.spouse1_id, child_family.spouse2_id]:
                if not child_family.spouse1_id:
                    child_family.spouse1 = parent
                elif not child_family.spouse2_id:
                    child_family.spouse2 = parent
                    # Now we have both spouses - create marriage event if none exists
                    has_marriage = any(e.event_type == "MARR" for e in child_family.events)
                    if not has_marriage:
                        marriage_event = Event(event_type="MARR")
                        db.add(marriage_event)
                        db.flush()
                        child_family.events.append(marriage_event)
                else:
                    raise HTTPException(
                        status_code=400, detail="Child already has two parents"
                    )
        elif parent_families:
            # Parent has a family - add child to it
            parent_family = parent_families[0]
            if child not in parent_family.children:
                parent_family.children.append(child)
        else:
            # No existing family - create new one
            new_family = Family()
            new_family.spouse1 = parent
            db.add(new_family)
            db.flush()
            new_family.children.append(child)

        db.commit()

        return {
            "message": f"Successfully added {parent.first_name} {parent.last_name} as parent of {child.first_name} {child.last_name}"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{person_id}/add-child")
async def add_child(
    person_id: int, data: AddRelationshipRequest, db: Session = Depends(get_db)
):
    """Add a child to a person by creating or updating a Family relationship."""
    parent = db.query(Individual).filter(Individual.id == person_id).first()
    child = db.query(Individual).filter(Individual.id == data.related_person_id).first()

    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    try:
        existing_family = None
        for fam in parent.families_as_spouse + parent.families_as_spouse2:
            if fam.spouse1_id == parent.id or fam.spouse2_id == parent.id:
                existing_family = fam
                break

        if existing_family:
            if child not in existing_family.children:
                existing_family.children.append(child)
        else:
            new_family = Family(spouse1_id=parent.id)
            db.add(new_family)
            db.flush()
            new_family.children.append(child)

        db.commit()

        return {
            "message": f"Successfully added {child.first_name} {child.last_name} as child of {parent.first_name} {parent.last_name}"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
