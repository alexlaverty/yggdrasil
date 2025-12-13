#!/usr/bin/env python3
"""
Upload a media file linked to a specific event.

When linking to an event, the media is automatically tagged with all individuals
associated with that event (e.g., all people in a marriage or the person for a birth/death).

Usage:
    python upload_media_to_event.py <file_path> <description> <date> <event_id>

Examples:
    python upload_media_to_event.py wedding_cert.pdf "Marriage certificate" "1950-06-20" 5
    python upload_media_to_event.py birth_cert.jpg "Birth certificate" "1945-03-15" 12
"""

import json
import sys
import requests
from pathlib import Path

API_BASE_URL = "http://localhost:8001/api"


def upload_media_to_event(file_path, description, media_date, event_id):
    """
    Upload a media file linked to an event.

    Args:
        file_path: Path to the media file
        description: Description of the media
        media_date: Date in YYYY-MM-DD format
        event_id: ID of the event to link to

    Returns:
        Response data from the API
    """
    url = f"{API_BASE_URL}/media/upload"

    # Prepare metadata with event_id
    metadata = {
        "description": description,
        "media_date": media_date,
        "event_id": event_id,
        "individual_ids": []  # Will be auto-populated from event
    }

    # Open and upload the file
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, "rb") as f:
        files = {
            "file": (file_path.name, f, "application/octet-stream")
        }
        data = {
            "metadata": json.dumps(metadata)
        }

        print(f"Uploading {file_path.name}...")
        print(f"  Linking to event ID: {event_id}")
        response = requests.post(url, files=files, data=data)
        response.raise_for_status()

        result = response.json()
        print(f"✓ Upload successful!")
        print(f"  ID: {result['id']}")
        print(f"  Filename: {result['filename']}")
        print(f"  Type: {result['media_type']}")
        print(f"  Size: {result['file_size']:,} bytes")
        print(f"  Linked to event: {event_id}")

        return result


def main():
    if len(sys.argv) < 5:
        print(__doc__)
        sys.exit(1)

    file_path = sys.argv[1]
    description = sys.argv[2]
    media_date = sys.argv[3]
    event_id = int(sys.argv[4])

    try:
        upload_media_to_event(file_path, description, media_date, event_id)
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to API at", API_BASE_URL)
        print("  Make sure the Yggdrasil API is running (docker compose up)")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
