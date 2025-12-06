# Ancestry App — Architecture, Design & Docker Compose

**Purpose:**
This document describes a production-ready architecture for a modern, open-source, self-hosted ancestry / family-tree platform with AI features (OCR, face recognition, LLM assistant), privacy controls, and scalable deployment using Docker Compose. It includes system components, data flows, security considerations, schema overview, LLM/OCR pipelines, and an opinionated `docker-compose.yml` that will get you started locally.

---

## Table of contents

1. Goals & non-goals
2. High-level architecture diagram (text)
3. Core components & responsibilities
4. Data model overview (high-level)
5. Processing pipelines

   * Document ingestion & OCR
   * Photo pipeline (face detection, clustering)
   * LLM enrichment & entity extraction
   * Auto-linking & matching
6. Authentication, authorization & privacy model
7. Storage strategy (objects vs metadata)
8. Search & indexing
9. Observability, monitoring & backups
10. Deployment & scaling notes
11. Security & compliance notes
12. Developer workflow
13. Docker Compose (opinionated) + explanation

---

## 1. Goals & non-goals

**Goals:**

* Self-hostable by technically-minded users (Docker Compose + optional k8s)
* Strong privacy controls: per-user / per-family sharing, private albums
* Automated linkage of documents to people using OCR + LLM + fuzzy+graph matching
* Scalable to hundreds of thousands of people and millions of media objects
* Extensible AI pipeline (swap models, local or hosted LLMs)

**Non-goals (v1):**

* Full multi-region distributed clustering (we provide patterns)
* Handling regulated medical data (out of scope unless user consents and follows laws)

---

## 2. High-level architecture (text diagram)

```
+------------+         +----------------------+        +-------------+
|   Browser  | <-----> |  Frontend (React)    | <----> | Backend API |
+------------+         +----------------------+        +-------------+
                                        |                    |
                                        |                    v
                                        |               +------------+
                                        |               | PostgreSQL |
                                        |               | (+ AGE)    |
                                        |               +------------+
                                        |                    |
                                        v                    v
                                 +----------------+    +-------------+
                                 |  Object Store  |    | Redis       |
                                 |   (MinIO)      |    | (Cache/Broker)|
                                 +----------------+    +-------------+
                                        |                    |
                       +----------------+                    |
                       |                                     |
                       v                                     v
               +---------------+                    +--------------------+
               |  Celery       |                    |  Workers: OCR,     |
               |  (Task Queue) | <----------------> |  Face rec, LLM,    |
               +---------------+                    |  matching services  |
                                                    +--------------------+
```

* **PostgreSQL + Apache AGE** is the primary data store (relational + graph queries).
* **MinIO** holds the original media and processed artifacts.
* **Redis** is used as cache and Celery broker/result backend.
* **Workers** perform OCR, face detection/embedding, image enhancement, and call LLMs for extraction.
* **Frontend** is React (or Svelte) talking to backend over JSON REST or GraphQL.

---

## 3. Core components & responsibilities

### Backend (Django with Django REST Framework)

* Authentication, user management, groups, invites
* Permissions, sharing rules, ACLs
* API endpoints for search, tree traversal, media uploads
* Orchestration: enqueueing tasks, verifying worker outputs
* Admin UI for moderation and manual linking

### Database (PostgreSQL + Apache AGE)

* Person, Event, Source (document), Place models
* AGE provides graph-specific storage & Cypher queries for relationship searches

### Object storage (MinIO)

* Raw uploads, processed images, thumbnails, OCR text blobs
* Use presigned URLs for direct browser uploads

### Task queue (Celery + Redis)

* Manage long-running CPU/GPU heavy jobs (OCR, embedding, face clustering)

### Workers (Python)

* **OCR Worker**: Tesseract / PaddleOCR pipeline + text cleaner
* **NER/Extraction Worker**: LLM or local NER model to extract names, dates, places
* **Face Worker**: face detection, embedding (e.g., FaceNet, InsightFace), clustering
* **Match Worker**: fuzzy + graph matching logic that creates/updates links in DB

### Frontend (React)

* Tree explorer (graph visualizer) + timeline view
* Document gallery with suggested matches and a review UI for ambiguous matches
* User settings and privacy controls

---

## 4. Data model overview (high-level)

This is simplified and shows core entities.

