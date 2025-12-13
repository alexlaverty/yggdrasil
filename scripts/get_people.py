#!/usr/bin/env python3
"""
Get a list of all people in the database.

Usage:
    python get_people.py [--json]

Examples:
    python get_people.py
    python get_people.py --json
"""

import sys
import json
import requests

API_BASE_URL = "http://localhost:8001/api"


def get_people():
    """
    Retrieve all people from the API.

    Returns:
        List of people with basic information
    """
    url = f"{API_BASE_URL}/people"

    print("Fetching people...")
    response = requests.get(url)
    response.raise_for_status()

    people = response.json()
    return people


def display_people(people):
    """Display people list in a formatted way."""
    if not people:
        print("No people found in the database.")
        return

    print(f"\nFound {len(people)} person/people:\n")

    for person in people:
        name = f"{person['first_name']} {person['last_name']}"
        sex = f"({person['sex']})" if person.get('sex') else ""
        birth = f"b. {person['birth_year']}" if person.get('birth_year') else ""

        print(f"ID {person['id']}: {name} {sex} {birth}")


def main():
    output_json = "--json" in sys.argv

    try:
        people = get_people()

        if output_json:
            print(json.dumps(people, indent=2))
        else:
            display_people(people)

    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to API at", API_BASE_URL)
        print("  Make sure the Yggdrasil API is running (docker compose up)")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
