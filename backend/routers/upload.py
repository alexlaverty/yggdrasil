"""API routes for GEDCOM file upload and export."""

import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response

from database import SessionLocal, get_db
from services.storage import minio_client
from services.gedcom import import_gedcom, export_gedcom

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


@router.get("/export-gedcom")
async def export_gedcom_file(db=Depends(get_db)):
    """Export all data as a valid GEDCOM file."""
    try:
        gedcom_content = export_gedcom(db)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"yggdrasil_export_{timestamp}.ged"

        return Response(
            content=gedcom_content,
            media_type="application/x-gedcom",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except Exception as e:
        print(f"[ERROR] Failed to export GEDCOM: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