* **Person**: id, primary_name, alt_names[], birth_date, death_date, gender, places[], notes
* **Event**: id, type, date, place_id, linked_persons[], source_ids[]
* **Source (Document)**: id, title, upload_user, minio_path, ocr_text, extracted_entities[], processed_versions[]
* **Place**: id, name, geocoords, normalized_name
* **MediaAsset**: id, person_tags[], face_embeddings[], thumbnail_paths[]
* **User**: id, email, password_hash, roles, allowed_trees[]
* **Family/Tree**: grouping concept for permissions

**Graph layer (AGE)**: Nodes: Person, Event, Source; Edges: PARENT_OF, SPOUSE_OF, ATTENDED, SOURCE_FOR

---

## 5. Processing pipelines

### Document ingestion

1. Browser uploads file -> presigned URL to MinIO or backend proxy upload.
2. Backend stores Source row with status `uploaded` and enqueues `process_document` task.
3. OCR Worker downloads file from MinIO, runs OCR (PaddleOCR recommended), stores OCR result back to MinIO and updates `ocr_text`.
4. NER/LLM Worker ingests OCR text -> extracts structured fields (names, dates, relationships) and emits `possible_links` with confidence scores.
5. Match Worker queries Postgres/AGE to score candidate people and assigns best-match(es). For low confidence, mark `needs_review`.
6. Create Event(s) if the doc includes structured event data (birth/marriage/death) and attach source.

### Photo pipeline

1. Photo uploaded -> thumbnail created
2. Face Worker detects faces, computes embeddings, stores embeddings in DB or a vector index (e.g. PGVector or a dedicated vector DB)
3. Clustering runs periodically to group faces and assign probable person IDs
4. Merge suggestions shown to users for manual verification

### LLM enrichment

* Use LLM to both parse OCR text and to validate candidate matches using prompts that compare extracted doc fields with a person record and produce a confidence score + reasoning.
* LLMs can also generate human-friendly biographies and timeline summaries.

---

## 6. Authentication, authorization & privacy model

* **Auth**: Django auth (email + password), optionally integrate OAuth or SSO for teams
* **Permissions model:**

  * Resources (Person, Source, Media) have ACLs: `private`, `family_only`, `shared_link`, `public`
  * Invitation system: invite an email to join a specific Tree with a role (viewer/editor/admin)
  * Role based permissions: `admin`, `editor`, `viewer`, `approver`
* **Document-level privacy:** documents can be flagged sensitive and redacted in UI (or only visible to admins)
* **Audit logs:** store who viewed/edited records for accountability

---

## 7. Storage strategy

* **Postgres**: structured metadata, graph nodes, relations, small text fields
* **MinIO**: binary objects, OCR outputs (as blobs or files), processed images
* **Vector index**: either use PGVector extension inside Postgres or a dedicated vector DB (Milvus, Weaviate) for face embeddings and semantic search

---

## 8. Search & indexing

* **Full text:** Postgres `tsvector` or Meilisearch for fast name/place search and faceted search
* **Vector search:** PGVector or external vector DB for face embedding nearest-neighbors and semantic searches (e.g., “documents about migration”)
* **Graph queries:** use AGE Cypher queries for relationship queries like common ancestors, cousins, relationship path discovery

---

## 9. Observability, monitoring & backups

* **Logs:** Structured logs (JSON) from web and workers; centralised to ELK or Loki if available
* **Metrics:** Prometheus exporters + Grafana dashboards
* **Tracing:** OpenTelemetry instrumented endpoints for slow request analysis
* **Backups:**

  * Postgres: scheduled pg_dump or physical WAL-based backups (wal-e)
  * MinIO: lifecycle rules, replication; periodic backups to external storage
  * Redis: RDB/AOF snapshots

---

## 10. Deployment & scaling notes

* **Small installs (home / single VPS)**: Docker Compose with 2–4 cores, 8–16GB RAM, local MinIO volume
* **Medium installs (small org)**: replicate Postgres, use object storage on a NAS or S3, run workers on separate nodes
* **Large installs**: Kubernetes with Horizontal Pod Autoscaling, managed object storage, and dedicated GPU nodes for heavy ML workloads

---

## 11. Security & compliance

* **Data encryption:**

  * Encrypt in transit: TLS on all endpoints
  * Encrypt at rest: filesystem/disk encryption for MinIO and Postgres or use S3 server-side encryption
