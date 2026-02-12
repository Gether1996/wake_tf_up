from django.db import models, transaction
from django.conf import settings
from django.core.exceptions import ValidationError
from shop.models import Product


class Order(models.Model):
    """Order model with stock reservation"""
    STATUS_CHOICES = [
        ('created', 'Created'),
        ('paid', 'Paid'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    SHIPPING_METHOD_CHOICES = [
        ('pickup', 'Personal Pickup'),
        ('dpd_courier', 'DPD Courier'),
        ('packeta_box', 'Packeta Z-Box'),
        ('packeta_courier', 'Packeta Courier'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('gopay', 'GoPay Online Payment'),
        ('cash_on_pickup', 'Cash on Personal Pickup'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='created'
    )
    
    # Shipping method
    shipping_method = models.CharField(
        max_length=20,
        choices=SHIPPING_METHOD_CHOICES,
        default='dpd_courier',
        help_text="Delivery method selected by customer"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='gopay',
        help_text="Payment method selected at checkout"
    )
    
    # Packeta pickup point details (for packeta_box method)
    packeta_point_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Packeta pickup point ID"
    )
    packeta_point_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Packeta pickup point name"
    )
    packeta_point_address = models.TextField(
        blank=True,
        help_text="Packeta pickup point address"
    )
    
    # Tracking information
    tracking_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Carrier tracking number"
    )
    carrier_tracking_url = models.URLField(
        blank=True,
        help_text="URL to track shipment"
    )
    packeta_packet_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Packeta internal packet ID"
    )
    
    # Address (basic skeleton)
    shipping_name = models.CharField(max_length=200)
    shipping_address = models.TextField()
    shipping_city = models.CharField(max_length=100)
    shipping_postal_code = models.CharField(max_length=20)
    shipping_country = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    
    # Billing information (optional - for company purchases)
    is_company_purchase = models.BooleanField(default=False, help_text="Is this a company purchase?")
    billing_company = models.CharField(max_length=200, blank=True, help_text="Company name")
    billing_ico = models.CharField(max_length=50, blank=True, help_text="IČO (Company ID)")
    billing_dic = models.CharField(max_length=50, blank=True, help_text="DIČ (Tax ID)")
    billing_ic_dph = models.CharField(max_length=50, blank=True, help_text="IČ DPH (VAT ID)")
    
    # Discount code
    discount_code = models.ForeignKey(
        'loyalty.DiscountCode',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        help_text="Applied discount code"
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Discount amount applied"
    )
    
    # Order totals
    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Shipping cost (EUR)"
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when order was marked as delivered"
    )
    review_request_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when review request email was sent"
    )
    
    class Meta:
        db_table = 'orders'
        verbose_name = 'Objednávka'
        verbose_name_plural = 'Objednávky'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"Order #{self.id} - {self.user.email} - {self.status}"
    
    def clean(self):
        """Validate Packeta point selection for packeta_box shipping method"""
        super().clean()
        if self.shipping_method == 'packeta_box':
            if not self.packeta_point_id or not self.packeta_point_name:
                raise ValidationError(
                    "Packeta pickup point must be selected for packeta_box shipping method"
                )
    
    @property
    def is_pre_order(self):
        """Check if order contains any pre-order items"""
        return self.items.filter(is_pre_order=True).exists()
    
    def apply_discount(self, discount_code_obj):
        """
        Apply a discount code to this order.
        
        Args:
            discount_code_obj: DiscountCode instance
        
        Returns:
            bool: True if discount applied successfully, False otherwise
        
        Raises:
            ValidationError: If a discount code is already applied
        """
        from loyalty.models import LoyaltyService
        from decimal import Decimal
        
        # Prevent combining discount codes
        if self.discount_code is not None:
            raise ValidationError("Discount code already applied. Only one discount code per order is allowed.")
        
        # Calculate subtotal from items
        subtotal = sum(item.price_at_purchase * item.quantity for item in self.items.all())
        
        # Validate the code with user
        result = LoyaltyService.apply_discount_code(
            discount_code_obj.code, 
            Decimal(subtotal), 
            user=self.user
        )
        
        if result['valid']:
            self.discount_code = discount_code_obj
            self.discount_amount = result['discount_amount']
            # Recalculate total with shipping cost
            self.total_amount = subtotal - self.discount_amount + self.shipping_cost
            self.save()
            
            # Increment usage count
            discount_code_obj.usage_count += 1
            if discount_code_obj.usage_count >= discount_code_obj.max_uses:
                discount_code_obj.is_used = True
            discount_code_obj.save()
            
            return True
        return False
    
    def remove_discount(self):
        """
        Remove applied discount code from this order.
        Recalculates total without discount (but with shipping).
        """
        if self.discount_code:
            # Decrement usage count
            self.discount_code.usage_count = max(0, self.discount_code.usage_count - 1)
            if self.discount_code.usage_count < self.discount_code.max_uses:
                self.discount_code.is_used = False
            self.discount_code.save()
            
            # Remove discount
            self.discount_code = None
            self.discount_amount = 0
            
            # Recalculate total with shipping
            subtotal = sum(item.price_at_purchase * item.quantity for item in self.items.all())
            self.total_amount = subtotal + self.shipping_cost
            self.save()
            
            return True
        return False


