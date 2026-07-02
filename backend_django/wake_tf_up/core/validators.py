"""Shared upload validators for user/admin-supplied image files."""
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

validate_image_extension = FileExtensionValidator(allowed_extensions=ALLOWED_IMAGE_EXTENSIONS)

MAX_IMAGE_UPLOAD_SIZE = 8 * 1024 * 1024  # 8MB per image


def validate_image_file_size(file):
    if file.size > MAX_IMAGE_UPLOAD_SIZE:
        raise ValidationError(
            f"Image file too large ({file.size / (1024 * 1024):.1f}MB). "
            f"Maximum size is {MAX_IMAGE_UPLOAD_SIZE / (1024 * 1024):.0f}MB."
        )
