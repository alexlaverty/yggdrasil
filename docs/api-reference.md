# Yggdrasil API Reference

This document provides a complete reference for the Yggdrasil REST API. All endpoints are prefixed with `/api`.

**Base URL:** `http://localhost:8001/api`

## Table of Contents

- [People](#people)
- [Families](#families)
- [Events](#events)
- [Media](#media)
- [Places](#places)
- [Map & Geocoding](#map--geocoding)
- [GEDCOM Import/Export](#gedcom-importexport)
- [Backup & Restore](#backup--restore)
- [Navigation](#navigation)

---

## People

### Get All People

```
GET /people
```

Returns a list of all individuals sorted by birth year (newest first).

**Response:**
```json
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Smith",
    "sex": "M",
    "birth_year": 1985,
    "profile_image_id": 5
  }
]
```

**Example:**
```bash
curl http://localhost:8001/api/people
```

---

### Get Person Details

```
GET /people/{person_id}
```

Returns detailed information about a specific person including events, relationships, and media.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| person_id | integer | The ID of the person |

**Response:**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Smith",
  "sex": "M",
  "gedcom_id": "@I1@",
  "profile_image_id": 5,
  "births": [
    {"date": "1985-03-15", "place": "New York, NY"}
  ],
  "deaths": [],
  "marriages": [
    {"date": "2010-06-20", "place": "Boston, MA", "spouse": "Jane Doe"}
  ],
  "spouses": [
    {"id": 2, "name": "Jane Doe", "sex": "F"}
  ],
  "children": [
    {"id": 3, "name": "Jimmy Smith", "sex": "M"}
  ],
  "parents": [
    {"id": 4, "name": "Robert Smith", "sex": "M"},
    {"id": 5, "name": "Mary Smith", "sex": "F"}
  ],
  "media": [
    {
      "id": 1,
      "filename": "family_photo.jpg",
      "media_type": "image",
      "file_size": 1024000,
      "media_date": "2020-12-25",
      "description": "Christmas 2020"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:8001/api/people/1
```

---

### Create Person

```
POST /people
```

Creates a new person with optional birth and death events.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "sex": "M",
  "birth_date": "1985-03-15",
  "birth_place": "New York, NY",
  "death_date": null,
  "death_place": null
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| first_name | string | Yes | First name |
| last_name | string | Yes | Last name |
| sex | string | No | "M" or "F" |
| birth_date | string | No | Format: YYYY-MM-DD |
| birth_place | string | No | Birth location |
| death_date | string | No | Format: YYYY-MM-DD |
| death_place | string | No | Death location |

**Response:**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Smith",
  "sex": "M",
  "message": "Person created successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/people \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Smith",
    "sex": "M",
    "birth_date": "1985-03-15",
    "birth_place": "New York, NY"
  }'
```

---

### Update Person

```
PUT /people/{person_id}
```

Updates an existing person's information.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| person_id | integer | The ID of the person |

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "sex": "M",
  "profile_image_id": 5,
  "birth_date": "1985-03-15",
  "birth_place": "New York, NY",
  "death_date": "2050-01-01",
  "death_place": "Los Angeles, CA",
  "burial_date": "2050-01-05",
  "burial_place": "Los Angeles Cemetery"
}
```

All fields are optional. Only provided fields will be updated.

**Response:**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Smith",
  "sex": "M",
  "profile_image_id": 5,
  "message": "Person updated successfully"
}
```

**Example:**
```bash
curl -X PUT http://localhost:8001/api/people/1 \
  -H "Content-Type: application/json" \
  -d '{
    "death_date": "2050-01-01",
    "death_place": "Los Angeles, CA"
  }'
```

---

### Upload Profile Image

```
POST /people/{person_id}/profile-image
```

Uploads a profile image for a person.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| person_id | integer | The ID of the person |

**Request:** Multipart form data with `file` field

**Response:**
```json
{
  "id": 5,
  "filename": "profile.jpg",
  "message": "Profile image uploaded successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/people/1/profile-image \
  -F "file=@profile.jpg"
```

---

### Add Parent

```
POST /people/{person_id}/add-parent
```

Adds a parent relationship to a person.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| person_id | integer | The ID of the child |

**Request Body:**
```json
{
  "related_person_id": 4
}
```

**Response:**
```json
{
  "message": "Successfully added Robert Smith as parent of John Smith"
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/people/1/add-parent \
  -H "Content-Type: application/json" \
  -d '{"related_person_id": 4}'
```

---

### Add Child

```
POST /people/{person_id}/add-child
```

Adds a child relationship to a person.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| person_id | integer | The ID of the parent |

**Request Body:**
```json
{
  "related_person_id": 3
}
```

**Response:**
```json
{
  "message": "Successfully added Jimmy Smith as child of John Smith"
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/people/1/add-child \
  -H "Content-Type: application/json" \
  -d '{"related_person_id": 3}'
```

---

## Families

### Get All Families

```
GET /families
```

Returns all families sorted by male spouse's birth year (newest first).

**Response:**
```json
[
  {
    "id": 1,
    "gedcom_id": "@F1@",
    "spouse1_name": "John Smith",
    "spouse2_name": "Jane Doe",
    "spouse1_id": 1,
    "spouse2_id": 2,
    "children_count": 3,
    "male_birth_year": 1985
  }
]
```

**Example:**
```bash
curl http://localhost:8001/api/families
```

---

### Get Family Details

```
GET /families/{family_id}
```

Returns detailed information about a specific family.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| family_id | integer | The ID of the family |

**Response:**
```json
{
  "id": 1,
  "gedcom_id": "@F1@",
  "spouse1": {
    "id": 1,
    "first_name": "John",
    "last_name": "Smith",
    "sex": "M"
  },
  "spouse2": {
    "id": 2,
    "first_name": "Jane",
    "last_name": "Doe",
    "sex": "F"
  },
  "children": [
    {
      "id": 3,
      "first_name": "Jimmy",
      "last_name": "Smith",
      "sex": "M",
      "birth_year": 2012
    }
  ],
  "marriages": [
    {"id": 10, "date": "2010-06-20", "place": "Boston, MA"}
  ],
  "media": []
}
```

**Example:**
```bash
curl http://localhost:8001/api/families/1
```

---

## Events

### Get Births

```
GET /births
```

Returns all birth events.

**Response:**
```json
[
  {
    "id": 1,
    "individual": "John Smith",
    "date": "1985-03-15",
    "place": "New York, NY"
  }
]
```

**Example:**
```bash
curl http://localhost:8001/api/births
```

---

### Get Deaths

```
GET /deaths
```

Returns all death events.

**Response:**
```json
[
  {
    "id": 2,
    "individual": "Robert Smith",
    "date": "2020-05-10",
    "place": "Miami, FL"
  }
]
```

**Example:**
```bash
curl http://localhost:8001/api/deaths
```

---

### Get Burials

```
GET /burials
```

Returns all burial events.

**Response:**
```json
[
  {
    "id": 3,
    "individual": "Robert Smith",
    "date": "2020-05-15",
    "place": "Miami Cemetery"
  }
]
```

**Example:**
```bash
curl http://localhost:8001/api/burials
```

---

### Get Marriages

```
GET /marriages
```

Returns all marriage events sorted by male's birth year (newest first).

**Response:**
```json
[
  {
    "id": 10,
    "family": "John Smith and Jane Doe",
    "date": "2010-06-20",
    "place": "Boston, MA",
    "male_birth_year": 1985
  }
]
```

**Example:**
```bash
curl http://localhost:8001/api/marriages
```

---

### Get Event Details

```
GET /events/{event_id}
```

Returns detailed information about a specific event.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| event_id | integer | The ID of the event |

**Response:**
```json
{
  "event": {
    "id": 10,
    "date": "2010-06-20",
    "place": "Boston, MA",
    "description": null
  },
  "individuals": [
    {"id": 1, "first_name": "John", "last_name": "Smith", "sex": "M"}
  ],
  "families": [
    {
      "id": 1,
      "spouse1": {"id": 1, "first_name": "John", "last_name": "Smith", "sex": "M"},
      "spouse2": {"id": 2, "first_name": "Jane", "last_name": "Doe", "sex": "F"}
    }
  ],
  "media": []
}
```

**Example:**
```bash
curl http://localhost:8001/api/events/10
```

---

## Media

### Upload Media

```
POST /media/upload
```

Uploads a media file (image, video, or document) with metadata.

**Request:** Multipart form data

| Field | Type | Description |
|-------|------|-------------|
| file | file | The media file |
| metadata | JSON string | Metadata object |

**Metadata Object:**
```json
{
  "media_date": "2020-12-25",
  "description": "Christmas 2020",
  "event_id": 10,
  "individual_ids": [1, 2, 3]
}
```

**Response:**
```json
{
  "id": 1,
  "filename": "family_photo.jpg",
  "media_type": "image",
  "file_size": 1024000,
  "message": "Media uploaded successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/media/upload \
  -F "file=@photo.jpg" \
  -F 'metadata={"media_date": "2020-12-25", "description": "Christmas", "individual_ids": [1, 2]}'
```

---

### Get All Media

```
GET /media
```

Returns all media files with tagged individuals and events.

**Response:**
```json
[
  {
    "id": 1,
    "filename": "family_photo.jpg",
    "media_type": "image",
    "file_size": 1024000,
    "media_date": "2020-12-25",
    "description": "Christmas 2020",
    "extracted_text": null,
    "tagged_individuals": [
      {"id": 1, "name": "John Smith"},
      {"id": 2, "name": "Jane Smith"}
    ],
    "tagged_events": [
      {"id": 10, "event_type": "MARR", "event_date": "2010-06-20", "place": "Boston, MA"}
    ],
    "created_at": "2024-01-15T10:30:00"
  }
]
```

**Example:**
```bash
curl http://localhost:8001/api/media
```

---

### Get Media File

```
GET /media/{media_id}/file
```

Returns the actual media file content.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| media_id | integer | The ID of the media |

**Response:** Binary file content with appropriate Content-Type header

**Example:**
```bash
curl http://localhost:8001/api/media/1/file --output photo.jpg
```

---

### Get Media Thumbnail

```
GET /media/{media_id}/thumbnail
```

Returns a thumbnail version of the media (for images).

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| media_id | integer | The ID of the media |

**Response:** Binary thumbnail image

**Example:**
```bash
curl http://localhost:8001/api/media/1/thumbnail --output thumb.jpg
```

---

### Get Presigned URL

```
GET /media/{media_id}/url
```

Returns a presigned URL for direct MinIO access (faster, bypasses API).

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| media_id | integer | The ID of the media |

**Response:**
```json
{
  "url": "http://localhost:9000/media/...",
  "expires_in": "24 hours"
}
```

**Example:**
```bash
curl http://localhost:8001/api/media/1/url
```

---

### Update Media

```
PUT /media/{media_id}
```

Updates media metadata and tagged individuals.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| media_id | integer | The ID of the media |

**Request Body:**
```json
{
  "media_date": "2020-12-25",
  "description": "Updated description",
  "individual_ids": [1, 2, 3]
}
```

**Response:**
```json
{
  "id": 1,
  "filename": "family_photo.jpg",
  "media_date": "2020-12-25",
  "description": "Updated description",
  "tagged_count": 3,
  "message": "Media updated successfully"
}
```

**Example:**
```bash
curl -X PUT http://localhost:8001/api/media/1 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "individual_ids": [1, 2, 3]
  }'
```

---

### Extract Text from Media

```
POST /media/{media_id}/extract-text
```

Extracts text from documents (PDF, DOCX) or images (OCR).

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| media_id | integer | The ID of the media |

**Response:**
```json
{
  "id": 1,
  "filename": "document.pdf",
  "extracted_text": "This is the extracted text content...",
  "text_length": 1500,
  "message": "Text extracted successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/media/1/extract-text
```

---

## Places

### Get All Places

```
GET /places
```

Returns all unique places from events with occurrence counts.

**Response:**
```json
[
  {"name": "Boston, MA", "count": 5},
  {"name": "New York, NY", "count": 12}
]
```

**Example:**
```bash
curl http://localhost:8001/api/places
```

---

### Get Place Details

```
GET /places/{place_name}
```

Returns all events and people associated with a specific place.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| place_name | string | The name of the place (URL encoded) |

**Response:**
```json
{
  "place_name": "New York, NY",
  "event_count": 12,
  "people_count": 8,
  "births": [
    {
      "id": 1,
      "date": "1985-03-15",
      "place": "New York, NY",
      "individual_id": 1,
      "individual_name": "John Smith"
    }
  ],
  "deaths": [],
  "marriages": [],
  "people": [
    {"id": 1, "name": "John Smith", "sex": "M"}
  ]
}
```

**Example:**
```bash
curl "http://localhost:8001/api/places/New%20York%2C%20NY"
```

---

## Map & Geocoding

### Get Map Events

```
GET /map/events
```

Returns all events with geocoded coordinates for map display.

**Response:**
```json
[
  {
    "id": 1,
    "event_type": "BIRT",
    "date": "1985-03-15",
    "year": 1985,
    "place": "New York, NY",
    "name": "John Smith",
    "person_id": 1,
    "family_id": null,
    "lat": 40.7128,
    "lng": -74.0060
  }
]
```

**Example:**
```bash
curl http://localhost:8001/api/map/events
```

---

### Get Event Years

```
GET /map/years
```

Returns min/max years for timeline slider.

**Response:**
```json
{
  "min_year": 1850,
  "max_year": 2024,
  "years": [1850, 1852, 1875, ...]
}
```

**Example:**
```bash
curl http://localhost:8001/api/map/years
```

---

### Get Geocoding Stats

```
GET /map/places/stats
```

Returns geocoding statistics.

**Response:**
```json
{
  "total": 100,
  "success": 85,
  "failed": 10,
  "pending": 5,
  "unsynced": 0
}
```

**Example:**
```bash
curl http://localhost:8001/api/map/places/stats
```

---

### Sync Places

```
POST /map/places/sync
```

Syncs places from events to the Place table without geocoding.

**Response:**
```json
{
  "message": "Synced 15 new places",
  "new_places": 15,
  "stats": {
    "total": 100,
    "success": 85,
    "failed": 10,
    "pending": 20
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/map/places/sync
```

---

### Start Geocoding

```
POST /map/places/geocode
```

Starts geocoding all places using OpenStreetMap's Nominatim service.

**Request Body:**
```json
{
  "force": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| force | boolean | If true, re-geocode all places including previously failed ones |

**Response:**
```json
{
  "message": "Geocoding complete",
  "results": {
    "success": 50,
    "failed": 5,
    "new_places": 10
  },
  "stats": {
    "total": 100,
    "success": 90,
    "failed": 10,
    "pending": 0
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/map/places/geocode \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

---

### Get Geocoding Status

```
GET /map/places/geocode/status
```

Returns current geocoding progress.

**Response:**
```json
{
  "running": false,
  "progress": 0,
  "total": 0,
  "results": null
}
```

**Example:**
```bash
curl http://localhost:8001/api/map/places/geocode/status
```

---

### Get All Places (with coordinates)

```
GET /map/places
```

Returns all places with their geocoding status and coordinates.

**Response:**
```json
[
  {
    "id": 1,
    "name": "New York, NY",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "geocoded": 1
  }
]
```

**Example:**
```bash
curl http://localhost:8001/api/map/places
```

---

## GEDCOM Import/Export

### Upload GEDCOM

```
POST /upload
```

Uploads and imports a GEDCOM file.

**Request:** Multipart form data with `file` field

**Response:**
```json
{
  "message": "GEDCOM uploaded and parsed successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/upload \
  -F "file=@family-tree.ged"
```

---

### Export GEDCOM

```
GET /export-gedcom
```

Exports all data as a valid GEDCOM 5.5.1 file.

**Response:** GEDCOM file download (`.ged` file)

**Example:**
```bash
curl http://localhost:8001/api/export-gedcom --output family-tree.ged
```

---

## Backup & Restore

### Export Backup

```
GET /backup/export
```

Exports all data as a ZIP file containing JSON data and media files.

**Response:** ZIP file download

**Example:**
```bash
curl http://localhost:8001/api/backup/export --output backup.zip
```

---

### Import Backup

```
POST /backup/import
```

Imports data from a backup ZIP file. **Warning: This replaces ALL existing data.**

**Request:** Multipart form data with `file` field

**Response:**
```json
{
  "message": "Backup imported successfully",
  "imported": {
    "individuals": 150,
    "families": 45,
    "events": 300,
    "media": 25,
    "media_files": 25,
    "places": 80
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/backup/import \
  -F "file=@backup.zip"
```

---

### Get GitHub Config

```
GET /backup/github/config
```

Returns GitHub backup configuration from environment variables.

**Response:**
```json
{
  "repo": "username/family-tree-backup",
  "token": "",
  "branch": "main"
}
```

**Example:**
```bash
curl http://localhost:8001/api/backup/github/config
```

---

### Export to GitHub

```
POST /backup/github/export
```

Exports all data directly to a GitHub repository.

**Request Body:**
```json
{
  "repo": "username/family-tree-backup",
  "token": "ghp_xxxxxxxxxxxx",
  "branch": "main",
  "commit_message": "Yggdrasil backup"
}
```

**Response:**
```json
{
  "message": "Backup exported to GitHub successfully",
  "commit_sha": "abc123...",
  "branch": "main",
  "exported": {
    "individuals": 150,
    "families": 45,
    "events": 300,
    "media": 25,
    "media_files": 25,
    "places": 80
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/backup/github/export \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "username/family-tree-backup",
    "token": "ghp_xxxxxxxxxxxx",
    "branch": "main",
    "commit_message": "Weekly backup"
  }'
```

---

### Import from GitHub

```
POST /backup/github/import
```

Imports all data from a GitHub repository. **Warning: This replaces ALL existing data.**

**Request Body:**
```json
{
  "repo": "username/family-tree-backup",
  "token": "ghp_xxxxxxxxxxxx",
  "branch": "main"
}
```

**Response:**
```json
{
  "message": "Backup imported from GitHub successfully",
  "imported": {
    "individuals": 150,
    "families": 45,
    "events": 300,
    "media": 25,
    "media_files": 25,
    "places": 80
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8001/api/backup/github/import \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "username/family-tree-backup",
    "token": "ghp_xxxxxxxxxxxx",
    "branch": "main"
  }'
```

---

## Navigation

These endpoints provide navigation metadata for paginated views.

### Get People Navigation Info

```
GET /nav/people
```

**Response:**
```json
{
  "min_id": 1,
  "max_id": 150,
  "count": 150
}
```

---

### Get Media Navigation Info

```
GET /nav/media
```

**Response:**
```json
{
  "min_id": 1,
  "max_id": 25,
  "count": 25
}
```

---

### Get Events Navigation Info

```
GET /nav/events
```

**Response:**
```json
{
  "min_id": 1,
  "max_id": 300,
  "count": 300
}
```

---

### Get Families Navigation Info

```
GET /nav/families
```

**Response:**
```json
{
  "min_id": 1,
  "max_id": 45,
  "count": 45
}
```

---

## Error Responses

All endpoints return standard HTTP error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request body"
}
```

### 404 Not Found
```json
{
  "detail": "Person not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Error message describing the issue"
}
```

---

## Rate Limiting

The geocoding endpoint (`/map/places/geocode`) respects OpenStreetMap's Nominatim rate limit of 1 request per second. For large datasets, geocoding may take several minutes.

---

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible. For production deployments, consider adding authentication middleware.
