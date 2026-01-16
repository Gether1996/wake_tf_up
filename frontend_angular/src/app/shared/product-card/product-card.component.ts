import { Component, input, computed, inject } from '@angular/core';
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
    <article class="group relative bg-background border border-border overflow-hidden transition-all hover:border-foreground">
      <!-- Product Image -->
      <a [routerLink]="productLink()" (click)="trackClick()">
        <div class="aspect-[3/4] overflow-hidden bg-muted">
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
      <div class="p-4">
        <a [routerLink]="productLink()" class="block group-hover:text-accent transition-colors">
          <h3 class="font-sans font-medium text-base mb-1">{{ product().name }}</h3>
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
        @if (product().available_stock === 0) {
          <p class="text-sm text-danger font-mono uppercase mb-3">{{ 'product.out_of_stock' | transloco }}</p>
        } @else if (product().available_stock < 5) {
          <p class="text-sm text-warning font-mono uppercase mb-3">
            {{ 'product.low_stock' | transloco }} ({{ product().available_stock }})
          </p>
        }

        <!-- Add to Cart Button -->
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
        }
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
  
  currentLang = this.languageService.currentLang;
  productLink = computed(() => `/${this.currentLang()}/product/${this.product().slug}`);
  
  addedToCart = signal(false);
  
  constructor(
    private cartService: CartService,
    private analyticsService: AnalyticsService
  ) {}

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
