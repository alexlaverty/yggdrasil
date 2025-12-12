# Yggdrasil

A self-hosted family history and genealogy application. Import GEDCOM files, explore your family tree, upload documents and photos, and visualize your ancestry.

## Features

### GEDCOM Import
- Upload and parse standard GEDCOM genealogy files
- Automatic extraction of individuals, families, and relationships
- Support for birth, death, burial, and marriage events
- Source and note preservation

### Family Tree Browsing
- View all individuals sorted by birth year
- Detailed person profiles with life events
- Family relationships: spouses, children, parents
- Navigate between related individuals

### Events & Places
- Browse births, deaths, burials, and marriages
- View all unique places from your family history
- See all events and people associated with each place
- Interactive map visualization with geocoded locations

### Media Management
- Upload photos and documents linked to individuals
- Bulk media upload support
- Tag multiple people in a single image
- Set profile pictures for individuals

### Document Processing
- OCR text extraction from images (JPG, PNG, etc.)
- PDF text extraction
- DOCX/DOC document text extraction
- Searchable extracted text stored with media

### Data Management
- Backup and restore functionality
- Database export/import

### MCP Server

Yggdrasil exposes a Model Context Protocol (MCP) server that allows AI agents (such as Roo Code) to query and explore the genealogy database using natural language tools.

The MCP server is implemented using FastMCP and runs alongside the FastAPI backend.

Roo Code MCP Config :

```
{
  "mcpServers": {
    "yggdrasil-genealogy": {
      "url": "http://localhost:8001/mcp/sse",
      "transport": "sse",
      "alwaysAllow": []
    }
  }
}
```

## Tech Stack

### Backend
- **Python 3.11** - Core language
- **FastAPI** - REST API framework
- **SQLAlchemy 2.0** - ORM and database toolkit
- **PostgreSQL 15** - Relational database
- **Redis 7** - Caching layer
- **MinIO** - S3-compatible object storage for files
- **python-gedcom** - GEDCOM file parsing
- **pytesseract** - OCR for image text extraction
- **pdfplumber** - PDF text extraction
- **python-docx** - Word document processing

### Frontend
- **React 18** - UI framework
- **React Router 6** - Client-side routing
- **Axios** - HTTP client
- **Leaflet / React-Leaflet** - Interactive maps
- **Mermaid** - Diagram rendering

### Infrastructure
- **Docker & Docker Compose** - Container orchestration
- **pytest** - Testing framework

## Getting Started

### Prerequisites
- Docker and Docker Compose installed
- (Optional) A GEDCOM file to import

### Running the Application

Start all services:

```bash
docker compose up --build
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8001
- **MinIO Console**: http://localhost:9001

### Stopping the Application

Stop services and preserve data:
```bash
docker compose down
```

Stop services and remove all data:
```bash
docker compose down --volumes
```

## Running Tests

Run the full test suite with a clean environment:

```bash
./run_tests.sh
```

This script will:
1. Stop any running containers and remove volumes
2. Build and start fresh services
3. Wait for the API to be ready
4. Run pytest integration tests
5. Verify GEDCOM upload functionality

To run tests manually (with services already running):

```bash
pytest tests/
```

## Usage

1. **Upload a GEDCOM file**: Navigate to the Upload page and select your `.ged` file
2. **Browse People**: View all individuals in your family tree
3. **Explore Relationships**: Click on any person to see their profile, family members, and life events
4. **View Events**: Browse births, deaths, marriages, and burials
5. **Explore Places**: See all locations mentioned in your family history
6. **Upload Media**: Add photos and documents, tag individuals, and extract text from documents

## Configuration

Environment variables can be set in a `.env` file or directly in `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | ancestry | Database name |
| `POSTGRES_USER` | ancestry | Database user |
| `POSTGRES_PASSWORD` | ancestry_password | Database password |
| `MINIO_ROOT_USER` | minioadmin | MinIO access key |
| `MINIO_ROOT_PASSWORD` | minioadmin123 | MinIO secret key |

## Project Structure

```
yggdrasil/
  backend/
       main.py           # FastAPI application entry point
       models.py         # SQLAlchemy ORM models
       database.py       # Database connection setup
       routers/          # API route handlers
       schemas/          # Pydantic request/response schemas
        services/         # Business logic (GEDCOM parsing, OCR, etc.)
  frontend/
       src/
            components/   # React components
              App.js        # Main application with routing
         public/
  tests/                # Integration tests
  data/                 # Sample GEDCOM files
  docker-compose.yml    # Service orchestration
    run_tests.sh          # Test runner script
```

## License

See LICENSE file for details.
