from rest_framework import serializers
from .models import Product, Category, Color, ProductImage, ProductVideo, Ticket, TicketImage


class TranslatableSerializerMixin:
    """Mixin to handle language selection in serializers"""
    def get_language(self):
        """Get language from request context (query param or Accept-Language header)"""
        request = self.context.get('request')
        if request:
            # Try query parameter first (e.g., ?lang=en)
            lang = request.query_params.get('lang')
            if lang:
                return lang.lower()
            
            # Try Accept-Language header
            accept_lang = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
            if 'en' in accept_lang.lower():
                return 'en'
        
        # Default to Slovak
        return 'sk'


class RelativeImageField(serializers.ImageField):
    """Custom ImageField that returns relative URLs instead of absolute"""
    def to_representation(self, value):
        if not value:
            return None
        # Return relative URL path (nginx handles the domain)
        return value.url


class RelativeFileField(serializers.FileField):
    """Custom FileField that returns relative URLs instead of absolute"""
    def to_representation(self, value):
        if not value:
            return None
        # Return relative URL path (nginx handles the domain)
        return value.url


class CategorySerializer(TranslatableSerializerMixin, serializers.ModelSerializer):
    """Serializer for categories"""
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug')
    
    def get_name(self, obj):
        """Return name based on language"""
        lang = self.get_language()
        if lang == 'en' and obj.en_name:
            return obj.en_name
        return obj.name


