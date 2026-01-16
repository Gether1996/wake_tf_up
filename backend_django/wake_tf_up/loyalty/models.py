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
        help_text="Discount percentage (e.g., 10.00 for 10%)"
    )
    code_type = models.CharField(
        max_length=20,
        choices=CODE_TYPES,
        default='loyalty'
    )
    is_active = models.BooleanField(default=True)
    is_used = models.BooleanField(default=False)
    
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'discount_codes'
        verbose_name = 'Discount Code'
        verbose_name_plural = 'Discount Codes'
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
            valid_from=datetime.now(),
            valid_until=datetime.now() + timedelta(days=90)  # Valid for 90 days
        )
        
        return discount_code
    
    @staticmethod
    def apply_discount_code(code_str, order_total):
        """
        Apply a discount code to an order.
        
        Args:
            code_str: Discount code string
            order_total: Order total amount
            
        Returns:
            dict: {'valid': bool, 'discount_amount': Decimal, 'message': str}
        """
        from datetime import datetime
        from decimal import Decimal
        
        try:
            code = DiscountCode.objects.get(code=code_str)
        except DiscountCode.DoesNotExist:
            return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'Invalid code'}
        
        # Check if code is active
        if not code.is_active:
            return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'Code is inactive'}
        
        # Check if already used
        if code.is_used:
            return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'Code already used'}
        
        # Check validity period
        now = datetime.now()
        if now < code.valid_from or now > code.valid_until:
            return {'valid': False, 'discount_amount': Decimal('0'), 'message': 'Code expired'}
        
        # Calculate discount
        discount_amount = (order_total * code.discount_percentage) / Decimal('100')
        
        return {
            'valid': True,
            'discount_amount': discount_amount,
            'message': f'{code.discount_percentage}% discount applied',
            'code_id': code.id
        }
