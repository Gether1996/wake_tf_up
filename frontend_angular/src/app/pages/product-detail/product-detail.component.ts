import { Component, OnInit, inject, signal, computed, OnDestroy, HostListener } from '@angular/core';
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
            <div class="aspect-[3/4] bg-muted mb-4 overflow-hidden relative group">
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
                  (click)="openLightbox()"
                  class="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity">
                <!-- Zoom hint -->
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black bg-opacity-20">
                  <div class="bg-white text-foreground px-4 py-2 rounded-full font-mono text-sm flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    {{ 'product.click_to_zoom' | transloco }}
                  </div>
                </div>
              } @else {
                <div class="w-full h-full flex items-center justify-center text-muted-foreground">
                  <span class="font-mono text-sm">{{ 'common.no_image' | transloco }}</span>
                </div>
              }
            </div>

            <!-- Thumbnails (Images + Videos) -->
            @if ((product()!.images && product()!.images.length > 0) || (product()!.videos && product()!.videos.length > 0)) {
              <div class="grid grid-cols-4 gap-2">
                <!-- Image Thumbnails -->
                @for (image of product()!.images; track image.id) {
                  <button
                    (click)="selectImage(image.image, false)"
                    [class]="'aspect-square overflow-hidden border-2 transition-all ' + (selectedImage() === image.image && !isVideoSelected() ? 'border-foreground' : 'border-border')">
                    <img [src]="image.image" [alt]="product()!.name" class="w-full h-full object-cover">
                  </button>
                }
                <!-- Video Thumbnails -->
                @if (product()!.videos && product()!.videos.length > 0) {
                  @for (video of product()!.videos; track video.id) {
                    <button
                      (click)="selectImage(video.video, true)"
                      [class]="'aspect-square overflow-hidden border-2 transition-all relative ' + (selectedImage() === video.video && isVideoSelected() ? 'border-foreground' : 'border-border')">
                      <img [src]="video.thumbnail" [alt]="product()!.name + ' video ' + (video.order + 1)" class="w-full h-full object-cover">
                      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                        <span class="text-white text-3xl">▶</span>
                      </div>
                    </button>
                  }
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

        <!-- Image Lightbox -->
        @if (lightboxOpen()) {
          <div 
            class="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4 animate-fadeIn" 
            (click)="closeLightbox()">
            <button 
              (click)="closeLightbox()"
              class="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-light z-10 transition-colors w-12 h-12 flex items-center justify-center"
              [attr.aria-label]="'common.close' | transloco">
              &times;
            </button>
            
            <!-- Previous Button -->
            @if (product()!.images && product()!.images.length > 1) {
              <button 
                (click)="previousImage($event)"
                class="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 text-4xl md:text-6xl font-light z-10 transition-colors w-12 h-12 flex items-center justify-center"
                [attr.aria-label]="'Previous image'">
                ‹
              </button>
            }
            
            <!-- Image -->
            <div class="relative max-w-full max-h-[90vh] animate-scaleIn">
              <img 
                [src]="selectedImage()" 
                [alt]="product()!.name"
                (click)="$event.stopPropagation()"
                class="max-w-full max-h-[90vh] object-contain">
            </div>
            
            <!-- Next Button -->
            @if (product()!.images && product()!.images.length > 1) {
              <button 
                (click)="nextImage($event)"
                class="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 text-4xl md:text-6xl font-light z-10 transition-colors w-12 h-12 flex items-center justify-center"
                [attr.aria-label]="'Next image'">
                ›
              </button>
            }
            
            <!-- Image Counter -->
            @if (product()!.images && product()!.images.length > 1) {
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm font-mono bg-black bg-opacity-70 px-4 py-2 rounded-full backdrop-blur-sm">
                {{ currentImageIndex() + 1 }} / {{ product()!.images.length }}
              </div>
            }
            
            <!-- Instruction text -->
            <div class="absolute top-4 left-4 text-white text-xs font-mono bg-black bg-opacity-70 px-3 py-2 rounded hidden md:block">
              ESC: {{ 'common.close' | transloco }} • ← →: Navigate
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out;
    }
    
    .animate-scaleIn {
      animation: scaleIn 0.3s ease-out;
    }
  `]
})
export class ProductDetailComponent implements OnInit, OnDestroy {
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
  lightboxOpen = signal(false);
  currentImageIndex = signal(0);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const slug = params['slug'];
      if (slug) {
        this.loadProduct(slug);
      }
    });
  }

  ngOnDestroy() {
    // Ensure body scroll is restored
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.lightboxOpen()) return;

    switch(event.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.previousImage(event as any);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nextImage(event as any);
        break;
    }
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

  openLightbox() {
    if (this.isVideoSelected()) return; // Don't open lightbox for videos
    const product = this.product();
    if (!product || !product.images || product.images.length === 0) return;
    
    // Find current image index
    const currentUrl = this.selectedImage();
    const index = product.images.findIndex(img => img.image === currentUrl);
    this.currentImageIndex.set(index >= 0 ? index : 0);
    
    this.lightboxOpen.set(true);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.lightboxOpen.set(false);
    document.body.style.overflow = '';
  }

  nextImage(event: Event) {
    event.stopPropagation();
    const product = this.product();
    if (!product || !product.images) return;
    
    const newIndex = (this.currentImageIndex() + 1) % product.images.length;
    this.currentImageIndex.set(newIndex);
    this.selectedImage.set(product.images[newIndex].image);
  }

  previousImage(event: Event) {
    event.stopPropagation();
    const product = this.product();
    if (!product || !product.images) return;
    
    const newIndex = this.currentImageIndex() === 0 ? product.images.length - 1 : this.currentImageIndex() - 1;
    this.currentImageIndex.set(newIndex);
    this.selectedImage.set(product.images[newIndex].image);
  }
}
