"""GEDCOM parsing and import service."""

import os
import tempfile
from datetime import datetime
from gedcom.parser import Parser
from gedcom.element.individual import IndividualElement
from gedcom.element.family import FamilyElement
from sqlalchemy.orm import Session

from models import Individual, Family, Event


def clean_name(name_str: str) -> str:
    """Remove slashes from GEDCOM names."""
    if not name_str:
        return ""
    return name_str.replace("/", "").strip()


def get_tag_value(element, tag: str) -> str:
    """Safely extract the first value of a specific tag."""
    if not hasattr(element, "get_child_elements"):
        return ""
    for child in element.get_child_elements():
        if hasattr(child, "get_tag") and child.get_tag() == tag:
            val = child.get_value() if hasattr(child, "get_value") else ""
            return val.strip() if val else ""
    return ""


def parse_date(date_str: str):
    """Parse a date string in various GEDCOM formats."""
    if not date_str:
        return None

    for fmt in ["%d %b %Y", "%b %Y", "%Y"]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def parse_gedcom_file(contents: bytes) -> Parser:
    """Parse a GEDCOM file and return the parser."""
    parser = Parser()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".ged") as tmp:
        tmp.write(contents)
        tmp.flush()
        tmp_path = tmp.name

    try:
        parser.parse_file(tmp_path, strict=False)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return parser


def import_individuals(db: Session, individuals: list) -> dict:
    """Import individuals from GEDCOM and return a mapping of gedcom_id to DB record."""
    individual_map = {}

    for individual in individuals:
        try:
            name_parts = individual.get_name()
            first_name = clean_name(name_parts[0]) if len(name_parts) > 0 else ""
            last_name = clean_name(name_parts[1]) if len(name_parts) > 1 else ""
            sex = get_tag_value(individual, "SEX")

            print(
                f"[DEBUG] Processing individual: {first_name} {last_name} ({individual.get_pointer()})"
            )

            ind = Individual(
                gedcom_id=individual.get_pointer(),
                first_name=first_name,
                last_name=last_name,
                sex=sex,
            )
            db.add(ind)
            individual_map[individual.get_pointer()] = ind
        except Exception as item_error:
            print(
                f"Error processing individual {getattr(individual, 'pointer', 'unknown')}: {item_error}"
            )
            import traceback

            traceback.print_exc()
            continue

    db.commit()
    print(
        f"[DEBUG] Successfully inserted {len(individual_map)} individuals into database"
    )
    return individual_map


def import_families(db: Session, families: list, individual_map: dict) -> dict:
    """Import families from GEDCOM and return a mapping of gedcom_id to DB record."""
    family_map = {}

    for family in families:
        try:
            gedcom_id = family.get_pointer()
            print(f"[DEBUG] Processing family: {gedcom_id}")

            spouse1_ref = get_tag_value(family, "HUSB")
            spouse2_ref = get_tag_value(family, "WIFE")

            spouse1 = individual_map.get(spouse1_ref)
            spouse2 = individual_map.get(spouse2_ref)

            fam = Family(
                gedcom_id=gedcom_id,
                spouse1_id=spouse1.id if spouse1 else None,
                spouse2_id=spouse2.id if spouse2 else None,
            )
            db.add(fam)
            db.flush()
            family_map[gedcom_id] = fam

            # Get children references
            if hasattr(family, "get_child_elements"):
                for child_elem in family.get_child_elements():
                    if (
                        hasattr(child_elem, "get_tag")
                        and child_elem.get_tag() == "CHIL"
                    ):
                        child_ref = (
                            child_elem.get_value()
                            if hasattr(child_elem, "get_value")
                            else ""
                        )
                        child = individual_map.get(child_ref.strip())
                        if child:
                            fam.children.append(child)
                            print(
                                f"[DEBUG] Added {child.first_name} {child.last_name} as child to family {gedcom_id}"
                            )

            db.commit()
            print(
                f"[DEBUG] Successfully added family {gedcom_id} with {len(fam.children)} children"
            )
        except Exception as family_error:
            print(f"Error processing family {gedcom_id}: {family_error}")
            import traceback

            traceback.print_exc()
            continue

    return family_map


