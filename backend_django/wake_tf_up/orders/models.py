from django.db import models, transaction
from django.conf import settings
from django.core.exceptions import ValidationError
from shop.models import Product, Ticket
import secrets
import string


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
        ('digital_delivery', 'Digital Delivery'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('gopay', 'GoPay Online Payment'),
        ('cash_on_pickup', 'Cash on Personal Pickup'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='orders',
        null=True,
        blank=True,
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
    
    # Contact
    email = models.EmailField(
        blank=True,
        default='',
        help_text="Customer email (stored directly on order, works for guest orders too)"
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
    
    # Language preference
    language = models.CharField(
        max_length=2,
        choices=[('sk', 'Slovak'), ('en', 'English')],
        default='sk',
        help_text="Language preference for emails and communications"
    )
    
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
        user_info = self.user.email if self.user else 'guest'
        return f"Order #{self.id} - {user_info} - {self.status}"
    
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
    
    @transaction.atomic
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
        from loyalty.models import LoyaltyService, DiscountCode
        from decimal import Decimal
        
        # Prevent combining discount codes
        if self.discount_code is not None:
            raise ValidationError("Discount code already applied. Only one discount code per order is allowed.")
        
        # Re-fetch with row-level lock to prevent race conditions on max_uses
        discount_code_obj = DiscountCode.objects.select_for_update().get(pk=discount_code_obj.pk)
        
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
            
            # Apply free shipping if code provides it
            # Update the actual shipping_cost field in database to 0
            if result.get('is_free_shipping', False):
                self.shipping_cost = Decimal('0')
            
            # Recalculate total with discount and updated shipping cost
            self.total_amount = subtotal - self.discount_amount + self.shipping_cost
            self.save()
            
            # Increment usage count
            discount_code_obj.usage_count += 1
            if discount_code_obj.max_uses is not None and discount_code_obj.usage_count >= discount_code_obj.max_uses:
                discount_code_obj.is_used = True
            discount_code_obj.save()
            
            return True
        return False
    
    def remove_discount(self):
        """
        Remove applied discount code from this order.
        Recalculates total without discount and restores original shipping cost.
        """
        if self.discount_code:
            # Store whether the code provided free shipping
            had_free_shipping = self.discount_code.is_free_shipping
            
            # Decrement usage count
            self.discount_code.usage_count = max(0, self.discount_code.usage_count - 1)
            if self.discount_code.max_uses is not None and self.discount_code.usage_count < self.discount_code.max_uses:
                self.discount_code.is_used = False
            self.discount_code.save()
            
            # Remove discount
            self.discount_code = None
            self.discount_amount = 0
            
            # Recalculate subtotal
            subtotal = sum(item.price_at_purchase * item.quantity for item in self.items.all())
            
            # If the code provided free shipping, recalculate shipping cost from settings
            if had_free_shipping:
                from settings.models import MainSettings
                from decimal import Decimal
                
                settings = MainSettings.objects.first()
                if settings:
                    shipping_cost_map = {
                        'pickup': settings.pickup_cost,
                        'dpd_courier': settings.dpd_courier_cost,
                        'packeta_box': settings.packeta_box_cost,
                        'packeta_courier': settings.packeta_courier_cost,
                        'digital_delivery': Decimal('0.00'),
                    }
                    shipping_cost = shipping_cost_map.get(self.shipping_method, Decimal('0.00'))
                    
                    # Apply free shipping threshold
                    if subtotal >= settings.free_shipping_threshold:
                        shipping_cost = Decimal('0.00')
                    
                    self.shipping_cost = shipping_cost
            
            # Recalculate total
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
        related_name='order_items',
        null=True,
        blank=True,
    )
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.PROTECT,
        related_name='order_items',
        null=True,
        blank=True,
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
        if self.product:
            return f"{self.product.name} x{self.quantity}"
        if self.ticket:
            return f"[Vstupenka] {self.ticket.name} x{self.quantity}"
        return f"Položka objednávky x{self.quantity}"
    
    def clean(self):
        """
        Validation logic - stock reservation for products, basic checks for tickets.
        This is called before saving the order item.
        """
        # Exactly one of product or ticket must be set
        if not self.product and not self.ticket:
            raise ValidationError("An order item must have either a product or a ticket.")
        if self.product and self.ticket:
            raise ValidationError("An order item cannot have both a product and a ticket.")

        if self.product and not self.pk:  # Only check stock for new product items
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

        if self.ticket and not self.pk:  # Validate ticket stock for new ticket items
            if self.ticket.total_quantity > 0:  # 0 = unlimited
                sold = OrderItem.objects.filter(
                    ticket=self.ticket,
                    order__status__in=['created', 'paid', 'shipped', 'delivered']
                ).aggregate(total=models.Sum('quantity'))['total'] or 0
                available = self.ticket.total_quantity - sold
                if self.quantity > available:
                    raise ValidationError(
                        f"Not enough tickets for {self.ticket.name}. "
                        f"Available: {available}, Requested: {self.quantity}"
                    )

    def save(self, *args, **kwargs):
        # Store current price if not set
        if self.price_at_purchase is None:
            if self.product and self.product.price is not None:
                # Use discount price if available, otherwise regular price
                if self.product.discount_price is not None:
                    self.price_at_purchase = self.product.discount_price
                else:
                    self.price_at_purchase = self.product.price
            elif self.ticket and self.ticket.price is not None:
                if self.ticket.discount_price is not None:
                    self.price_at_purchase = self.ticket.discount_price
                else:
                    self.price_at_purchase = self.ticket.price
            else:
                raise ValidationError("Product or ticket must have a price set")
        
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
            ticket_id = item_data.get('ticket_id')
            if ticket_id:
                try:
                    ticket = Ticket.objects.select_for_update().get(id=ticket_id)
                except Ticket.DoesNotExist:
                    raise ValidationError(f"Ticket with id {ticket_id} does not exist.")
                order_item = OrderItem(
                    order=order,
                    ticket=ticket,
                    quantity=item_data['quantity']
                )
            else:
                try:
                    product = Product.objects.select_for_update().get(
                        id=item_data['product_id']
                    )
                except Product.DoesNotExist:
                    raise ValidationError(f"Product with id {item_data['product_id']} does not exist.")
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
                'digital_delivery': Decimal('0.00'),
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


def generate_ticket_code():
    """Generate a unique 8-character uppercase alphanumeric code for a purchased ticket."""
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(secrets.choice(alphabet) for _ in range(8))
        if not PurchasedTicket.objects.filter(code=code).exists():
            return code


class PurchasedTicket(models.Model):
    """Unique access code generated for each ticket unit after successful payment."""
    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name='purchased_tickets',
    )
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.PROTECT,
        related_name='purchased_tickets',
    )
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.PROTECT,
        related_name='purchased_tickets',
    )
    code = models.CharField(max_length=8, unique=True, help_text="Unique 8-character access code")
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    used_by_note = models.CharField(max_length=200, blank=True, help_text="Optional note when marking as used")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'purchased_tickets'
        verbose_name = 'Kúpená vstupenka'
        verbose_name_plural = 'Kúpené vstupenky'
        ordering = ['-created_at']

    def __str__(self):
        status = "✓ použitá" if self.is_used else "platná"
        return f"{self.code} – {self.ticket.name} ({status})"
