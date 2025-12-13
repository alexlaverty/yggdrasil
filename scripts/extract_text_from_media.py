#!/usr/bin/env python3
"""
Extract text from uploaded media using OCR and document parsing.

Supported formats:
- PDF files (using pdfplumber)
- DOCX files (using python-docx)
- Images (JPG, PNG, etc.) (using pytesseract OCR)

Usage:
    python extract_text_from_media.py <media_id>

Examples:
    python extract_text_from_media.py 1
    python extract_text_from_media.py 42
"""

import sys
import requests

API_BASE_URL = "http://localhost:8001/api"


def extract_text(media_id):
    """
    Extract text from a media file.

    Args:
        media_id: ID of the media file

    Returns:
        Response data including extracted text
    """
    url = f"{API_BASE_URL}/media/{media_id}/extract-text"

    print(f"Extracting text from media ID {media_id}...")
    response = requests.post(url)
    response.raise_for_status()

    result = response.json()
    print(f"✓ Text extraction successful!")
    print(f"  Filename: {result['filename']}")
    print(f"  Text length: {result['text_length']} characters")
    print(f"\nExtracted text:")
    print("-" * 60)
    print(result['extracted_text'])
    print("-" * 60)

    return result


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    media_id = int(sys.argv[1])

    try:
        extract_text(media_id)
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"✗ Error: Media with ID {media_id} not found")
        elif e.response.status_code == 400:
            print(f"✗ Error: {e.response.json().get('detail', 'Bad request')}")
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
