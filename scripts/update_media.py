#!/usr/bin/env python3
"""
Update media metadata and tagged individuals.

Usage:
    python update_media.py <media_id> [--description "New description"] [--date YYYY-MM-DD] [--tags ID1,ID2,ID3]

Examples:
    python update_media.py 1 --description "Updated description"
    python update_media.py 2 --date "1985-07-15"
    python update_media.py 3 --tags 1,2,3
    python update_media.py 4 --description "Family photo" --date "1990-01-01" --tags 5,6,7
"""

import sys
import argparse
import requests

API_BASE_URL = "http://localhost:8001/api"


def update_media(media_id, description=None, media_date=None, individual_ids=None):
    """
    Update media metadata.

    Args:
        media_id: ID of the media to update
        description: New description (optional)
        media_date: New date in YYYY-MM-DD format (optional)
        individual_ids: List of person IDs to tag (optional)

    Returns:
        Response data from the API
    """
    url = f"{API_BASE_URL}/media/{media_id}"

    # First, get current media data
    get_response = requests.get(f"{API_BASE_URL}/media")
    get_response.raise_for_status()
    media_list = get_response.json()

    current_media = None
    for media in media_list:
        if media['id'] == media_id:
            current_media = media
            break

    if not current_media:
        raise ValueError(f"Media with ID {media_id} not found")

    # Prepare update data (use current values if not provided)
    update_data = {
        "description": description if description is not None else current_media.get('description', ''),
        "media_date": media_date if media_date is not None else current_media.get('media_date'),
        "individual_ids": individual_ids if individual_ids is not None else [p['id'] for p in current_media.get('tagged_individuals', [])]
    }

    print(f"Updating media ID {media_id}...")
    response = requests.put(url, json=update_data)
    response.raise_for_status()

    result = response.json()
    print(f"✓ Update successful!")
    print(f"  Filename: {result['filename']}")
    print(f"  Description: {result['description']}")
    print(f"  Date: {result['media_date'] or 'Not specified'}")
    print(f"  Tagged individuals: {result['tagged_count']}")

    return result


def main():
    parser = argparse.ArgumentParser(description="Update media metadata")
    parser.add_argument("media_id", type=int, help="ID of the media to update")
    parser.add_argument("--description", type=str, help="New description")
    parser.add_argument("--date", type=str, help="New date (YYYY-MM-DD)")
    parser.add_argument("--tags", type=str, help="Comma-separated person IDs (e.g., 1,2,3)")

    args = parser.parse_args()

    individual_ids = None
    if args.tags:
        individual_ids = [int(id.strip()) for id in args.tags.split(',')]

    try:
        update_media(args.media_id, args.description, args.date, individual_ids)
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"✗ Error: Media with ID {args.media_id} not found")
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
