import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { CatalogService } from '../../core/api/catalog.service';
import { CartService } from '../../core/api/cart.service';
import { AnalyticsService } from '../../core/api/analytics.service';
import { LanguageService } from '../../core/services/language.service';
import { Product } from '../../core/api/api.models';
import { BadgeComponent } from '../../shared/badge/badge.component';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, RouterModule, TranslocoModule, BadgeComponent, ButtonComponent],
  template: `
    @if (loading()) {
      <div class="container mx-auto px-4 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="animate-pulse">
            <div class="aspect-[3/4] bg-muted mb-4"></div>
            <div class="grid grid-cols-4 gap-2">
              @for (i of [1,2,3,4]; track i) {
                <div class="aspect-square bg-muted"></div>
              }
            </div>
          </div>
          <div class="animate-pulse space-y-4">
            <div class="h-8 bg-muted rounded w-3/4"></div>
            <div class="h-6 bg-muted rounded w-1/4"></div>
            <div class="h-4 bg-muted rounded"></div>
            <div class="h-4 bg-muted rounded"></div>
            <div class="h-12 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    } @else if (error()) {
      <div class="container mx-auto px-4 py-8 text-center">
        <p class="text-danger mb-4">{{ error() }}</p>
        <app-button (clicked)="loadProduct()">
          {{ 'common.retry' | transloco }}
        </app-button>
      </div>
    } @else if (product()) {
      <div class="container mx-auto px-4 py-8">
        <!-- Breadcrumb -->
        <nav class="mb-6 text-sm">
          <a [routerLink]="homeLink()" class="hover:text-accent">{{ 'nav.home' | transloco }}</a>
          <span class="mx-2">/</span>
          <a [routerLink]="shopLink()" class="hover:text-accent">{{ 'nav.shop' | transloco }}</a>
          <span class="mx-2">/</span>
          <span class="text-muted-foreground">{{ product()!.name }}</span>
        </nav>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <!-- Images -->
          <div>
            <!-- Main Image/Video -->
            <div class="aspect-[3/4] bg-muted mb-4 overflow-hidden">
              @if (isVideoSelected()) {
                <video 
                  [src]="selectedImage()" 
                  controls
                  class="w-full h-full object-cover">
                  Your browser does not support the video tag.
                </video>
              } @else if (product()!.images && product()!.images.length > 0) {
                <img 
                  [src]="selectedImage()" 
                  [alt]="product()!.name"
                  class="w-full h-full object-cover">
              } @else {
                <div class="w-full h-full flex items-center justify-center text-muted-foreground">
                  <span class="font-mono text-sm">{{ 'common.no_image' | transloco }}</span>
                </div>
              }
            </div>

            <!-- Thumbnails (Images + Video) -->
            @if ((product()!.images && product()!.images.length > 0) || product()!.video) {
              <div class="grid grid-cols-4 gap-2">
                <!-- Image Thumbnails -->
                @for (image of product()!.images; track image.id) {
                  <button
                    (click)="selectImage(image.image, false)"
                    [class]="'aspect-square overflow-hidden border-2 transition-all ' + (selectedImage() === image.image && !isVideoSelected() ? 'border-foreground' : 'border-border')">
                    <img [src]="image.image" [alt]="product()!.name" class="w-full h-full object-cover">
                  </button>
                }
                <!-- Video Thumbnail -->
                @if (product()!.video) {
                  <button
                    (click)="selectImage(product()!.video!.video, true)"
                    [class]="'aspect-square overflow-hidden border-2 transition-all relative ' + (isVideoSelected() ? 'border-foreground' : 'border-border')">
                    @if (product()!.video?.thumbnail) {
                      <img [src]="product()!.video!.thumbnail" [alt]="product()!.name + ' video'" class="w-full h-full object-cover">
                    } @else {
                      <div class="w-full h-full bg-muted flex items-center justify-center">
                        <span class="text-2xl">▶</span>
                      </div>
                    }
                    <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <span class="text-white text-3xl">▶</span>
                    </div>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Product Info -->
          <div>
            <!-- Badges -->
            @if (getBadges().length > 0) {
              <div class="flex flex-wrap gap-2 mb-4">
                @for (badge of getBadges(); track badge.type) {
                  <app-badge [variant]="badge.type">
                    {{ badge.label | transloco }}
                  </app-badge>
                }
              </div>
            }

            <!-- Name & Category -->
            <h1 class="text-3xl md:text-4xl font-bold mb-2">{{ product()!.name }}</h1>
            @if (product()!.category) {
              <p class="text-muted-foreground font-mono uppercase tracking-wide mb-6">
                {{ product()!.category.name }}
              </p>
            }

            <!-- Price -->
            <div class="flex items-baseline gap-3 mb-6">
              @if (product()!.discount_price) {
                <span class="text-3xl font-bold">{{ product()!.discount_price | currency: 'EUR' }}</span>
                <span class="text-xl text-muted-foreground line-through">{{ product()!.price | currency: 'EUR' }}</span>
              } @else {
                <span class="text-3xl font-bold">{{ product()!.price | currency: 'EUR' }}</span>
              }
            </div>

            <!-- Stock Status -->
            <div class="mb-6">
              @if (product()!.available_stock === 0 && !product()!.pre_order_enabled) {
                <p class="text-danger font-mono uppercase text-sm">{{ 'product.out_of_stock' | transloco }}</p>
              } @else if (product()!.available_stock < 5 && !product()!.pre_order_enabled) {
                <p class="text-warning font-mono uppercase text-sm">
                  {{ 'product.low_stock' | transloco }} ({{ product()!.available_stock }} {{ 'product.left' | transloco }})
                </p>
              } @else if (product()!.pre_order_enabled) {
                <p class="text-info font-mono uppercase text-sm">{{ 'product.preorder_available' | transloco }}</p>
              } @else {
                <p class="text-success font-mono uppercase text-sm">{{ 'product.in_stock' | transloco }}</p>
              }
            </div>

            <!-- Quantity Selector -->
            @if (product()!.available_stock > 0 || product()!.pre_order_enabled) {
              <div class="flex items-center gap-4 mb-6">
                <label class="font-mono text-sm uppercase">{{ 'product.quantity' | transloco }}</label>
                <div class="flex items-center border border-border">
                  <button 
                    (click)="decreaseQuantity()"
                    [disabled]="quantity() <= 1"
                    class="px-4 py-2 hover:bg-muted transition-colors disabled:opacity-50">
                    -
                  </button>
                  <span class="px-6 py-2 font-mono">{{ quantity() }}</span>
                  <button 
                    (click)="increaseQuantity()"
                    [disabled]="!product()!.pre_order_enabled && quantity() >= product()!.available_stock"
                    class="px-4 py-2 hover:bg-muted transition-colors disabled:opacity-50">
                    +
                  </button>
                </div>
              </div>

              <!-- Add to Cart Button -->
              <app-button 
                [variant]="'primary'"
                [size]="'lg'"
                [fullWidth]="true"
                [loading]="addingToCart()"
                (clicked)="addToCart()">
                {{ (product()!.pre_order_enabled ? 'cart.preorder' : 'cart.add_to_cart') | transloco }}
              </app-button>
            }

            <!-- Description -->
            @if (product()!.description) {
              <div class="mt-8 pt-8 border-t border-border">
                <h2 class="font-mono text-sm uppercase tracking-wide mb-4">{{ 'product.description' | transloco }}</h2>
                <div class="prose prose-sm max-w-none text-muted-foreground" [innerHTML]="product()!.description"></div>
              </div>
            }

            <!-- Color Info -->
            @if (product()!.color) {
              <div class="mt-6">
                <h3 class="font-mono text-sm uppercase tracking-wide mb-2">{{ 'product.color' | transloco }}</h3>
                <div class="flex items-center gap-3">
                  <div 
                    class="w-8 h-8 rounded-full border-2 border-border"
                    [style.background-color]="product()!.color.hex_code">
                  </div>
                  <span>{{ product()!.color.name }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ProductDetailComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private cartService = inject(CartService);
  private analyticsService = inject(AnalyticsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  homeLink = computed(() => `/${this.currentLang()}`);
  shopLink = computed(() => `/${this.currentLang()}/shop`);

  product = signal<Product | null>(null);
  loading = signal(false);
  error = signal('');
  addingToCart = signal(false);
  quantity = signal(1);
  selectedImage = signal('');
  isVideoSelected = signal(false);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const slug = params['slug'];
      if (slug) {
        this.loadProduct(slug);
      }
    });
  }

  loadProduct(slug?: string) {
    const productSlug = slug || this.route.snapshot.params['slug'];
    this.loading.set(true);
    this.error.set('');

    this.catalogService.getProduct(productSlug).subscribe({
      next: (product) => {
        this.product.set(product);
        if (product.images && product.images.length > 0) {
          this.selectedImage.set(product.images[0].image);
        }
        this.loading.set(false);
        
        // Track product view
        this.analyticsService.trackProductView(product.id).subscribe();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Product not found');
        this.loading.set(false);
      }
    });
  }

  selectImage(imageUrl: string, isVideo: boolean = false) {
    this.selectedImage.set(imageUrl);
    this.isVideoSelected.set(isVideo);
  }

  getBadges() {
    const product = this.product();
    if (!product) return [];
    
    const badges: { type: 'drop' | 'recycled' | 'preorder', label: string }[] = [];
    
    if (product.is_limited_drop) {
      badges.push({ type: 'drop', label: 'badges.drop' });
    }
    if (product.is_recycled) {
      badges.push({ type: 'recycled', label: 'badges.recycled' });
    }
    if (product.pre_order_enabled) {
      badges.push({ type: 'preorder', label: 'badges.preorder' });
    }
    
    return badges;
  }

  increaseQuantity() {
    const product = this.product();
    if (!product) return;
    
    if (product.pre_order_enabled || this.quantity() < product.available_stock) {
      this.quantity.update(q => q + 1);
    }
  }

  decreaseQuantity() {
    if (this.quantity() > 1) {
      this.quantity.update(q => q - 1);
    }
  }

  addToCart() {
    const product = this.product();
    if (!product) return;

    this.addingToCart.set(true);
    this.cartService.addToCart(product, this.quantity());
    
    // Track add to cart event
    this.analyticsService.trackProductClick(product.id).subscribe();
    
    setTimeout(() => {
      this.addingToCart.set(false);
      const lang = this.languageService.currentLang();
      this.router.navigate([lang, 'cart']);
    }, 500);
  }
}
