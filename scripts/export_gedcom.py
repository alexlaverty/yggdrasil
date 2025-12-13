#!/usr/bin/env python3
"""
Export the database to a GEDCOM file.

Usage:
    python export_gedcom.py [output_filename]

Examples:
    python export_gedcom.py
    python export_gedcom.py my_export.ged
"""

import sys
import requests
from datetime import datetime

API_BASE_URL = "http://localhost:8001/api"


def export_gedcom(output_filename=None):
    """
    Export database to GEDCOM format.

    Args:
        output_filename: Optional custom filename

    Returns:
        Path to the saved file
    """
    url = f"{API_BASE_URL}/export-gedcom"

    print("Exporting GEDCOM...")
    response = requests.get(url)
    response.raise_for_status()

    # Use provided filename or generate one
    if not output_filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"yggdrasil_export_{timestamp}.ged"

    # Save the file
    with open(output_filename, "wb") as f:
        f.write(response.content)

    print(f"✓ GEDCOM exported successfully!")
    print(f"  Saved to: {output_filename}")
    print(f"  Size: {len(response.content):,} bytes")

    return output_filename


def main():
    output_filename = sys.argv[1] if len(sys.argv) > 1 else None

    try:
        export_gedcom(output_filename)
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to API at", API_BASE_URL)
        print("  Make sure the Yggdrasil API is running (docker compose up)")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
