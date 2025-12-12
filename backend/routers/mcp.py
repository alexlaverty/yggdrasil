"""MCP (Model Context Protocol) server integration for genealogy queries."""

from typing import Optional

from sqlalchemy import func

from database import SessionLocal
from models import Individual, Event
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("Yggdrasil Genealogy")

@mcp.tool()
def find_person_by_name(
    first_name: Optional[str] = None,
    last_name: Optional[str] = None
) -> str:
    """Find a person in the genealogy database by their first name and/or last name.

    Args:
        first_name: The person's first name (optional)
        last_name: The person's last name (optional)

    Returns:
        A formatted string with matching people and their IDs
    """
    db = SessionLocal()
    try:
        query = db.query(Individual)

        if first_name and last_name:
            query = query.filter(
                func.lower(Individual.first_name).like(f"%{first_name.lower()}%"),
                func.lower(Individual.last_name).like(f"%{last_name.lower()}%")
            )
        elif first_name:
            query = query.filter(
                func.lower(Individual.first_name).like(f"%{first_name.lower()}%")
            )
        elif last_name:
            query = query.filter(
                func.lower(Individual.last_name).like(f"%{last_name.lower()}%")
            )
        else:
            return "Please provide at least a first name or last name to search."

        people = query.all()

        if not people:
            return f"No people found matching the name '{first_name or ''} {last_name or ''}'."

        results = []
        for person in people:
            birth_info = ""
            for event in person.events:
                if event.event_type == "BIRT" and event.event_date:
                    birth_info = f" (born {event.event_date})"
                    break

            results.append(
                f"ID: {person.id} - {person.first_name} {person.last_name}{birth_info}"
            )

        return "Found the following people:\n" + "\n".join(results)
    finally:
        db.close()


@mcp.tool()
def get_person_details(person_id: int) -> str:
    """Get detailed information about a person by their ID.

    Args:
        person_id: The database ID of the person

    Returns:
        A formatted string with the person's details including birth, death, family relationships
    """
    db = SessionLocal()
    try:
        person = db.query(Individual).filter(Individual.id == person_id).first()

        if not person:
            return f"No person found with ID {person_id}."

        details = [f"Name: {person.first_name} {person.last_name}"]
        details.append(f"Sex: {person.sex or 'Unknown'}")

        # Birth information
        for event in person.events:
            if event.event_type == "BIRT":
                birth_str = "Birth: "
                if event.event_date:
                    birth_str += f"{event.event_date}"
                if event.place:
                    birth_str += f" in {event.place}"
                details.append(birth_str)
                break

        # Death information
        for event in person.events:
            if event.event_type == "DEAT":
                death_str = "Death: "
                if event.event_date:
                    death_str += f"{event.event_date}"
                if event.place:
                    death_str += f" in {event.place}"
                details.append(death_str)
                break

        # Parents
        parents = []
        for family in person.families_as_child:
            if family.spouse1:
                parents.append(f"{family.spouse1.first_name} {family.spouse1.last_name}")
            if family.spouse2:
                parents.append(f"{family.spouse2.first_name} {family.spouse2.last_name}")

        if parents:
            details.append(f"Parents: {', '.join(parents)}")

        # Spouses
        spouses = []
        for family in person.families_as_spouse + person.families_as_spouse2:
            if family.spouse1_id == person_id and family.spouse2:
                spouses.append(f"{family.spouse2.first_name} {family.spouse2.last_name}")
            elif family.spouse2_id == person_id and family.spouse1:
                spouses.append(f"{family.spouse1.first_name} {family.spouse1.last_name}")

        if spouses:
            details.append(f"Spouse(s): {', '.join(spouses)}")

        # Children
        children = []
        seen_child_ids = set()
        for family in person.families_as_spouse + person.families_as_spouse2:
            for child in family.children:
                if child.id not in seen_child_ids:
                    seen_child_ids.add(child.id)
                    children.append(f"{child.first_name} {child.last_name}")

        if children:
            details.append(f"Children: {', '.join(children)}")

        return "\n".join(details)
    finally:
        db.close()


@mcp.tool()
def get_siblings(person_id: int) -> str:
    """Get all siblings of a person (people who share the same parents).

    Args:
        person_id: The database ID of the person

    Returns:
        A formatted string listing the person's siblings
    """
    db = SessionLocal()
    try:
        person = db.query(Individual).filter(Individual.id == person_id).first()

        if not person:
            return f"No person found with ID {person_id}."

        siblings = []
        seen_sibling_ids = set()

        # Get all families where this person is a child
        for family in person.families_as_child:
            # Get all children in this family
            for child in family.children:
                if child.id != person_id and child.id not in seen_sibling_ids:
                    seen_sibling_ids.add(child.id)
                    birth_year = ""
                    for event in child.events:
                        if event.event_type == "BIRT" and event.event_date:
                            birth_year = f" (born {event.event_date.year})"
                            break
                    siblings.append(f"{child.first_name} {child.last_name}{birth_year}")

        if not siblings:
            return f"{person.first_name} {person.last_name} has no recorded siblings."

        return f"{person.first_name} {person.last_name} has {len(siblings)} sibling(s):\n" + "\n".join(siblings)
    finally:
        db.close()


@mcp.tool()
def search_by_birth_location(location: str) -> str:
    """Find all people born in a specific location.

    Args:
        location: The birth location to search for (partial matches allowed)

    Returns:
        A formatted string listing people born in that location
    """
    db = SessionLocal()
    try:
        birth_events = db.query(Event).filter(
            Event.event_type == "BIRT",
            func.lower(Event.place).like(f"%{location.lower()}%")
        ).all()

        if not birth_events:
            return f"No births found in location matching '{location}'."

        results = []
        for event in birth_events:
            for person in event.individuals:
                birth_str = f"{person.first_name} {person.last_name}"
                if event.event_date:
                    birth_str += f" (born {event.event_date})"
                birth_str += f" in {event.place}"
                results.append(birth_str)

        return f"Found {len(results)} person(s) born in locations matching '{location}':\n" + "\n".join(results)
    finally:
        db.close()


@mcp.tool()
def get_birth_date(person_id: int) -> str:
    """Get the birth date of a person by their ID.

    Args:
        person_id: The database ID of the person

    Returns:
        The birth date and location if available
    """
    db = SessionLocal()
    try:
        person = db.query(Individual).filter(Individual.id == person_id).first()

        if not person:
            return f"No person found with ID {person_id}."

        for event in person.events:
            if event.event_type == "BIRT":
                birth_str = f"{person.first_name} {person.last_name} was born"
                if event.event_date:
                    birth_str += f" on {event.event_date}"
                if event.place:
                    birth_str += f" in {event.place}"
                return birth_str + "."

        return f"No birth date recorded for {person.first_name} {person.last_name}."
    finally:
        db.close()


@mcp.tool()
def list_all_people() -> str:
    """List all people in the genealogy database with their IDs.

    Returns:
        A formatted string listing all people
    """
    db = SessionLocal()
    try:
        people = db.query(Individual).all()

        if not people:
            return "No people found in the database."

        results = []
        for person in people:
            birth_year = ""
            for event in person.events:
                if event.event_type == "BIRT" and event.event_date:
                    birth_year = f" (b. {event.event_date.year})"
                    break

            results.append(f"ID: {person.id} - {person.first_name} {person.last_name}{birth_year}")

        return f"Total people in database: {len(people)}\n" + "\n".join(results[:50]) + (
            f"\n... and {len(people) - 50} more" if len(people) > 50 else ""
        )
    finally:
        db.close()


# Get the FastMCP app to mount in main.py
# The router variable will be used by main.py to access the mcp instance
