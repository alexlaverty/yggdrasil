"""API routes for media files."""

import io
import json
import mimetypes
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Individual, Event, Media
from schemas.media import MediaUpdateRequest
from services.storage import (
    minio_client,
    get_presigned_url,
    generate_thumbnail,
    upload_thumbnail,
)
from services.text_extraction import extract_text

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    db: Session = Depends(get_db),
):
    """Upload media file to MinIO and save metadata to database."""
    try:
        metadata_dict = json.loads(metadata)
        media_date = metadata_dict.get("media_date")
        description = metadata_dict.get("description")
        event_id = metadata_dict.get("event_id")
        individual_ids = metadata_dict.get("individual_ids", [])

        contents = await file.read()
        file_size = len(contents)

        filename = file.filename
        mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

        if mime_type.startswith("image/"):
            media_type = "image"
        elif mime_type.startswith("video/"):
            media_type = "video"
        else:
            media_type = "document"

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = f"{timestamp}_{filename}"

        minio_client.put_object(
            "media", file_path, io.BytesIO(contents), file_size, content_type=mime_type
        )

        # Generate thumbnail for images
        thumbnail_path = None
        if media_type == "image":
            thumb_result = generate_thumbnail(contents, file_path)
            if thumb_result:
                thumb_data, thumb_filename = thumb_result
                thumbnail_path = upload_thumbnail(
                    minio_client, "media", thumb_data, thumb_filename
                )

        media = Media(
            filename=filename,
            file_path=file_path,
            thumbnail_path=thumbnail_path,
            media_type=media_type,
            file_size=file_size,
            media_date=(
                datetime.strptime(media_date, "%Y-%m-%d").date() if media_date else None
            ),
            description=description,
        )

        # If event_id is provided, automatically tag all associated people and link to event
        if event_id:
            event = db.query(Event).filter(Event.id == event_id).first()
            if event:
                event_individual_ids = [ind.id for ind in event.individuals]
                for family in event.families:
                    if family.spouse1_id:
                        event_individual_ids.append(family.spouse1_id)
                    if family.spouse2_id:
                        event_individual_ids.append(family.spouse2_id)

                all_individual_ids = list(set(event_individual_ids + individual_ids))
                individual_ids = all_individual_ids
                media.events.append(event)

        if individual_ids:
            individuals = (
                db.query(Individual).filter(Individual.id.in_(individual_ids)).all()
            )
            media.individuals = individuals

        db.add(media)
        db.commit()
        db.refresh(media)

        return {
            "id": media.id,
            "filename": media.filename,
            "media_type": media.media_type,
            "file_size": media.file_size,
            "message": "Media uploaded successfully",
        }
    except Exception as e:
        db.rollback()
        print(f"Error uploading media: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_all_media(db: Session = Depends(get_db)):
    """Get all media files with tagged individuals."""
    media_list = db.query(Media).all()

    result = []
    for media in media_list:
        tagged_individuals = [
            {"id": ind.id, "name": f"{ind.first_name} {ind.last_name}"}
            for ind in media.individuals
        ]

        tagged_events = [
            {
                "id": evt.id,
                "event_type": evt.event_type,
                "event_date": evt.event_date.isoformat() if evt.event_date else None,
                "place": evt.place,
            }
            for evt in media.events
        ]

        result.append(
            {
                "id": media.id,
                "filename": media.filename,
                "media_type": media.media_type,
                "file_size": media.file_size,
                "media_date": (
                    media.media_date.isoformat() if media.media_date else None
                ),
                "description": media.description,
                "extracted_text": media.extracted_text,
                "tagged_individuals": tagged_individuals,
                "tagged_events": tagged_events,
                "created_at": (
                    media.created_at.isoformat() if media.created_at else None
                ),
            }
        )

    return result


@router.get("/{media_id}/file")
async def get_media_file(media_id: int, db: Session = Depends(get_db)):
    """Retrieve media file from MinIO."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    try:
        response = minio_client.get_object("media", media.file_path)
        content_type = (
            mimetypes.guess_type(media.filename)[0] or "application/octet-stream"
        )

        # Generate ETag from media id and updated_at timestamp
        etag = f'"{media.id}-{int(media.updated_at.timestamp()) if media.updated_at else 0}"'

        return StreamingResponse(
            response,
            media_type=content_type,
            headers={
                "Content-Disposition": f'inline; filename="{media.filename}"',
                "Cache-Control": "public, max-age=31536000, immutable",
                "ETag": etag,
                "Content-Length": str(media.file_size) if media.file_size else None,
            },
        )
    except Exception as e:
        print(f"Error retrieving media file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving file: {str(e)}")


@router.get("/{media_id}/thumbnail")
async def get_media_thumbnail(media_id: int, db: Session = Depends(get_db)):
    """Retrieve thumbnail for media file (smaller, faster loading)."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # If no thumbnail exists, fall back to original file
    file_to_serve = media.thumbnail_path or media.file_path
    content_type = (
        "image/jpeg"
        if media.thumbnail_path
        else (mimetypes.guess_type(media.filename)[0] or "application/octet-stream")
    )

    try:
        response = minio_client.get_object("media", file_to_serve)
        etag = f'"{media.id}-thumb-{int(media.updated_at.timestamp()) if media.updated_at else 0}"'

        return StreamingResponse(
            response,
            media_type=content_type,
            headers={
                "Content-Disposition": f'inline; filename="thumb_{media.filename}"',
                "Cache-Control": "public, max-age=31536000, immutable",
                "ETag": etag,
            },
        )
    except Exception as e:
        print(f"Error retrieving thumbnail: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving thumbnail: {str(e)}"
        )


@router.get("/{media_id}/url")
async def get_media_url(media_id: int, db: Session = Depends(get_db)):
    """Get a presigned URL for direct MinIO access (faster, bypasses API)."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    try:
        url = get_presigned_url(
            minio_client, "media", media.file_path, expires_hours=24
        )
        return {"url": url, "expires_in": "24 hours"}
    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating URL: {str(e)}")


@router.put("/{media_id}")
async def update_media(
    media_id: int, update_data: MediaUpdateRequest, db: Session = Depends(get_db)
):
    """Update media metadata and tagged individuals."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    try:
        if update_data.media_date:
            media.media_date = datetime.strptime(
                update_data.media_date, "%Y-%m-%d"
            ).date()
        else:
            media.media_date = None

        media.description = update_data.description

        individuals = (
            db.query(Individual)
            .filter(Individual.id.in_(update_data.individual_ids))
            .all()
        )
        media.individuals = individuals

        db.commit()
        db.refresh(media)

        return {
            "id": media.id,
            "filename": media.filename,
            "media_date": media.media_date.isoformat() if media.media_date else None,
            "description": media.description,
            "tagged_count": len(media.individuals),
            "message": "Media updated successfully",
        }
    except Exception as e:
        db.rollback()
        print(f"Error updating media: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{media_id}/extract-text")
async def extract_text_from_media(media_id: int, db: Session = Depends(get_db)):
    """Extract text from document files (PDF, DOCX, images with OCR)."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    try:
        response = minio_client.get_object("media", media.file_path)
        file_data = response.read()

        try:
            extracted_text = extract_text(file_data, media.filename)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Error processing file: {str(e)}"
            )

        if extracted_text.strip():
            media.extracted_text = extracted_text
            db.commit()
            db.refresh(media)

            return {
                "id": media.id,
                "filename": media.filename,
                "extracted_text": extracted_text,
                "text_length": len(extracted_text),
                "message": "Text extracted successfully",
            }
        else:
            raise HTTPException(
                status_code=400, detail="No text could be extracted from the document"
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error extracting text: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error extracting text: {str(e)}")
