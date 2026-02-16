"""
Packeta API Service for creating shipments
Documentation: https://docs.packeta.com/
"""
import requests
import logging
from decimal import Decimal
from typing import Optional, Dict
from django.conf import settings as django_settings

logger = logging.getLogger(__name__)


class PacketaAPIError(Exception):
    """Custom exception for Packeta API errors"""
    pass


class PacketaService:
    """Service for interacting with Packeta REST API"""
    
    BASE_URL = "https://www.zasilkovna.cz/api/rest"
    
    def __init__(self, api_password: str, sender_id: Optional[str] = None, test_mode: bool = True):
        """
        Initialize Packeta service
        
        Args:
            api_password: Packeta REST API password
            sender_id: Your Packeta sender ID (optional - can be auto-detected)
            test_mode: If True, only logs actions without creating real shipments
        """
        self.api_password = api_password
        self.sender_id = sender_id
        self.test_mode = test_mode
        
    def create_packet(self, order) -> Dict:
        """
        Create a packet (shipment) in Packeta system
        
        Args:
            order: Order instance with shipping details
            
        Returns:
            dict with packet_id and barcode
            
        Raises:
            PacketaAPIError: If API request fails
        """
        # Validate required fields
        if order.shipping_method == 'packeta_box' and not order.packeta_point_id:
            raise PacketaAPIError("Packeta point ID is required for packeta_box shipping")
        
        # Split shipping name into first name and surname
        name_parts = order.shipping_name.strip().split(maxsplit=1)
        first_name = name_parts[0] if name_parts else order.shipping_name
        surname = name_parts[1] if len(name_parts) > 1 else first_name
        
        # Prepare packet data
        packet_data = {
            "apiPassword": self.api_password,
            "packetAttributes": {
                "number": str(order.id),  # Your internal order number
                "name": first_name,
                "surname": surname,
                "email": order.user.email,
                "phone": order.phone,
                "addressId": order.packeta_point_id if order.shipping_method == 'packeta_box' else None,
                "value": float(order.total_amount),
                "currency": "EUR",
                "cod": 0,  # Cash on delivery amount (0 for prepaid orders)
                "weight": self._estimate_weight(order),
                "eshop": django_settings.ALLOWED_HOSTS[0] if django_settings.ALLOWED_HOSTS else "waketfup.com",
            }
        }
        
        # Add sender ID if provided
        if self.sender_id:
            packet_data["packetAttributes"]["senderId"] = self.sender_id
        
        # For courier delivery, add address details
        if order.shipping_method in ['packeta_courier', 'dpd_courier']:
            packet_data["packetAttributes"].update({
                "street": order.shipping_address,
                "city": order.shipping_city,
                "zip": order.shipping_postal_code,
                "country": order.shipping_country,
            })
        
        # TEST MODE - Only log, don't create real shipment
        if self.test_mode:
            logger.info(f"[TEST MODE] Would create Packeta packet for order {order.id}")
            logger.info(f"[TEST MODE] Packet data: {packet_data}")
            
            # Return fake tracking data for testing
            fake_packet_id = f"TEST_{order.id}_{order.created_at.strftime('%Y%m%d%H%M%S')}"
            fake_barcode = f"Z{order.id:010d}"
            
            logger.info(f"[TEST MODE] Generated fake packet_id: {fake_packet_id}, barcode: {fake_barcode}")
            
            return {
                "packet_id": fake_packet_id,
                "barcode": fake_barcode,
                "tracking_url": f"https://tracking.packeta.com/en/?id={fake_barcode}"
            }
        
        # REAL MODE - Create actual shipment
        try:
            response = requests.post(
                f"{self.BASE_URL}/packet",
                json=packet_data,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            
            if result.get("status") == "ok":
                packet_id = result["detail"][0]["id"]
                barcode = result["detail"][0]["barcode"]
                
                logger.info(f"Created Packeta packet {packet_id} for order {order.id}")
                
                return {
                    "packet_id": packet_id,
                    "barcode": barcode,
                    "tracking_url": f"https://tracking.packeta.com/en/?id={barcode}"
                }
            else:
                error_msg = result.get("fault", {}).get("string", "Unknown error")
                raise PacketaAPIError(f"Packeta API error: {error_msg}")
                
        except requests.RequestException as e:
            logger.error(f"Failed to create Packeta packet for order {order.id}: {str(e)}")
            raise PacketaAPIError(f"Failed to connect to Packeta API: {str(e)}")
    
    def _estimate_weight(self, order) -> float:
        """
        Estimate package weight based on order items
        
        Args:
            order: Order instance
            
        Returns:
            Weight in kg
        """
        # Default weight calculation - you can improve this
        # based on actual product weights in your Product model
        item_count = sum(item.quantity for item in order.items.all())
        
        # Estimate ~0.5kg per item (adjust based on your products)
        estimated_weight = item_count * 0.5
        
        # Minimum 0.1kg, maximum 30kg for standard Packeta
        return max(0.1, min(estimated_weight, 30.0))
    
    def get_packet_status(self, packet_id: str) -> Dict:
        """
        Get status of existing packet
        
        Args:
            packet_id: Packeta packet ID
            
        Returns:
            dict with packet status information
        """
        try:
            response = requests.get(
                f"{self.BASE_URL}/packet/{packet_id}",
                params={"apiPassword": self.api_password},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get Packeta packet status {packet_id}: {str(e)}")
            raise PacketaAPIError(f"Failed to get packet status: {str(e)}")
    
    @classmethod
    def from_settings(cls) -> Optional['PacketaService']:
        """
        Create PacketaService instance from Django settings
        
        Returns:
            PacketaService instance or None if credentials not configured
        """
        from django.conf import settings
        
        api_password = settings.PACKETA_API_PASSWORD
        sender_id = settings.PACKETA_SENDER_ID
        real_world_usage = settings.PACKETA_REAL_WORLD_USAGE
        
        if not api_password:
            logger.warning(
                "Packeta API password not configured. "
                "Set PACKETA_API_PASSWORD in .env file"
            )
            return None
        
        # Test mode is inverse of real world usage
        test_mode = not real_world_usage
        
        if test_mode:
            logger.info("Packeta service initialized in TEST MODE - no real shipments will be created")
        else:
            logger.info("Packeta service initialized in REAL MODE - actual shipments will be created")
        
        return cls(
            api_password=api_password,
            sender_id=sender_id if sender_id else None,
            test_mode=test_mode
        )
