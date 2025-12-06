"""MinIO storage service for handling file uploads and retrieval."""

import io
import os
from minio import Minio


def get_minio_client() -> Minio:
    """Create and return a MinIO client instance."""
    return Minio(
        os.getenv("MINIO_ENDPOINT", "minio:9000"),
        access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
        secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin123"),
        secure=False
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


def upload_file(client: Minio, bucket: str, filename: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    """Upload a file to MinIO."""
    client.put_object(
        bucket,
        filename,
        io.BytesIO(data),
        len(data),
        content_type=content_type
    )


def get_file(client: Minio, bucket: str, filename: str) -> bytes:
    """Retrieve a file from MinIO."""
    response = client.get_object(bucket, filename)
    return response.read()


def get_file_stream(client: Minio, bucket: str, filename: str):
    """Get a streaming response for a file from MinIO."""
    return client.get_object(bucket, filename)


# Global client instance
minio_client = get_minio_client()
ensure_buckets(minio_client)
