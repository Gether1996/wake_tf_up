import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CartItem, Product } from '../api/api.models';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private platformId = inject(PLATFORM_ID);
  private readonly CART_KEY = 'cart';
  
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
  }

  addToCart(product: Product, quantity: number = 1): void {
    const currentItems = this.cartItems();
    const existingItem = currentItems.find(item => item.product.id === product.id);

    if (existingItem) {
      // Update quantity
      const updatedItems = currentItems.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      this.cartItems.set(updatedItems);
    } else {
      // Add new item
      this.cartItems.set([...currentItems, { product, quantity }]);
    }
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const updatedItems = this.cartItems().map(item =>
      item.product.id === productId
        ? { ...item, quantity }
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

  getItemQuantity(productId: number): number {
    const item = this.items().find(item => item.product.id === productId);
    return item ? item.quantity : 0;
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
