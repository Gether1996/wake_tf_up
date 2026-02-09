import { Injectable, signal, computed, effect, untracked, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CartItem, Product } from '../api/api.models';
import { NotificationService } from '../services/notification.service';import { LanguageService } from '../services/language.service';import { environment } from '../../../environments/environment';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private languageService = inject(LanguageService);
  private readonly CART_KEY = 'cart';
  private apiUrl = `${environment.apiUrl}/products`;
  
  private cartItems = signal<CartItem[]>(this.loadCart());

  readonly items = this.cartItems.asReadonly();
  readonly itemCount = computed(() => 
    this.items().reduce((total, item) => total + item.quantity, 0)
  );
  readonly subtotal = computed(() => 
    this.items().reduce((total, item) => {
      const price = item.product.discount_price 
        ? parseFloat(item.product.discount_price) 
        : parseFloat(item.product.price);
      return total + (price * item.quantity);
    }, 0)
  );
  readonly total = computed(() => this.subtotal());
  readonly isEmpty = computed(() => this.items().length === 0);

  constructor() {
    // Persist cart to localStorage on every change
    effect(() => {
      this.saveCart(this.cartItems());
    });

    // Refresh cart products when language changes
    effect(() => {
      this.languageService.currentLang(); // Track the signal
      // Use untracked to avoid re-triggering when cart items change
      if (untracked(() => this.items().length) > 0) {
        this.refreshCartProducts();
      }
    });
  }

  addToCart(product: Product, quantity: number = 1): void {
    const currentItems = this.cartItems();
    const existingItem = currentItems.find(item => item.product.id === product.id);

    if (existingItem) {
      // Check if adding more would exceed stock
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.available_stock) {
        this.notificationService.warning(
          `Cannot add more. Only ${product.available_stock} items available in stock.`
        );
        // Set to max available stock
        const updatedItems = currentItems.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: product.available_stock }
            : item
        );
        this.cartItems.set(updatedItems);
        return;
      }
      
      // Update quantity
      const updatedItems = currentItems.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: newQuantity }
          : item
      );
      this.cartItems.set(updatedItems);
    } else {
      // Check stock before adding new item
      const addQuantity = Math.min(quantity, product.available_stock);
      if (addQuantity <= 0) {
        this.notificationService.error('Product is out of stock.');
        return;
      }
      
      if (addQuantity < quantity) {
        this.notificationService.warning(
          `Only ${addQuantity} items available. Added ${addQuantity} to cart.`
        );
      }
      
      // Add new item
      this.cartItems.set([...currentItems, { product, quantity: addQuantity }]);
    }
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    // Find the product to check stock
    const item = this.cartItems().find(item => item.product.id === productId);
    if (!item) return;

    // Check if exceeds available stock
    if (quantity > item.product.available_stock) {
      this.notificationService.warning(
        `Maximum quantity available: ${item.product.available_stock}`
      );
    }

    // Limit to available stock
    const limitedQuantity = Math.min(quantity, item.product.available_stock);
    
    const updatedItems = this.cartItems().map(item =>
      item.product.id === productId
        ? { ...item, quantity: limitedQuantity }
        : item
    );
    this.cartItems.set(updatedItems);
  }

  removeFromCart(productId: number): void {
    const updatedItems = this.cartItems().filter(item => item.product.id !== productId);
    this.cartItems.set(updatedItems);
  }

  clearCart(): void {
    this.cartItems.set([]);
  }

  /**
   * Validate and adjust cart items based on current stock availability.
   * This should be called when cart is loaded or when product details are refreshed.
   */
  validateCartStock(): void {
    const currentItems = this.cartItems();
    let hasChanges = false;
    
    const validatedItems = currentItems.map(item => {
      // Skip validation for pre-order products
      if (item.product.pre_order_enabled) {
        return item;
      }
      
      // If quantity exceeds available stock, adjust it
      if (item.quantity > item.product.available_stock) {
        hasChanges = true;
        this.notificationService.info(
          `Adjusted quantity for ${item.product.name} to ${item.product.available_stock} (max available)`
        );
        return { ...item, quantity: item.product.available_stock };
      }
      
      return item;
    }).filter(item => {
      // Remove items that are out of stock
      if (!item.product.pre_order_enabled && item.product.available_stock <= 0) {
        hasChanges = true;
        this.notificationService.warning(
          `Removed ${item.product.name} from cart - out of stock`
        );
        return false;
      }
      return true;
    });
    
    if (hasChanges) {
      this.cartItems.set(validatedItems);
    }
  }

  getItemQuantity(productId: number): number {
    const item = this.items().find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  }

  /**
   * Refresh all products in cart with latest data from API
   * This ensures prices and stock levels are up to date
   */
  refreshCartProducts(): void {
    const currentItems = this.cartItems();
    if (currentItems.length === 0) return;

    console.log('[CartService] Refreshing cart products...', currentItems.map(i => i.product.slug));

    // Fetch all products in cart
    const productRequests = currentItems.map(item =>
      this.http.get<Product>(`${this.apiUrl}/${item.product.slug}/`).pipe(
        catchError(err => {
          console.error(`[CartService] Failed to fetch product ${item.product.slug}:`, err.status, err.message);
          return of(null);
        })
      )
    );

    forkJoin(productRequests).subscribe(updatedProducts => {
      console.log('[CartService] Received updated products:', updatedProducts);
      
      const refreshedItems = currentItems
        .map((item, index) => {
          const updatedProduct = updatedProducts[index];
          if (!updatedProduct) {
            // Product no longer exists - will be filtered out below
            console.warn(`[CartService] Product ${item.product.name} (${item.product.slug}) returned null - removing`);
            this.notificationService.warning(
              `${item.product.name} is no longer available and was removed from cart`
            );
            return null;
          }
          
          console.log(`[CartService] Updated product ${updatedProduct.slug}: published=${updatedProduct.is_published}`);
          
          // Update product data but keep the quantity
          return {
            ...item,
            product: updatedProduct
          };
        })
        .filter((item): item is CartItem => item !== null) // Remove null items (404 products)
        .filter(item => {
          // Remove items that are explicitly unpublished
          if (item.product.is_published === false) {
            console.warn(`[CartService] Product ${item.product.name} is unpublished - removing`);
            this.notificationService.warning(
              `Removed ${item.product.name} from cart - no longer available`
            );
            return false;
          }
          return true;
        });

      console.log('[CartService] Final refreshed items:', refreshedItems.length);
      this.cartItems.set(refreshedItems);
      this.validateCartStock();
    });
  }

  private loadCart(): CartItem[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    
    try {
      const stored = localStorage.getItem(this.CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveCart(items: CartItem[]): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.CART_KEY, JSON.stringify(items));
    }
  }
}
