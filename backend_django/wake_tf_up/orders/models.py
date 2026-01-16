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
        ('packeta', 'Packeta Z-Box'),
        ('courier', 'Courier'),
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
        default='courier',
        help_text="Delivery method selected by customer"
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
    
    # Order totals
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'orders'
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"Order #{self.id} - {self.user.email} - {self.status}"
    
    @property
    def is_pre_order(self):
        """Check if order contains any pre-order items"""
        return self.items.filter(is_pre_order=True).exists()


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
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'
    
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
            self.price_at_purchase = self.product.price
        
        # Run validation
        self.clean()
        
        super().save(*args, **kwargs)
    
    @property
    def subtotal(self):
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
        # Create order
        order = Order.objects.create(
            user=user,
            **shipping_data
        )
        
        total = 0
        
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
            
            total += order_item.subtotal
        
        # Update order total
        order.total_amount = total
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
