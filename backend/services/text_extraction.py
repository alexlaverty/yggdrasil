"""Text extraction service for documents and images."""

import os
import tempfile
import pdfplumber
import docx
import pytesseract
from PIL import Image


def extract_text_from_pdf(file_data: bytes) -> str:
    """Extract text from a PDF file."""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        tmp.write(file_data)
        tmp.flush()
        tmp_path = tmp.name

    try:
        with pdfplumber.open(tmp_path) as pdf:
            text_parts = []
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            return "\n\n".join(text_parts)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def extract_text_from_docx(file_data: bytes, extension: str = 'docx') -> str:
    """Extract text from a Word document."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{extension}') as tmp:
        tmp.write(file_data)
        tmp.flush()
        tmp_path = tmp.name

    try:
        doc = docx.Document(tmp_path)
        text_parts = [paragraph.text for paragraph in doc.paragraphs]
        return "\n".join(text_parts)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def extract_text_from_image(file_data: bytes, extension: str) -> str:
    """Extract text from an image using OCR."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{extension}') as tmp:
        tmp.write(file_data)
        tmp.flush()
        tmp_path = tmp.name

    try:
        image = Image.open(tmp_path)

        # Convert to RGB if image is in a different mode
        if image.mode not in ('RGB', 'L'):
            image = image.convert('RGB')

        return pytesseract.image_to_string(image)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def extract_text(file_data: bytes, filename: str) -> str:
    """Extract text from a file based on its extension.

    Returns extracted text or raises ValueError for unsupported formats.
    """
    file_extension = filename.lower().split('.')[-1]

    if file_extension == 'pdf':
        return extract_text_from_pdf(file_data)
    elif file_extension in ['docx', 'doc']:
        return extract_text_from_docx(file_data, file_extension)
    elif file_extension in ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif', 'gif']:
        return extract_text_from_image(file_data, file_extension)
    else:
        raise ValueError(
            f"Text extraction not supported for .{file_extension} files. "
            "Supported formats: PDF, DOCX, DOC, JPG, JPEG, PNG, BMP, TIFF, GIF"
        )
