"""API routes for GEDCOM file upload."""

import io
from fastapi import APIRouter, HTTPException, UploadFile, File

from database import SessionLocal
from services.storage import minio_client
from services.gedcom import import_gedcom

router = APIRouter(tags=["upload"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and process a GEDCOM file."""
    contents = await file.read()
    file_name = file.filename

    # Save to MinIO
    minio_client.put_object(
        "gedcoms",
        file_name,
        io.BytesIO(contents),
        len(contents),
        content_type="application/octet-stream",
    )

    # Import GEDCOM into database
    db = SessionLocal()
    try:
        import_gedcom(db, contents)
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to process GEDCOM file: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

    return {"message": "GEDCOM uploaded and parsed successfully"}
