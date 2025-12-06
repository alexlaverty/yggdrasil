# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yggdrasil is a self-hosted family history and genealogy application with:
- **Backend**: FastAPI (Python 3.11) with SQLAlchemy ORM
- **Frontend**: React 18 with React Router
- **Database**: PostgreSQL 15
- **Storage**: MinIO for GEDCOM files and media
- **Cache**: Redis

The system imports GEDCOM genealogy files, stores family relationships in a relational database, and provides a web interface for browsing people, families, places, and events. It includes document/image upload with OCR text extraction capabilities.

## Development Commands

### Start the full application
```bash
docker compose up --build
```
- API available at: http://localhost:8001
- Frontend available at: http://localhost:3000
- MinIO console at: http://localhost:9001

### Stop and clean everything (including volumes)
```bash
docker compose down --volumes
```

### Run tests
```bash
./run_tests.sh
```
This script:
1. Rebuilds and starts all services with fresh volumes
2. Waits for API to be ready
3. Runs pytest integration tests
4. Verifies GEDCOM upload succeeded

### Run tests manually (requires services running)
```bash
pytest tests/
```

### Frontend development
```bash
cd frontend
npm start    # Development server on port 3000
npm build    # Production build
```

### Access backend container for debugging
```bash
docker compose exec api bash
```

### View logs
```bash
docker compose logs -f api      # Backend logs
docker compose logs -f frontend # Frontend logs
```

## Architecture

### Data Model
The application uses SQLAlchemy models in `backend/models.py`:

- **Individual**: People in the family tree (first_name, last_name, sex, gedcom_id)
- **Family**: Marriage/partnership units linking spouses and children
- **Event**: Life events (BIRT, DEAT, BURI, MARR) with dates and places
- **Media**: Uploaded files (images, documents) tagged to individuals
- **Source**: GEDCOM sources (not yet fully implemented)
- **Note**: GEDCOM notes (not yet fully implemented)

**Relationships**:
- Many-to-many between Individual and Event via `individual_event` table
- Many-to-many between Family and Event via `family_event` table
- Many-to-many between Individual and Family (children) via `child_in_family` table
- Family has two foreign keys to Individual for spouse1_id and spouse2_id
- Media has many-to-many relationship with Individual via `media_individual` table

### GEDCOM Import Flow
1. User uploads .ged file to `/api/upload` endpoint
2. File is stored in MinIO `gedcoms` bucket
3. Backend parses GEDCOM using python-gedcom library
4. Three-pass database insertion:
   - Pass 1: Create all Individual records, build `individual_map` (gedcom_id → DB record)
   - Pass 2: Create Family records, link spouses and children
   - Pass 3: Extract events (BIRT, DEAT, BURI) for individuals
   - Pass 4: Extract events (MARR) for families
5. Database is committed with full relational graph

### Media Upload & Text Extraction
1. User uploads media file to `/api/media/upload` with metadata (date, description, tagged individuals)
2. File is stored in MinIO `media` bucket with timestamped filename
3. Optional text extraction via `/api/media/{id}/extract-text`:
   - PDF: Uses pdfplumber
   - DOCX/DOC: Uses python-docx
   - Images (JPG, PNG, etc.): Uses pytesseract OCR
4. Extracted text is stored in `Media.extracted_text` field

### Frontend Structure
React app in `frontend/src/` with components:
- **People.js**: List of all individuals, sorted by birth year (newest first)
- **PersonProfile.js**: Detailed view of individual with births, deaths, marriages, spouses, children, parents, and media
- **Families.js**: List of all family units (spouse pairs)
- **Places.js**: List of all unique places from events
- **PlaceDetail.js**: Events and people associated with a specific place
- **Birth.js, Death.js, Burial.js, Marriage.js**: Event-specific list views
- **Upload.js**: GEDCOM file upload interface
- **MediaUpload.js**: Media file upload with tagging
- **MediaList.js**: Gallery of all uploaded media
- **MediaDetail.js**: View and edit media metadata, extract text

Navigation uses React Router with links in header nav.

### Database Initialization
The backend entrypoint script (`backend/entrypoint.sh`):
1. Waits for PostgreSQL to be ready
2. **Drops all existing tables** (fresh start on every container restart)
3. Creates tables from SQLAlchemy models
4. Starts FastAPI server with uvicorn

**Important**: The database is wiped clean every time the `api` container restarts. To preserve data, comment out `Base.metadata.drop_all(bind=engine)` in `entrypoint.sh`.

## Key Implementation Details

### Date Parsing
The GEDCOM parser accepts multiple date formats:
- Full: "DD Mon YYYY" (e.g., "15 Jan 1950")
- Month-Year: "Mon YYYY" (e.g., "Jan 1950")
- Year only: "YYYY" (e.g., "1950")

Formats are tried in order until one succeeds.

### Name Cleaning
GEDCOM names often have slashes around surnames (e.g., "John /Smith/"). The `clean_name()` function strips these before database insertion.

### Deduplication in Person Details
When retrieving person details, spouses, children, and parents are deduplicated using `seen_*_ids` sets to avoid showing the same person multiple times (which can happen due to multiple family relationships).

### API Response Sorting
- People: Sorted by birth year descending (youngest first, null dates at end)
- Families: Sorted by spouse1 name alphabetically
- Places: Sorted by name alphabetically

### Environment Variables
Backend expects:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`: MinIO credentials

See `docker-compose.yml` for default development values.

## Common Development Patterns

### Adding a New Event Type
1. No schema changes needed - `event_type` is a string column
2. Add parsing logic in `backend/main.py` upload endpoint (search for "BIRT", "DEAT", "BURI" examples)
3. Add API endpoint for retrieval (see `/births`, `/deaths`, `/burials`, `/marriages`)
4. Add frontend component and route in `App.js`

### Adding Fields to Models
1. Update model class in `backend/models.py`
2. Restart `api` container (database will be recreated automatically)
3. For production: Use Alembic migrations instead of drop/create

### Querying Relationships
SQLAlchemy relationships are configured for easy traversal:
```python
person.events  # All events for this person
person.families_as_spouse  # Families where person is spouse1
person.families_as_spouse2  # Families where person is spouse2
person.families_as_child  # Families where person is a child
family.children  # All children in this family
family.spouse1, family.spouse2  # Spouse individuals
```

### Frontend API Calls
All API calls use `axios` or `fetch` to `http://localhost:8001/api` (configured in `REACT_APP_API_URL`). CORS is enabled on backend for all origins in development.

## Testing

Integration tests in `tests/test_upload.py` verify:
1. GEDCOM upload succeeds
2. People are stored in database
3. Birth, death, and marriage events are stored with required fields

Tests assume a sample GEDCOM file exists at `data/family-tree.ged`.

The `run_tests.sh` script provides a clean test environment by wiping volumes before each run.
