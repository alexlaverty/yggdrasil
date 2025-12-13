#!/usr/bin/env python3
"""
Upload a media file and tag specific individuals.

Usage:
    python upload_media_with_tags.py <file_path> <description> <date> <person_id1> [person_id2] [person_id3] ...

Examples:
    python upload_media_with_tags.py wedding.jpg "Wedding photo" "1950-06-20" 1 2
    python upload_media_with_tags.py family.jpg "Family reunion" "1985-07-15" 1 2 3 4 5
    python upload_media_with_tags.py portrait.png "John's portrait" "1940-01-01" 7
"""

import json
import sys
import requests
from pathlib import Path

API_BASE_URL = "http://localhost:8001/api"


def upload_media_with_tags(file_path, description, media_date, individual_ids):
    """
    Upload a media file and tag individuals.

    Args:
        file_path: Path to the media file
        description: Description of the media
        media_date: Date in YYYY-MM-DD format
        individual_ids: List of person IDs to tag

    Returns:
        Response data from the API
    """
    url = f"{API_BASE_URL}/media/upload"

    # Prepare metadata
    metadata = {
        "description": description,
        "media_date": media_date,
        "individual_ids": individual_ids
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
        print(f"  Tagging {len(individual_ids)} individual(s): {individual_ids}")
        response = requests.post(url, files=files, data=data)
        response.raise_for_status()

        result = response.json()
        print(f"✓ Upload successful!")
        print(f"  ID: {result['id']}")
        print(f"  Filename: {result['filename']}")
        print(f"  Type: {result['media_type']}")
        print(f"  Size: {result['file_size']:,} bytes")

        return result


def main():
    if len(sys.argv) < 5:
        print(__doc__)
        sys.exit(1)

    file_path = sys.argv[1]
    description = sys.argv[2]
    media_date = sys.argv[3]
    individual_ids = [int(id) for id in sys.argv[4:]]

    try:
        upload_media_with_tags(file_path, description, media_date, individual_ids)
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to API at", API_BASE_URL)
        print("  Make sure the Yggdrasil API is running (docker compose up)")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
