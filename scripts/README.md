# Yggdrasil API Example Scripts

This folder contains Python scripts demonstrating how to use the Yggdrasil API endpoints.

## Prerequisites

```bash
pip install requests
```

## Configuration

By default, all scripts connect to `http://localhost:8001` (the API endpoint). Make sure the Yggdrasil API is running:

```bash
docker compose up
```

## Available Scripts

### Media Operations (Primary Focus)

1. **upload_media.py** - Upload media files (JPG, PNG, PDF, etc.) with metadata
2. **upload_media_with_tags.py** - Upload media and tag specific individuals
3. **upload_media_to_event.py** - Upload media linked to an event
4. **extract_text_from_media.py** - Extract text from uploaded media using OCR
5. **get_media_list.py** - List all uploaded media files
6. **update_media.py** - Update media metadata and tags

### GEDCOM Operations

7. **upload_gedcom.py** - Upload and import a GEDCOM file
8. **export_gedcom.py** - Export database to GEDCOM format

### People Operations

9. **get_people.py** - List all people in the database
10. **get_person_details.py** - Get detailed information about a person
11. **create_person.py** - Create a new person
12. **update_person.py** - Update person information
13. **upload_profile_image.py** - Upload a profile image for a person
14. **add_parent.py** - Add a parent relationship
15. **add_child.py** - Add a child relationship

### Family Operations

16. **get_families.py** - List all families
17. **get_family_details.py** - Get details about a specific family

### Event Operations

18. **get_births.py** - List all birth events
19. **get_deaths.py** - List all death events
20. **get_marriages.py** - List all marriage events
21. **get_event_details.py** - Get details about a specific event

### Place Operations

22. **get_places.py** - List all places
23. **get_place_details.py** - Get events and people for a specific place

## Usage Examples

### Upload a JPG image:
```bash
python scripts/upload_media.py /path/to/photo.jpg "Family reunion 1985" "1985-07-15"
```

### Upload and tag individuals:
```bash
python scripts/upload_media_with_tags.py /path/to/photo.jpg "Wedding photo" "1950-06-20" 1 2 3
```

### Extract text from a document:
```bash
python scripts/extract_text_from_media.py 1
```

### Upload a GEDCOM file:
```bash
python scripts/upload_gedcom.py /path/to/family-tree.ged
```

### Create a new person:
```bash
python scripts/create_person.py "John" "Doe" "M" "1950-01-15" "New York"
```

## API Base URL

All scripts use the base URL: `http://localhost:8001/api`

To change this, edit the `API_BASE_URL` variable in each script.