def import_individual_events(
    db: Session, individuals: list, individual_map: dict
) -> None:
    """Import events (birth, death, burial) for individuals."""
    for individual in individuals:
        try:
            gedcom_id = individual.get_pointer()
            ind = individual_map.get(gedcom_id)
            if not ind:
                continue

            print(
                f"[DEBUG] Processing events for individual: {ind.first_name} {ind.last_name} ({gedcom_id})"
            )

            if hasattr(individual, "get_child_elements"):
                for child in individual.get_child_elements():
                    if not hasattr(child, "get_tag"):
                        continue

                    tag = child.get_tag()
                    if tag in ["BIRT", "DEAT", "BURI"]:
                        event = Event(event_type=tag)

                        # Extract date
                        date_str = get_tag_value(child, "DATE")
                        event.event_date = parse_date(date_str)

                        # Extract place
                        place = get_tag_value(child, "PLAC")
                        if place:
                            event.place = place

                        db.add(event)
                        db.flush()
                        ind.events.append(event)
                        print(
                            f"[DEBUG] Added {tag} event for {ind.first_name} {ind.last_name}: {event.event_date} at {event.place}"
                        )
        except Exception as item_error:
            print(f"Error processing events for individual {gedcom_id}: {item_error}")
            import traceback

            traceback.print_exc()
            continue


def import_family_events(db: Session, families: list, family_map: dict) -> None:
    """Import events (marriage) for families."""
    for family in families:
        try:
            gedcom_id = family.get_pointer()
            fam = family_map.get(gedcom_id)
            if not fam:
                continue

            print(f"[DEBUG] Processing events for family: {gedcom_id}")

            if hasattr(family, "get_child_elements"):
                for child in family.get_child_elements():
                    if hasattr(child, "get_tag") and child.get_tag() == "MARR":
                        event = Event(event_type="MARR")

                        # Extract date
                        date_str = get_tag_value(child, "DATE")
                        event.event_date = parse_date(date_str)

                        # Extract place
                        place = get_tag_value(child, "PLAC")
                        if place:
                            event.place = place

                        db.add(event)
                        db.flush()
                        fam.events.append(event)

                        spouse_str = ""
                        if fam.spouse1 and fam.spouse2:
                            spouse_str = f"{fam.spouse1.first_name} {fam.spouse1.last_name} & {fam.spouse2.first_name} {fam.spouse2.last_name}"
                        print(
                            f"[DEBUG] Added MARRIAGE event for family {gedcom_id} ({spouse_str}): {event.event_date} at {event.place}"
                        )
        except Exception as family_error:
            print(f"Error processing events for family {gedcom_id}: {family_error}")
            import traceback

            traceback.print_exc()
            continue


def import_gedcom(db: Session, contents: bytes) -> dict:
    """Import a complete GEDCOM file into the database.

    Returns a summary of imported records.
    """
    parser = parse_gedcom_file(contents)
    root_elements = parser.get_root_child_elements()

    individuals = [e for e in root_elements if isinstance(e, IndividualElement)]
    families = [e for e in root_elements if isinstance(e, FamilyElement)]

    print(f"[DEBUG] Found {len(individuals)} individuals to process")
    print(f"[DEBUG] Found {len(families)} families to process")

    # Pass 1: Import individuals
    individual_map = import_individuals(db, individuals)

    # Pass 2: Import families
    family_map = import_families(db, families, individual_map)

    # Pass 3: Import individual events
    import_individual_events(db, individuals, individual_map)

    # Pass 4: Import family events
    import_family_events(db, families, family_map)

    db.commit()

    # Count events
    births_count = db.query(Event).filter(Event.event_type == "BIRT").count()
    deaths_count = db.query(Event).filter(Event.event_type == "DEAT").count()
    burials_count = db.query(Event).filter(Event.event_type == "BURI").count()
    marriages_count = db.query(Event).filter(Event.event_type == "MARR").count()

    print("[DEBUG] Event Summary:")
    print(f"[DEBUG]   - Births: {births_count}")
    print(f"[DEBUG]   - Deaths: {deaths_count}")
    print(f"[DEBUG]   - Burials: {burials_count}")
    print(f"[DEBUG]   - Marriages: {marriages_count}")
    print("[DEBUG] GEDCOM file processed successfully!")

    return {
        "individuals": len(individual_map),
        "families": len(family_map),
        "births": births_count,
        "deaths": deaths_count,
        "burials": burials_count,
        "marriages": marriages_count,
    }