class ColorSerializer(TranslatableSerializerMixin, serializers.ModelSerializer):
    """Serializer for colors"""
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = Color
        fields = ('id', 'name', 'hex_code')
    
    def get_name(self, obj):
        """Return name based on language"""
        lang = self.get_language()
        if lang == 'en' and obj.en_name:
            return obj.en_name
        return obj.name


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for product images"""
    image = RelativeImageField()
    
    class Meta:
        model = ProductImage
        fields = ('id', 'image', 'order')


class ProductVideoSerializer(serializers.ModelSerializer):
    """Serializer for product videos"""
    video = RelativeFileField()
    thumbnail = RelativeImageField()
    
    class Meta:
        model = ProductVideo
        fields = ('id', 'video', 'thumbnail', 'order')


class ProductListSerializer(TranslatableSerializerMixin, serializers.ModelSerializer):
    """Serializer for product list view"""
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    available_stock = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = (
            'id', 'name', 'description', 'slug', 'category', 'color',
            'price', 'discount_price', 'total_stock', 'available_stock', 'is_in_stock', 'is_published',
            'pre_order_enabled', 'is_limited_drop', 'is_recycled', 'primary_image', 'created_at'
        )
    
    def get_name(self, obj):
        """Return name based on language"""
        lang = self.get_language()
        if lang == 'en' and obj.en_name:
            return obj.en_name
        return obj.name
    
    def get_description(self, obj):
        """Return description based on language"""
        lang = self.get_language()
        if lang == 'en' and obj.en_description:
            return obj.en_description
        return obj.description
    
    def get_category(self, obj):
        """Return category with correct language"""
        return CategorySerializer(obj.category, context=self.context).data
    
    def get_color(self, obj):
        """Return color with correct language"""
        if not obj.color:
            return None
        return ColorSerializer(obj.color, context=self.context).data

    def get_primary_image(self, obj):
        """Get the first image as primary"""
        image = obj.images.first()
        if image:
            # Return relative URL path instead of absolute URL
            # Nginx reverse proxy will handle proper domain
            return image.image.url
        return None


class ProductDetailSerializer(TranslatableSerializerMixin, serializers.ModelSerializer):
    """Detailed serializer for product detail view"""
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    videos = ProductVideoSerializer(many=True, read_only=True)
    available_stock = serializers.ReadOnlyField()
    sold_quantity = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = (
            'id', 'name', 'description', 'slug', 'category', 'color',
            'price', 'discount_price', 'total_stock', 'sold_quantity', 'available_stock',
            'is_in_stock', 'pre_order_enabled', 'is_limited_drop', 'is_recycled', 'is_published',
            'images', 'videos', 'created_at', 'updated_at'
        )
    
    def get_name(self, obj):
        """Return name based on language"""
        lang = self.get_language()
        if lang == 'en' and obj.en_name:
            return obj.en_name
        return obj.name
    
    def get_description(self, obj):
        """Return description based on language"""
        lang = self.get_language()
        if lang == 'en' and obj.en_description:
            return obj.en_description
        return obj.description
    
    def get_category(self, obj):
        """Return category with correct language"""
        return CategorySerializer(obj.category, context=self.context).data
    
    def get_color(self, obj):
        """Return color with correct language"""
        if not obj.color:
            return None
        return ColorSerializer(obj.color, context=self.context).data


# ============ ADMIN SERIALIZERS (return all fields for editing) ============

class CategoryAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for categories - returns all language fields"""
    class Meta:
        model = Category
        fields = ('id', 'name', 'en_name', 'slug', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')


class ColorAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for colors - returns all language fields"""
    class Meta:
        model = Color
        fields = ('id', 'name', 'en_name', 'hex_code', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')


class ProductAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for products - returns all language fields"""
    category = CategoryAdminSerializer(read_only=True)
    color = ColorAdminSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True
    )
    color_id = serializers.PrimaryKeyRelatedField(
        queryset=Color.objects.all(),
        source='color',
        write_only=True,
        required=False,
        allow_null=True,
    )
    images = ProductImageSerializer(many=True, read_only=True)
    videos = ProductVideoSerializer(many=True, read_only=True)
    available_stock = serializers.ReadOnlyField()
    sold_quantity = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = (
            'id', 'name', 'en_name', 'description', 'en_description', 'slug',
            'category', 'category_id', 'color', 'color_id',
            'price', 'discount_price', 'total_stock', 'sold_quantity', 'available_stock',
            'is_in_stock', 'pre_order_enabled', 'is_limited_drop', 'is_recycled', 'is_published',
            'images', 'videos', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at', 'available_stock', 'sold_quantity', 'is_in_stock')


# ============ TICKET SERIALIZERS ============

class TicketImageSerializer(serializers.ModelSerializer):
    """Serializer for ticket images — returns relative URLs (nginx handles the domain)"""
    image = RelativeImageField()

    class Meta:
        model = TicketImage
        fields = ('id', 'image', 'order')


class TicketListSerializer(TranslatableSerializerMixin, serializers.ModelSerializer):
    """Public serializer for ticket list view"""
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    sold_quantity = serializers.ReadOnlyField()
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'name', 'description', 'slug',
            'price', 'discount_price', 'event_date', 'event_location',
            'total_quantity', 'sold_quantity', 'is_published', 'primary_image', 'created_at'
        )

    def get_name(self, obj):
        lang = self.get_language()
        if lang == 'en' and obj.en_name:
            return obj.en_name
        return obj.name

    def get_description(self, obj):
        lang = self.get_language()
        if lang == 'en' and obj.en_description:
            return obj.en_description
        return obj.description

    def get_primary_image(self, obj):
        image = obj.images.first()
        if image:
            return image.image.url
        return None


class TicketDetailSerializer(TicketListSerializer):
    """Detailed public serializer for ticket detail view"""
    images = TicketImageSerializer(many=True, read_only=True)

    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + ('images', 'en_name', 'en_description', 'updated_at')


class TicketAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for tickets - returns all language fields"""
    sold_quantity = serializers.ReadOnlyField()
    images = TicketImageSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = (
            'id', 'name', 'en_name', 'description', 'en_description', 'slug',
            'price', 'discount_price', 'event_date', 'event_location',
            'total_quantity', 'sold_quantity', 'is_published',
            'images', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at', 'sold_quantity')
