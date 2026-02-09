from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator
from decimal import Decimal


class Category(models.Model):
    """Product categories (e.g., T-shirts, Hoodies, Jackets)"""
    name = models.CharField(max_length=100)
    en_name = models.CharField(max_length=100, blank=True, help_text="English name", default="")
    slug = models.SlugField(unique=True, max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'categories'
        verbose_name = 'Kategória'
        verbose_name_plural = 'Kategórie'
        ordering = ['name']
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


class Color(models.Model):
    """Product colors"""
    name = models.CharField(max_length=50)
    en_name = models.CharField(max_length=50, blank=True, help_text="English name", default="")
    hex_code = models.CharField(max_length=7, help_text="Hex color code, e.g., #FF0000")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'colors'
        verbose_name = 'Farba'
        verbose_name_plural = 'Farby'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.hex_code})"


class Product(models.Model):
    """Main product model for clothing items"""
    name = models.CharField(max_length=200)
    en_name = models.CharField(max_length=200, blank=True, help_text="English name", default="")
    description = models.TextField(blank=True, help_text="Product description")
    en_description = models.TextField(blank=True, help_text="English description", default="")
    slug = models.SlugField(unique=True, max_length=200, blank=True)
    
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products'
    )
    color = models.ForeignKey(
        Color,
        on_delete=models.PROTECT,
        related_name='products'
    )
    
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Price in EUR"
    )
    
    discount_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        null=True,
        blank=True,
        help_text="Discounted price in EUR (optional)"
    )
    
    total_stock = models.PositiveIntegerField(
        default=0,
        help_text="Total available quantity"
    )
    
    # Product flags
    is_limited_drop = models.BooleanField(
        default=False,
        help_text="Limited edition drop (1/1 unique pieces)"
    )
    is_recycled = models.BooleanField(
        default=False,
        help_text="Made from recycled materials"
    )
    
    # Pre-order functionality
    pre_order_enabled = models.BooleanField(
        default=False,
        help_text="Allow pre-orders when out of stock"
    )
    
    # Publishing
    is_published = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products'
        verbose_name = 'Produkt'
        verbose_name_plural = 'Produkty'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_published']),
            models.Index(fields=['category', 'is_published']),
            models.Index(fields=['is_limited_drop']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
    
    @property
    def sold_quantity(self):
        """Calculate sold quantity from paid order items"""
        from orders.models import OrderItem, Order
        return OrderItem.objects.filter(
            product=self,
            order__status__in=['paid', 'shipped', 'delivered']
        ).aggregate(
            total=models.Sum('quantity')
        )['total'] or 0
    
    @property
    def available_stock(self):
        """Calculate available stock (total - sold - reserved)"""
        from orders.models import OrderItem, Order
        # Get all reserved items from non-cancelled/non-refunded orders
        reserved = OrderItem.objects.filter(
            product=self,
            order__status__in=['created', 'paid', 'shipped']
        ).aggregate(
            total=models.Sum('quantity')
        )['total'] or 0
        
        return max(0, self.total_stock - reserved)
    
    @property
    def is_in_stock(self):
        """Check if product is in stock"""
        return self.available_stock > 0
    
    def __str__(self):
        return self.name


class ProductImage(models.Model):
    """Multiple images per product"""
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to='products/%Y/%m/')
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'product_images'
        ordering = ['order', 'created_at']
        verbose_name = 'Obrázok produktu'
        verbose_name_plural = 'Obrázky produktov'
    
    def __str__(self):
        return f"Image for {self.product.name}"


class ProductVideo(models.Model):
    """Multiple videos per product"""
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='videos'
    )
    video = models.FileField(upload_to='products/videos/%Y/%m/')
    thumbnail = models.ImageField(
        upload_to='products/video_thumbnails/%Y/%m/',
        blank=True,
        null=True
    )
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'product_videos'
        ordering = ['order', 'created_at']
        verbose_name = 'Video produktu'
        verbose_name_plural = 'Videá produktov'
    
    def __str__(self):
        return f"Video {self.order + 1} for {self.product.name}"
