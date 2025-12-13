#!/usr/bin/env python3
"""
Upload a media file (JPG, PNG, PDF, etc.) to Yggdrasil API.

Usage:
    python upload_media.py <file_path> [description] [date]

Examples:
    python upload_media.py photo.jpg "Family reunion" "1985-07-15"
    python upload_media.py document.pdf "Birth certificate"
    python upload_media.py scan.png
"""

import json
import sys
import requests
from pathlib import Path

API_BASE_URL = "http://localhost:8001/api"


def upload_media(file_path, description="", media_date=""):
    """
    Upload a media file to the API.

    Args:
        file_path: Path to the media file
        description: Optional description
        media_date: Optional date in YYYY-MM-DD format

    Returns:
        Response data from the API
    """
    url = f"{API_BASE_URL}/media/upload"

    # Prepare metadata
    metadata = {
        "description": description,
        "media_date": media_date if media_date else None,
        "individual_ids": []
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
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    file_path = sys.argv[1]
    description = sys.argv[2] if len(sys.argv) > 2 else ""
    media_date = sys.argv[3] if len(sys.argv) > 3 else ""

    try:
        upload_media(file_path, description, media_date)
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to API at", API_BASE_URL)
        print("  Make sure the Yggdrasil API is running (docker compose up)")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
