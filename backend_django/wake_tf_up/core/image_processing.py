"""Shared thumbnail generation for uploaded product/ticket images."""
import io

from django.core.files.base import ContentFile
from PIL import Image

THUMBNAIL_MAX_SIZE = (400, 400)

try:
    RESAMPLE_FILTER = Image.Resampling.LANCZOS
except AttributeError:  # Pillow < 9.1
    RESAMPLE_FILTER = Image.LANCZOS


def make_thumbnail(image_field_file, max_size=THUMBNAIL_MAX_SIZE):
    """
    Build a resized copy of an uploaded image for use as a grid/list thumbnail.

    Returns a ContentFile ready to assign to another ImageField, or None if
    the source image can't be read/processed (caller should skip silently —
    a missing thumbnail just means the frontend falls back to the full image).
    """
    try:
        image_field_file.seek(0)
        img = Image.open(image_field_file)
        img.load()

        has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
        img = img.convert('RGBA') if has_alpha else img.convert('RGB')
        img.thumbnail(max_size, RESAMPLE_FILTER)

        buffer = io.BytesIO()
        if has_alpha:
            img.save(buffer, format='PNG', optimize=True)
            name = 'thumb.png'
        else:
            img.save(buffer, format='JPEG', quality=85, optimize=True)
            name = 'thumb.jpg'
        return ContentFile(buffer.getvalue(), name=name)
    except Exception:
        return None
