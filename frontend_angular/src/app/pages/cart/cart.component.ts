import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { CartService } from '../../core/api/cart.service';
import { SettingsService } from '../../core/api/settings.service';
import { LanguageService } from '../../core/services/language.service';
import { DialogService } from '../../core/services/dialog.service';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl md:text-4xl font-bold mb-4">{{ 'cart.title' | transloco }}</h1>

      <!-- Free Shipping Info Banner -->
      @if (cartService.items().length > 0) {
        <div class="mb-8 p-4 border border-border rounded-lg bg-muted/50">
          @if (cartService.subtotal() >= freeShippingThreshold()) {
            <div class="flex items-center gap-2 text-success">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="font-medium">{{ 'cart.free_shipping_unlocked' | transloco }}</span>
            </div>
          } @else {
            <div class="flex items-center gap-2 text-info">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ 'cart.free_shipping_info' | transloco: { amount: freeShippingThreshold() | currency: 'EUR' } }}</span>
            </div>
            <div class="mt-2 ml-7">
              <div class="w-full bg-border rounded-full h-2">
                <div 
                  class="bg-info h-2 rounded-full transition-all duration-300"
                  [style.width.%]="(cartService.subtotal() / freeShippingThreshold()) * 100">
                </div>
              </div>
              <p class="text-xs text-muted-foreground mt-1">
                {{ 'cart.free_shipping_remaining' | transloco: { amount: (freeShippingThreshold() - cartService.subtotal()) | currency: 'EUR' } }}
              </p>
            </div>
          }
        </div>
      }

      @if (cartService.items().length === 0) {
        <!-- Empty Cart -->
        <div class="text-center py-16">
          <svg class="w-24 h-24 mx-auto mb-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h2 class="text-2xl font-bold mb-4">{{ 'cart.empty' | transloco }}</h2>
          <p class="text-muted-foreground mb-6">{{ 'cart.empty_description' | transloco }}</p>
          <app-button [variant]="'primary'" [routerLink]="shopLink()">
            {{ 'cart.continueShopping' | transloco }}
          </app-button>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Cart Items -->
          <div class="lg:col-span-2 space-y-4">
            @for (item of cartService.items(); track item.product.id) {
              <div class="flex gap-4 border border-border p-4 transition-all hover:border-foreground">
                <!-- Product Image -->
                <a [routerLink]="productLink(item.product.slug)" class="flex-shrink-0">
                  <div class="w-24 h-32 bg-muted overflow-hidden">
                    @if (getProductImage(item.product)) {
                      <img 
                        [src]="getProductImage(item.product)" 
                        [alt]="item.product.name"
                        class="w-full h-full object-cover">
                    }
                  </div>
                </a>

                <!-- Product Info -->
                <div class="flex-1 min-w-0">
                  <a 
                    [routerLink]="productLink(item.product.slug)"
                    class="font-medium hover:text-accent transition-colors block mb-1">
                    {{ item.product.name }}
                  </a>
                  
                  @if (item.product.category) {
                    <p class="text-sm text-muted-foreground font-mono uppercase mb-2">
                      {{ item.product.category.name }}
                    </p>
                  }

                  @if (item.product.color) {
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-sm text-muted-foreground">{{ 'product.color' | transloco }}:</span>
                      <div 
                        class="w-4 h-4 rounded-full border border-border"
                        [style.background-color]="item.product.color.hex_code">
                      </div>
                      <span class="text-sm">{{ item.product.color.name }}</span>
                    </div>
                  }

                  <!-- Price -->
                  <div class="flex items-baseline gap-2 mb-3">
                    @if (item.product.discount_price) {
                      <span class="font-medium">{{ item.product.discount_price | currency: 'EUR' }}</span>
                      <span class="text-sm text-muted-foreground line-through">{{ item.product.price | currency: 'EUR' }}</span>
                    } @else {
                      <span class="font-medium">{{ item.product.price | currency: 'EUR' }}</span>
                    }
                  </div>
                  
                  <!-- Price without VAT Note -->
                  <div class="text-xs text-muted-foreground mb-3 mt-2">
                    <p class="text-xs mb-2"><span class="font-normal">{{ 'product.price_with_vat' | transloco }}</span></p>
                    @if (item.product.discount_price) {
                      <p>{{ 'product.price_without_vat' | transloco }}: {{ getPriceWithoutVat(item.product.discount_price) | currency: 'EUR' }}</p>
                    } @else {
                      <p>{{ 'product.price_without_vat' | transloco }}: {{ getPriceWithoutVat(item.product.price) | currency: 'EUR' }}</p>
                    }
                  </div>

                  <!-- Quantity Controls -->
                  <div class="flex items-center gap-4">
                    <div class="flex items-center border border-border">
                      <button 
                        (click)="updateQuantity(item.product.id, item.quantity - 1)"
                        [disabled]="updating()"
                        class="px-3 py-1 hover:bg-muted transition-colors disabled:opacity-50">
                        -
                      </button>
                      <span class="px-4 py-1 font-mono min-w-[3rem] text-center">{{ item.quantity }}</span>
                      <button 
                        (click)="updateQuantity(item.product.id, item.quantity + 1)"
                        [disabled]="updating() || (!item.product.pre_order_enabled && item.quantity >= item.product.available_stock)"
                        class="px-3 py-1 hover:bg-muted transition-colors disabled:opacity-50">
                        +
                      </button>
                    </div>

                    <button 
                      (click)="removeItem(item.product.id)"
                      [disabled]="updating()"
                      class="text-sm text-danger hover:underline disabled:opacity-50">
                      {{ 'cart.remove' | transloco }}
                    </button>
                  </div>

                  <!-- Stock Warning -->
                  @if (!item.product.pre_order_enabled && item.quantity >= item.product.available_stock) {
                    <p class="text-sm text-warning mt-2">
                      {{ 'cart.max_quantity' | transloco }}
                    </p>
                  }
                </div>

                <!-- Item Total -->
                <div class="text-right flex-shrink-0">
                  <p class="font-bold">
                    {{ getItemTotal(item) | currency: 'EUR' }}
                  </p>
                </div>
              </div>
            }
          </div>

          <!-- Order Summary -->
          <div class="lg:col-span-1">
            <div class="border border-border p-6 sticky top-4">
              <h2 class="text-xl font-bold mb-6">{{ 'cart.order_summary' | transloco }}</h2>

              <div class="space-y-3 mb-6 pb-6 border-b border-border">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ 'cart.subtotal' | transloco }}</span>
                  <span class="font-medium">{{ cartService.subtotal() | currency: 'EUR' }}</span>
                </div>

                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ 'cart.shipping' | transloco }}</span>
                  <span class="text-sm text-muted-foreground">{{ 'cart.calculated_at_checkout' | transloco }}</span>
                </div>
              </div>

              <div class="flex justify-between text-lg font-bold mb-6">
                <span>{{ 'cart.subtotal' | transloco }}</span>
                <span>{{ cartService.subtotal() | currency: 'EUR' }}</span>
              </div>

              <app-button 
                [variant]="'primary'"
                [size]="'lg'"
                [fullWidth]="true"
                [disabled]="updating()"
                [routerLink]="checkoutLink()">
                {{ 'cart.checkout' | transloco }}
              </app-button>

              <app-button 
                [variant]="'ghost'"
                [fullWidth]="true"
                class="mt-3"
                [routerLink]="shopLink()">
                {{ 'cart.continueShopping' | transloco }}
              </app-button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CartComponent implements OnInit {
  cartService = inject(CartService);
  settingsService = inject(SettingsService);
  private languageService = inject(LanguageService);
  private dialogService = inject(DialogService);
  
  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);
  checkoutLink = computed(() => `/${this.currentLang()}/checkout`);
  productLink = (slug: string) => `/${this.currentLang()}/product/${slug}`;
  
  updating = signal(false);
  
  // Get shipping values from settings service
  freeShippingThreshold = computed(() => {
    const threshold = this.settingsService.settings()?.free_shipping_threshold;
    return threshold ? Number(threshold) : 50;
  });
  shippingCost = computed(() => {
    const cost = this.settingsService.settings()?.standard_shipping_cost;
    return cost ? Number(cost) : 5.99;
  });

  total = computed(() => {
    const subtotal = this.cartService.subtotal();
    const shipping = subtotal >= this.freeShippingThreshold() ? 0 : this.shippingCost();
    return subtotal + shipping;
  });

  ngOnInit() {
    // Refresh cart products to get latest prices and stock from server
    this.cartService.refreshCartProducts();
  }

  getItemTotal(item: { product: any; quantity: number }): number {
    const price = item.product.discount_price 
      ? parseFloat(item.product.discount_price) 
      : parseFloat(item.product.price);
    return price * item.quantity;
  }

  getPriceWithoutVat(priceWithVat: string | number): number {
    const taxRate = this.settingsService.settings()?.tax_rate || 20;
    const price = typeof priceWithVat === 'string' ? parseFloat(priceWithVat) : priceWithVat;
    return price / (1 + taxRate / 100);
  }

  updateQuantity(productId: number, newQuantity: number) {
    if (newQuantity < 1) {
      this.removeItem(productId);
      return;
    }

    this.updating.set(true);
    this.cartService.updateQuantity(productId, newQuantity);
    setTimeout(() => this.updating.set(false), 200);
  }

  async removeItem(productId: number) {
    const confirmed = await this.dialogService.confirm({
      title: 'Remove Item',
      message: 'Are you sure you want to remove this item from your cart?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.updating.set(true);
    this.cartService.removeFromCart(productId);
    setTimeout(() => this.updating.set(false), 200);
  }

  getProductImage(product: any): string | null {
    // Try primary_image first (for list view)
    if (product.primary_image) {
      return product.primary_image;
    }
    // Fallback to images array (for detail view)
    if (product.images && product.images.length > 0) {
      return product.images[0].image;
    }
    return null;
  }
}
