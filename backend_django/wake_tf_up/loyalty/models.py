from django.db import models
from django.conf import settings
import random
import string


class DiscountCode(models.Model):
    """
    Discount codes for loyalty program.
    Generated automatically for users with >= 3 paid orders.
    """
    CODE_TYPES = [
        ('loyalty', 'Loyalty Reward'),
        ('promotion', 'Promotion'),
        ('referral', 'Referral'),
        ('newsletter', 'Newsletter Signup'),
    ]
    
    code = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discount_codes',
        null=True,
        blank=True,
        help_text="User who owns this code (optional for general promotions)"
    )
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Discount percentage (e.g., 10.00 for 10%, can be 0 for free shipping only)"
    )
    minimum_order_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Minimum order value to apply discount (e.g., 50.00 for 50€)"
    )
    is_free_shipping = models.BooleanField(
        default=False,
        help_text="If True, this code provides free shipping regardless of order value"
    )
    max_uses = models.IntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of times this code can be used (leave empty for unlimited)"
    )
    usage_count = models.IntegerField(
        default=0,
        help_text="Number of times this code has been used"
    )
    code_type = models.CharField(
        max_length=20,
        choices=CODE_TYPES,
        default='loyalty'
    )
    is_active = models.BooleanField(default=True)
    is_used = models.BooleanField(default=False)
    
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Expiration date (leave empty for no expiration)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'discount_codes'
        verbose_name = 'Zľavový kód'
        verbose_name_plural = 'Zľavové kódy'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.discount_percentage}%"
    
    @staticmethod
    def generate_code(prefix='LOYAL', length=8):
        """Generate a random discount code"""
        chars = string.ascii_uppercase + string.digits
        random_part = ''.join(random.choices(chars, k=length))
        return f"{prefix}{random_part}"


class LoyaltyService:
    """
    Service for managing loyalty program logic.
    
    Rules:
    - Users with >= 3 paid orders get a loyalty discount code
    """
    
    @staticmethod
    def check_and_generate_loyalty_code(user):
        """
        Check if user qualifies for loyalty code and generate if needed.
        
        Args:
            user: User instance
            
        Returns:
            DiscountCode instance or None
        """
        from orders.models import Order
        from datetime import datetime, timedelta
        
        # Count paid orders
        paid_orders_count = Order.objects.filter(
            user=user,
            status__in=['paid', 'shipped', 'delivered']
        ).count()
        
        # Check if qualifies (>= 3 paid orders)
        if paid_orders_count < 3:
            return None
        
        # Check if already has an active loyalty code
        existing_code = DiscountCode.objects.filter(
            user=user,
            code_type='loyalty',
            is_active=True,
            is_used=False
        ).first()
        
        if existing_code:
            return existing_code
        
        # Generate new loyalty code
        code = DiscountCode.generate_code()
        discount_code = DiscountCode.objects.create(
            code=code,
            user=user,
            discount_percentage=10.00,  # 10% loyalty discount
            code_type='loyalty',
            is_active=True,
            minimum_order_value=0.00,
            max_uses=1,
            valid_from=datetime.now(),
            valid_until=datetime.now() + timedelta(days=90)  # Valid for 90 days
        )
        
        return discount_code
    
    @staticmethod
    def apply_discount_code(code_str, order_total, user=None):
        """
        Apply a discount code to an order.
        
        Args:
            code_str: Discount code string
            order_total: Order total amount
            user: User instance (optional, for user-specific code validation)
            
        Returns:
            dict: {'valid': bool, 'discount_amount': Decimal, 'message': str, 'is_free_shipping': bool}
        """
        from datetime import datetime
        from decimal import Decimal
        
        try:
            code = DiscountCode.objects.get(code=code_str)
        except DiscountCode.DoesNotExist:
            return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'Invalid code', 'error_code': 'INVALID_CODE', 'is_free_shipping': False}
        
        # Check if code is user-specific and belongs to the requesting user
        if code.user is not None:
            if user is None:
                return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'This code requires authentication', 'error_code': 'AUTH_REQUIRED', 'is_free_shipping': False}
            if code.user.id != user.id:
                return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'This code is not valid for your account', 'error_code': 'WRONG_USER', 'is_free_shipping': False}
        
        # Check if code is active
        if not code.is_active:
            return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'Code is inactive', 'error_code': 'INACTIVE', 'is_free_shipping': False}
        
        # Check if already used
        if code.is_used:
            return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'Code already used', 'error_code': 'ALREADY_USED', 'is_free_shipping': False}
        
        # Check validity period
        now = datetime.now()
        if now < code.valid_from:
            return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'Code not yet valid', 'error_code': 'NOT_YET_VALID', 'is_free_shipping': False}
        if code.valid_until is not None and now > code.valid_until:
            return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'Code expired', 'error_code': 'EXPIRED', 'is_free_shipping': False}
        
        # Check minimum order value
        if order_total < code.minimum_order_value:
            return {
                'valid': False, 
                'discount_amount': Decimal('0'), 
                'message': f'Minimum order value is {code.minimum_order_value}€',
                'error_code': 'MIN_ORDER_VALUE',
                'min_value': float(code.minimum_order_value),
                'is_free_shipping': False
            }
        
        # Check max uses (only if max_uses is set)
        if code.max_uses is not None and code.usage_count >= code.max_uses:
            return {
                'valid': False,
                'discount_amount': Decimal('0'),
                'message': 'Code usage limit reached',
                'error_code': 'MAX_USES_REACHED',
                'is_free_shipping': False
            }
        
        # Calculate discount
        discount_amount = (order_total * code.discount_percentage) / Decimal('100')
        
        # Build message
        if code.is_free_shipping and code.discount_percentage > 0:
            message = f'{code.discount_percentage}% discount + free shipping applied'
        elif code.is_free_shipping:
            message = 'Free shipping applied'
        else:
            message = f'{code.discount_percentage}% discount applied'
        
        return {
            'valid': True,
            'discount_amount': discount_amount,
            'message': message,
            'error_code': None,
            'code_id': code.id,
            'discount_percentage': float(code.discount_percentage),
            'is_free_shipping': code.is_free_shipping
        }
    
    @staticmethod
    def generate_newsletter_code(email):
        """
        Generate a 5% discount code for newsletter subscribers.
        
        Args:
            email: Subscriber email
            
        Returns:
            DiscountCode instance
        """
        from datetime import datetime, timedelta
        from accounts.models import User
        
        # Try to find user by email, or create without user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = None
        
        # Generate newsletter code
        code = DiscountCode.generate_code(prefix='NEWS', length=8)
        discount_code = DiscountCode.objects.create(
            code=code,
            user=user,
            discount_percentage=5.00,  # 5% newsletter discount
            code_type='newsletter',
            is_active=True,
            minimum_order_value=50.00,  # Minimum 50€
            max_uses=1,
            valid_from=datetime.now(),
            valid_until=datetime.now() + timedelta(days=30)  # Valid for 30 days
        )
        
        return discount_code


