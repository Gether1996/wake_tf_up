from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.files.base import ContentFile
from .models import ProductVideo
import cv2
import os
from PIL import Image
import io
import logging


logger = logging.getLogger(__name__)


@receiver(post_save, sender=ProductVideo)
def generate_video_thumbnail(sender, instance, created, **kwargs):
    """
    Automatically generate thumbnail from video if not provided
    Extracts first frame from video file
    """
    # Only generate if thumbnail is missing and video exists
    if instance.thumbnail or not instance.video:
        return
    
    # Avoid infinite loop - check if we're already in a save
    if hasattr(instance, '_generating_thumbnail'):
        return
    
    try:
        # Mark that we're generating to avoid recursion
        instance._generating_thumbnail = True
        
        # Get video file path
        video_path = instance.video.path
        
        # Open video with OpenCV
        video = cv2.VideoCapture(video_path)
        
        # Read first frame
        success, frame = video.read()
        video.release()
        
        if not success:
            logger.warning("Failed to extract frame from video %s", instance.video.name)
            return
        
        # Convert BGR (OpenCV) to RGB (PIL)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Convert to PIL Image
        pil_image = Image.fromarray(frame_rgb)
        
        # Resize to reasonable thumbnail size (keep aspect ratio)
        max_size = (640, 480)
        pil_image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Save to BytesIO
        thumb_io = io.BytesIO()
        pil_image.save(thumb_io, format='JPEG', quality=85)
        thumb_io.seek(0)
        
        # Generate filename from video name
        video_name = os.path.splitext(os.path.basename(instance.video.name))[0]
        thumbnail_name = f"{video_name}_thumb.jpg"
        
        # Save thumbnail
        instance.thumbnail.save(
            thumbnail_name,
            ContentFile(thumb_io.read()),
            save=False  # Don't trigger another save
        )
        
        # Save instance without triggering signal again
        ProductVideo.objects.filter(pk=instance.pk).update(
            thumbnail=instance.thumbnail
        )
        
        logger.info("Generated thumbnail for video %s", instance.video.name)
        
    except Exception as e:
        logger.error("Error generating thumbnail for %s: %s", instance.video.name, e, exc_info=True)
    
    finally:
        # Clean up flag
        if hasattr(instance, '_generating_thumbnail'):
            delattr(instance, '_generating_thumbnail')
