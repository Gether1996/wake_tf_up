import { Component, input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product } from '../../core/api/api.models';
import { BadgeComponent } from '../badge/badge.component';
import { ButtonComponent } from '../button/button.component';
import { CartService } from '../../core/api/cart.service';
import { AnalyticsService } from '../../core/api/analytics.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-product-card',
  imports: [CommonModule, RouterModule, BadgeComponent, ButtonComponent, TranslocoModule],
  template: `
    <article class="group relative bg-background border border-border overflow-hidden transition-all hover:border-foreground flex flex-col h-full">
      <!-- Product Image -->
      <a [routerLink]="productLink()" (click)="trackClick()">
        <div class="aspect-square overflow-hidden bg-muted">
          @if (getProductImage()) {
            <img 
              [src]="getProductImage()" 
              [alt]="product().name"
              class="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy">
          } @else {
            <div class="w-full h-full flex items-center justify-center text-muted-foreground">
              <span class="font-mono text-sm">{{ 'common.no_image' | transloco }}</span>
            </div>
          }
        </div>
      </a>

      <!-- Badges -->
      @if (getBadges().length > 0) {
        <div class="absolute top-3 left-3 flex flex-col gap-2">
          @for (badge of getBadges(); track badge.type) {
            <app-badge [variant]="badge.type">
              {{ badge.label | transloco }}
            </app-badge>
          }
        </div>
      }

      <!-- Product Info -->
      <div class="p-4 flex flex-col flex-1">
        <a [routerLink]="productLink()" class="block group-hover:text-accent transition-colors">
          <h3 class="font-sans font-medium text-base mb-1 line-clamp-2 min-h-[3rem]">{{ product().name }}</h3>
        </a>
        
        @if (product().category) {
          <p class="text-sm text-muted-foreground font-mono uppercase tracking-wide mb-2">
            {{ product().category }}
          </p>
        }

        <!-- Price -->
        <div class="flex items-baseline gap-2 mb-3">
          @if (product().discount_price) {
            <span class="text-lg font-medium">{{ product().discount_price | currency: 'EUR' }}</span>
            <span class="text-sm text-muted-foreground line-through">{{ product().price | currency: 'EUR' }}</span>
          } @else {
            <span class="text-lg font-medium">{{ product().price | currency: 'EUR' }}</span>
          }
        </div>

        <!-- Stock Status -->
        <div class="min-h-[1.5rem] mb-3">
          @if (product().available_stock === 0) {
            <p class="text-sm text-danger font-mono uppercase">{{ 'product.out_of_stock' | transloco }}</p>
          } @else if (product().available_stock < 5) {
            <p class="text-sm text-warning font-mono uppercase">
              {{ 'product.low_stock' | transloco }} ({{ product().available_stock }})
            </p>
          } @else if (isInCart()) {
            <p class="text-sm text-accent font-mono uppercase flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ 'cart.in_cart' | transloco }} ({{ cartQuantity() }}×)
            </p>
          }
        </div>

        <!-- Add to Cart Button -->
        <div class="mt-auto flex gap-2">
          @if (product().available_stock > 0 || product().pre_order_enabled) {
            <app-button 
              [variant]="addedToCart() ? 'secondary' : 'primary'"
              [size]="'sm'"
              [fullWidth]="true"
              [disabled]="addedToCart()"
              (clicked)="addToCart()">
              @if (addedToCart()) {
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ 'cart.added' | transloco }}
              } @else {
                {{ (product().pre_order_enabled ? 'cart.preorder' : 'cart.add_to_cart') | transloco }}
              }
            </app-button>
            @if (isInCart()) {
              <button 
                (click)="removeFromCart($event)"
                class="px-3 text-sm text-danger hover:bg-danger/10 transition-colors border border-border rounded"
                [attr.aria-label]="'cart.remove' | transloco">
                ×
              </button>
            }
          }
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ProductCardComponent {
  product = input.required<Product>();
  private languageService = inject(LanguageService);
  private cartService = inject(CartService);
  private analyticsService = inject(AnalyticsService);
  
  currentLang = this.languageService.currentLang;
  productLink = computed(() => `/${this.currentLang()}/product/${this.product().slug}`);
  
  addedToCart = signal(false);
  
  // Check if product is in cart and get quantity
  cartQuantity = computed(() => this.cartService.getItemQuantity(this.product().id));
  isInCart = computed(() => this.cartQuantity() > 0);
  
  constructor() {}

  getBadges() {
    const badges: { type: 'drop' | 'recycled' | 'preorder', label: string }[] = [];
    
    if (this.product().is_limited_drop) {
      badges.push({ type: 'drop', label: 'badges.drop' });
    }
    if (this.product().is_recycled) {
      badges.push({ type: 'recycled', label: 'badges.recycled' });
    }
    if (this.product().pre_order_enabled) {
      badges.push({ type: 'preorder', label: 'badges.preorder' });
    }
    
    return badges;
  }

  addToCart() {
    this.cartService.addToCart(this.product(), 1);
    this.addedToCart.set(true);
    
    // Reset after 2 seconds
    setTimeout(() => {
      this.addedToCart.set(false);
    }, 2000);
  }

  increaseQuantity(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.updateQuantity(this.product().id, this.cartQuantity() + 1);
  }

  decreaseQuantity(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const newQty = this.cartQuantity() - 1;
    if (newQty <= 0) {
      this.removeFromCart(event);
    } else {
      this.cartService.updateQuantity(this.product().id, newQty);
    }
  }

  removeFromCart(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.removeFromCart(this.product().id);
  }

  trackClick() {
    this.analyticsService.trackProductClick(this.product().id);
  }
  
  getProductImage(): string | null {
    // Try primary_image first (for list view)
    if ((this.product() as any).primary_image) {
      return (this.product() as any).primary_image;
    }
    // Fallback to images array (for detail view)
    if (this.product().images && this.product().images.length > 0) {
      return this.product().images[0].image;
    }
    return null;
  }
}
