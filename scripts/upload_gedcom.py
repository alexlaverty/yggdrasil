#!/usr/bin/env python3
"""
Upload and import a GEDCOM file to Yggdrasil.

Usage:
    python upload_gedcom.py <gedcom_file_path>

Examples:
    python upload_gedcom.py family-tree.ged
    python upload_gedcom.py /path/to/ancestry.ged
"""

import sys
import requests
from pathlib import Path

API_BASE_URL = "http://localhost:8001/api"


def upload_gedcom(file_path):
    """
    Upload a GEDCOM file to the API.

    Args:
        file_path: Path to the .ged file

    Returns:
        Response data from the API
    """
    url = f"{API_BASE_URL}/upload"

    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    if not file_path.suffix.lower() == '.ged':
        print(f"⚠ Warning: File does not have .ged extension")

    with open(file_path, "rb") as f:
        files = {
            "file": (file_path.name, f, "application/octet-stream")
        }

        print(f"Uploading GEDCOM file: {file_path.name}")
        print("This may take a while for large files...")
        response = requests.post(url, files=files, timeout=300)
        response.raise_for_status()

        result = response.json()
        print(f"✓ {result['message']}")

        return result


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    file_path = sys.argv[1]

    try:
        upload_gedcom(file_path)
        print("\nYou can now view the imported data at http://localhost:3000")
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to API at", API_BASE_URL)
        print("  Make sure the Yggdrasil API is running (docker compose up)")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print("✗ Error: Request timed out. The file might be too large.")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