class QRCode(models.Model):
    """
    QR codes for marketing campaigns, product links, etc.
    Track scan count and analytics.
    """
    QR_CODE_TYPES = [
        ('product', 'Product Link'),
        ('discount', 'Discount Code'),
        ('website', 'Website URL'),
        ('social', 'Social Media'),
        ('other', 'Other'),
    ]
    
    title = models.CharField(
        max_length=200,
        help_text="Descriptive title for this QR code"
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique identifier for the QR code"
    )
    qr_type = models.CharField(
        max_length=20,
        choices=QR_CODE_TYPES,
        default='other',
        help_text="Type of QR code"
    )
    target_url = models.URLField(
        max_length=500,
        help_text="Target URL when QR code is scanned"
    )
    discount_code = models.ForeignKey(
        DiscountCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='qr_codes',
        help_text="Associated discount code (optional)"
    )
    scan_count = models.IntegerField(
        default=0,
        help_text="Number of times this QR code has been scanned"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this QR code is active"
    )
    description = models.TextField(
        blank=True,
        help_text="Additional notes or description"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_scanned_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this QR code was scanned"
    )
    
    class Meta:
        db_table = 'qr_codes'
        verbose_name = 'QR kód'
        verbose_name_plural = 'QR kódy'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
            models.Index(fields=['-scan_count']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.code}) - Scans: {self.scan_count}"
    
    @staticmethod
    def generate_code(prefix='QR', length=8):
        """Generate a random QR code identifier"""
        chars = string.ascii_uppercase + string.digits
        random_part = ''.join(random.choices(chars, k=length))
        return f"{prefix}{random_part}"
    
    def increment_scan_count(self):
        """Increment scan count and update last scanned timestamp"""
        from datetime import datetime
        self.scan_count += 1
        self.last_scanned_at = datetime.now()
        self.save(update_fields=['scan_count', 'last_scanned_at'])
    
    def get_qr_image_data(self):
        """Generate QR code image data using qrcode library"""
        try:
            import qrcode
            from io import BytesIO
            import base64
            
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(self.target_url)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}"
        except ImportError:
            return None
