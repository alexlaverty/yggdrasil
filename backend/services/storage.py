"""MinIO storage service for handling file uploads and retrieval."""

import io
import os
from minio import Minio
from PIL import Image

THUMBNAIL_SIZE = (300, 300)


def get_minio_client() -> Minio:
    """Create and return a MinIO client instance."""
    return Minio(
        os.getenv("MINIO_ENDPOINT", "minio:9000"),
        access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
        secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin123"),
        secure=False,
    )


def ensure_buckets(client: Minio) -> None:
    """Ensure required buckets exist."""
    try:
        if not client.bucket_exists("gedcoms"):
            client.make_bucket("gedcoms")
        if not client.bucket_exists("media"):
            client.make_bucket("media")
    except Exception as e:
        print(f"MinIO bucket creation failed: {e}")


def upload_file(
    client: Minio,
    bucket: str,
    filename: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> None:
    """Upload a file to MinIO."""
    client.put_object(
        bucket, filename, io.BytesIO(data), len(data), content_type=content_type
    )


def get_file(client: Minio, bucket: str, filename: str) -> bytes:
    """Retrieve a file from MinIO."""
    response = client.get_object(bucket, filename)
    return response.read()


def get_file_stream(client: Minio, bucket: str, filename: str):
    """Get a streaming response for a file from MinIO."""
    return client.get_object(bucket, filename)


def get_presigned_url(
    client: Minio, bucket: str, filename: str, expires_hours: int = 1
) -> str:
    """Generate a presigned URL for direct access to a file in MinIO."""
    from datetime import timedelta

    return client.presigned_get_object(
        bucket, filename, expires=timedelta(hours=expires_hours)
    )


def generate_thumbnail(image_data: bytes, filename: str) -> tuple[bytes, str] | None:
    """Generate a thumbnail from image data. Returns (thumbnail_bytes, thumbnail_filename) or None if not an image."""
    try:
        img = Image.open(io.BytesIO(image_data))

        # Convert RGBA to RGB for JPEG
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Create thumbnail maintaining aspect ratio
        img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

        # Save to bytes
        thumb_buffer = io.BytesIO()
        img.save(thumb_buffer, format="JPEG", quality=85, optimize=True)
        thumb_buffer.seek(0)

        # Generate thumbnail filename
        base_name = filename.rsplit(".", 1)[0] if "." in filename else filename
        thumb_filename = f"thumb_{base_name}.jpg"

        return thumb_buffer.getvalue(), thumb_filename
    except Exception as e:
        print(f"Error generating thumbnail: {e}")
        return None


def upload_thumbnail(
    client: Minio, bucket: str, thumb_data: bytes, thumb_filename: str
) -> str:
    """Upload a thumbnail to MinIO and return the path."""
    client.put_object(
        bucket,
        thumb_filename,
        io.BytesIO(thumb_data),
        len(thumb_data),
        content_type="image/jpeg",
    )
    return thumb_filename


# Global client instance
minio_client = get_minio_client()
ensure_buckets(minio_client)