* **Secrets:** store in environment variables for Compose; use Vault or Kubernetes Secrets for production
* **Rate limiting & abuse prevention** for public endpoints
* **Privacy:** give users ability to export/delete their entire family data (GDPR-like requirements)

---

## 12. Developer workflow

* Local dev via `docker-compose -f docker-compose.dev.yml up --build`
* Feature branches -> PRs -> CI -> run unit tests and integration tests with ephemeral compose stacks
* Migrations: Django migrations; store migration policy in docs

---

## 13. Docker Compose (opinionated) + instructions

Below is an opinionated `docker-compose.yml` that spins up a minimal but functional local stack: Django backend, Celery worker, Postgres, Redis, MinIO, and a simple frontend (optional).

> **Notes before running:**
>
> * This compose is intended for development and small self-hosted instances. For production use, harden secrets, enable TLS, and consider Kubernetes or docker swarm.
> * Apache AGE must be installed into Postgres if you want Cypher/graph features. The compose below points to a custom Dockerfile to build Postgres with AGE installed (see the `postgres` service build context). You can replace with a managed Postgres and install AGE separately.

```yaml
version: '3.8'
services:
  postgres:
    build: ./postgres
    image: ancestry-postgres:15
    environment:
      POSTGRES_DB: ancestry
      POSTGRES_USER: ancestry
      POSTGRES_PASSWORD: ancestry_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

  redis:
    image: redis:7
    volumes:
      - redis_data:/data
    ports:
      - '6379:6379'

  minio:
    image: minio/minio:RELEASE.2025-01-01T00-00-00Z
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    ports:
      - '9000:9000'
      - '9001:9001'

  web:
    build: ./backend
    command: gunicorn ancestry_backend.wsgi:application --workers 3 --bind 0.0.0.0:8000
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgres://ancestry:ancestry_password@postgres:5432/ancestry
      - REDIS_URL=redis://redis:6379/0
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin123
      - DJANGO_SECRET_KEY=changemeverywhere
    depends_on:
      - postgres
      - redis
      - minio
    ports:
      - '8000:8000'

  worker:
    build: ./backend
    command: celery -A ancestry_backend worker --loglevel=info -Q default
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgres://ancestry:ancestry_password@postgres:5432/ancestry
      - REDIS_URL=redis://redis:6379/0
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin123
    depends_on:
      - postgres
      - redis
      - minio

  beat:
    build: ./backend
    command: celery -A ancestry_backend beat --loglevel=info
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgres://ancestry:ancestry_password@postgres:5432/ancestry
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
      - postgres

  frontend:
    build: ./frontend
    volumes:
      - ./frontend:/app
    ports:
      - '3000:3000'
    environment:
      - REACT_APP_API_URL=http://localhost:8000/api

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Supporting files & brief Dockerfile guidance

* `./postgres/Dockerfile` — start from `postgres:15` and follow Apache AGE build instructions (compile `age` extension and copy to `/usr/lib/postgresql/...` or use shared library path). See Apache AGE docs for exact steps.
* `./backend/Dockerfile` — a typical Python image:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY ./requirements.txt /app/
RUN pip install -r requirements.txt
COPY . /app
ENV PYTHONUNBUFFERED=1
```

* `./frontend/Dockerfile` — typical node image for React (build & serve via `serve` or dev server).

---

## Example LLM prompt templates

### Extract fields from OCR text

```
You are an assistant that reads OCR output from historical documents and returns JSON with fields: document_type, names[], dates[], places[], relationships[] (with role), confidence scores.

Text:
---
{{OCR_TEXT}}
---

Return strictly valid JSON with those fields and confidence values between 0 and 1.
```

### Match candidate person

```
Compare the following GEDCOM person record and the extracted document data. Return {match: true/false, confidence: 0-1, reasoning: 'short explanation'}.

Person:
{{PERSON_JSON}}

Document fields:
{{DOC_JSON}}
```

---

## Final notes & next steps

* If you want, I can: generate the Django models and migrations for the schema above; create the Celery task code for OCR -> LLM -> matching; write the AGE installation Dockerfile; or scaffold the React front-end gallery and review UI.
* Tell me which piece you want first and I’ll generate code and configuration for it.

---

*Document generated by assistant.*
