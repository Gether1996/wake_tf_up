export interface User {
  id: number;
  email: string;
  phone: string;
  first_name?: string;
  last_name?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  theme_preference?: 'light' | 'dark' | 'auto';
  is_staff?: boolean;
  is_superuser?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password2: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  language?: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  discount_price?: string;
  category: Category;
  color: Color | null;
  total_stock: number;
  sold_quantity?: number; // Only in detail view
  available_stock: number;
  is_in_stock: boolean;
  pre_order_enabled: boolean;
  is_limited_drop: boolean;
  is_recycled: boolean;
  is_published: boolean;
  images: ProductImage[];
  videos?: ProductVideo[]; // Multiple videos in detail view
  primary_image?: string; // Primary image URL in list view
  created_at: string;
  updated_at?: string; // Only in detail view
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Color {
  id: number;
  name: string;
  hex_code: string;
}

export interface ProductImage {
  id: number;
  image: string;
  order: number;
}

export interface ProductVideo {
  id: number;
  video: string;
  thumbnail: string;
  order: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: number;
  status: string;
  shipping_method: 'pickup' | 'dpd_courier' | 'packeta_box' | 'packeta_courier';
  payment_method?: 'gopay' | 'cash_on_pickup';
  shipping_cost: string;
  total_amount: string;
  discount_amount: string;
  discount_code_display?: string;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  phone: string;
  packeta_point_id?: string;
  packeta_point_name?: string;
  packeta_point_address?: string;
  tracking_number?: string;
  carrier_tracking_url?: string;
  is_company_purchase: boolean;
  billing_company?: string;
  billing_ico?: string;
  billing_dic?: string;
  billing_ic_dph?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  guest_access_token?: string | null;
  frontend_order_url?: string | null;
  items_count?: number; // Computed field from backend
  is_pre_order?: boolean; // Computed field from backend
}

export interface OrderItem {
  id?: number;
  product: Product | null;
  ticket: Ticket | null;
  quantity: number;
  price_at_purchase: string;
  is_pre_order: boolean;
  subtotal?: string; // Computed field from backend
}

export interface Ticket {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  discount_price?: string;
  event_date?: string;
  event_location?: string;
  total_quantity: number;
  sold_quantity?: number;
  is_published: boolean;
  images?: TicketImage[];
  primary_image?: string;
  created_at: string;
  updated_at?: string;
}

export interface TicketImage {
  id: number;
  image: string;
  order: number;
}

export interface PurchasedTicket {
  id: number;
  code: string;
  ticket: Ticket;
  is_used: boolean;
  used_at?: string;
  created_at: string;
}

export interface Review {
  id: number;
  user: User;
  product: number | Product;  // Can be ID or full product object
  rating: number;
  text: string;
  reviewer_name?: string;  // Optional reviewer name
  display_name?: string;  // Name to display (from backend)
  is_anonymous: boolean;
  created_at: string;
}

export interface FeaturedReview {
  id: number;
  user: User;
  product: {
    id: number;
    name: string;
    slug: string;
    price: string;
    discount_price?: string;
    image_url?: string;
  };
  rating: number;
  text: string;
  display_name: string;  // Name to display (from backend)
  is_anonymous: boolean;
  created_at: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content_html: string;
  excerpt?: string;
  author?: string;
  is_published: boolean;
  created_at: string;
}

export interface Event {
  id: number;
  title: string;
  slug: string;
  content_html: string;
  excerpt?: string;
  author?: string;
  datetime: string;
  place: string;
  is_published: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