class OrderItem(models.Model):
    """Order items with stock reservation logic"""
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='order_items'
    )
    quantity = models.PositiveIntegerField()
    price_at_purchase = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Price at time of purchase"
    )
    is_pre_order = models.BooleanField(
        default=False,
        help_text="Was this a pre-order item?"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'order_items'
        verbose_name = 'Položka objednávky'
        verbose_name_plural = 'Položky objednávky'
    
    def __str__(self):
        return f"{self.product.name} x{self.quantity}"
    
    def clean(self):
        """
        Stock validation logic - prevent overselling
        This is called before saving the order item
        """
        if not self.pk:  # Only check for new items
            # Calculate currently available stock
            available = self.product.available_stock
            
            # If not enough stock and pre-order not enabled
            if self.quantity > available and not self.product.pre_order_enabled:
                raise ValidationError(
                    f"Not enough stock for {self.product.name}. "
                    f"Available: {available}, Requested: {self.quantity}"
                )
            
            # Mark as pre-order if stock is insufficient
            if self.quantity > available:
                self.is_pre_order = True
    
    def save(self, *args, **kwargs):
        # Store current price if not set
        if not self.price_at_purchase:
            if self.product and self.product.price:
                # Use discount price if available, otherwise regular price
                self.price_at_purchase = self.product.discount_price or self.product.price
            else:
                raise ValidationError("Product must have a price set")
        
        # Run validation
        self.clean()
        
        super().save(*args, **kwargs)
    
    @property
    def subtotal(self):
        if self.price_at_purchase is None or self.quantity is None:
            return 0
        return self.price_at_purchase * self.quantity


# Stock Reservation Service
class StockReservationService:
    """
    Service for handling stock reservation logic.
    
    Strategy:
    1. When order is created - items reserve stock (counted in available_stock)
    2. When order is paid - reservation continues
    3. When order is cancelled/refunded - reservation is freed
    4. Stock is calculated dynamically in Product.available_stock property
    
    This prevents overselling by:
    - Using database transactions
    - Validating stock before saving
    - Counting all active reservations (created, paid, shipped orders)
    """
    
    @staticmethod
    @transaction.atomic
    def create_order_with_items(user, items_data, shipping_data):
        """
        Create an order with items and validate stock.
        
        Args:
            user: User instance
            items_data: List of dicts with 'product_id' and 'quantity'
            shipping_data: Dict with shipping information
            
        Returns:
            Order instance
            
        Raises:
            ValidationError: If stock validation fails
        """
        from settings.models import MainSettings
        from decimal import Decimal
        
        # Create order
        order = Order.objects.create(
            user=user,
            **shipping_data
        )
        
        subtotal = Decimal('0.00')
        
        # Create order items with stock validation
        for item_data in items_data:
            product = Product.objects.select_for_update().get(
                id=item_data['product_id']
            )
            
            order_item = OrderItem(
                order=order,
                product=product,
                quantity=item_data['quantity']
            )
            
            # This will validate stock and raise ValidationError if needed
            order_item.save()
            
            subtotal += order_item.subtotal
        
        # Calculate shipping cost based on shipping method and settings
        settings = MainSettings.objects.first()
        shipping_method = shipping_data.get('shipping_method', 'dpd_courier')
        
        if settings:
            # Get shipping cost based on method
            shipping_cost_map = {
                'pickup': settings.pickup_cost,
                'dpd_courier': settings.dpd_courier_cost,
                'packeta_box': settings.packeta_box_cost,
                'packeta_courier': settings.packeta_courier_cost,
            }
            shipping_cost = shipping_cost_map.get(shipping_method, Decimal('0.00'))
            
            # Apply free shipping threshold
            if subtotal >= settings.free_shipping_threshold:
                shipping_cost = Decimal('0.00')
        else:
            shipping_cost = Decimal('0.00')
        
        # Update order with shipping cost and total
        order.shipping_cost = shipping_cost
        order.total_amount = subtotal + shipping_cost
        order.save()
        
        return order
    
    @staticmethod
    def cancel_order(order):
        """
        Cancel an order, freeing up reserved stock.
        """
        if order.status in ['cancelled', 'refunded']:
            return
        
        order.status = 'cancelled'
        order.save()
        
        # Stock is automatically freed because we calculate available_stock
        # dynamically based on order status
