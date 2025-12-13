#!/usr/bin/env python3
"""
Get a list of all uploaded media files.

Usage:
    python get_media_list.py

Optional flags:
    --json    Output raw JSON
"""

import sys
import json
import requests

API_BASE_URL = "http://localhost:8001/api"


def get_media_list():
    """
    Retrieve all media files from the API.

    Returns:
        List of media files with metadata
    """
    url = f"{API_BASE_URL}/media"

    print("Fetching media list...")
    response = requests.get(url)
    response.raise_for_status()

    media_list = response.json()
    return media_list


def display_media(media_list):
    """Display media list in a formatted way."""
    if not media_list:
        print("No media files found.")
        return

    print(f"\nFound {len(media_list)} media file(s):\n")

    for media in media_list:
        print(f"ID: {media['id']}")
        print(f"  Filename: {media['filename']}")
        print(f"  Type: {media['media_type']}")
        print(f"  Size: {media['file_size']:,} bytes" if media['file_size'] else "  Size: Unknown")
        print(f"  Date: {media['media_date'] or 'Not specified'}")
        print(f"  Description: {media['description'] or 'None'}")

        if media['tagged_individuals']:
            names = [person['name'] for person in media['tagged_individuals']]
            print(f"  Tagged: {', '.join(names)}")
        else:
            print(f"  Tagged: None")

        if media['tagged_events']:
            events = [f"{e['event_type']} ({e['event_date'] or 'no date'})"
                     for e in media['tagged_events']]
            print(f"  Events: {', '.join(events)}")

        if media.get('extracted_text'):
            text_preview = media['extracted_text'][:100].replace('\n', ' ')
            print(f"  Extracted text: {text_preview}...")

        print()


def main():
    output_json = "--json" in sys.argv

    try:
        media_list = get_media_list()

        if output_json:
            print(json.dumps(media_list, indent=2))
        else:
            display_media(media_list)

    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to API at", API_BASE_URL)
        print("  Make sure the Yggdrasil API is running (docker compose up)")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
