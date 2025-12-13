#!/usr/bin/env python3
"""
Get detailed information about a specific person.

Usage:
    python get_person_details.py <person_id> [--json]

Examples:
    python get_person_details.py 1
    python get_person_details.py 42 --json
"""

import sys
import json
import requests

API_BASE_URL = "http://localhost:8001/api"


def get_person_details(person_id):
    """
    Retrieve detailed information about a person.

    Args:
        person_id: ID of the person

    Returns:
        Detailed person data
    """
    url = f"{API_BASE_URL}/people/{person_id}"

    print(f"Fetching details for person ID {person_id}...")
    response = requests.get(url)
    response.raise_for_status()

    person = response.json()
    return person


def display_person(person):
    """Display person details in a formatted way."""
    name = f"{person['first_name']} {person['last_name']}"
    print(f"\n{name}")
    print("=" * len(name))

    if person.get('sex'):
        print(f"Sex: {person['sex']}")

    if person.get('gedcom_id'):
        print(f"GEDCOM ID: {person['gedcom_id']}")

    # Births
    if person.get('births'):
        print("\nBirths:")
        for birth in person['births']:
            date = birth.get('date') or "Unknown date"
            place = birth.get('place') or "Unknown place"
            print(f"  {date} in {place}")

    # Deaths
    if person.get('deaths'):
        print("\nDeaths:")
        for death in person['deaths']:
            date = death.get('date') or "Unknown date"
            place = death.get('place') or "Unknown place"
            print(f"  {date} in {place}")

    # Marriages
    if person.get('marriages'):
        print("\nMarriages:")
        for marriage in person['marriages']:
            date = marriage.get('date') or "Unknown date"
            place = marriage.get('place') or "Unknown place"
            spouse = marriage.get('spouse', 'Unknown')
            print(f"  {date} to {spouse} in {place}")

    # Spouses
    if person.get('spouses'):
        print("\nSpouses:")
        for spouse in person['spouses']:
            print(f"  ID {spouse['id']}: {spouse['name']} ({spouse.get('sex', '?')})")

    # Children
    if person.get('children'):
        print(f"\nChildren ({len(person['children'])}):")
        for child in person['children']:
            print(f"  ID {child['id']}: {child['name']} ({child.get('sex', '?')})")

    # Parents
    if person.get('parents'):
        print(f"\nParents:")
        for parent in person['parents']:
            print(f"  ID {parent['id']}: {parent['name']} ({parent.get('sex', '?')})")

    # Media
    if person.get('media'):
        print(f"\nMedia ({len(person['media'])}):")
        for media in person['media']:
            desc = media.get('description') or media['filename']
            date = media.get('media_date') or "no date"
            print(f"  ID {media['id']}: {desc} ({date})")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    person_id = int(sys.argv[1])
    output_json = "--json" in sys.argv

    try:
        person = get_person_details(person_id)

        if output_json:
            print(json.dumps(person, indent=2))
        else:
            display_person(person)

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"✗ Error: Person with ID {person_id} not found")
        else:
            print(f"✗ Error: {e}")
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to API at", API_BASE_URL)
        print("  Make sure the Yggdrasil API is running (docker compose up)")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
