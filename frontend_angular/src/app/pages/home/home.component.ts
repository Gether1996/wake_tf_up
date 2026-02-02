import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { CatalogService } from '../../core/api/catalog.service';
import { ReviewService } from '../../core/api/review.service';
import { LanguageService } from '../../core/services/language.service';
import { Product, FeaturedReview } from '../../core/api/api.models';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, TranslocoModule, ProductCardComponent, ButtonComponent],
  styles: [`
    :host {
      display: block;
    }
    .hero-section {
      background-image: url('/image1.png');
    }
    .hero-title {
      color: #000 !important;
      text-shadow:
        -1px -1px 0 #fff,
         1px -1px 0 #fff,
        -1px  1px 0 #fff,
         1px  1px 0 #fff;
    }
    ::ng-deep .hero-button button {
      background: #fff !important;
      border: 2px solid #000 !important;
      color: #000 !important;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      font-weight: 600;
      transition: all 0.2s ease;
    }
    ::ng-deep .hero-button button:hover {
      background: #000 !important;
      color: #fff !important;
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }
  `],
  template: `
    <!-- Hero Section -->
    <section class="hero-section relative bg-background border-b border-border" style="background-size: cover; background-position: center; min-height: 600px; display: flex; align-items: center;">
      <div class="container mx-auto px-4 py-16 md:py-24">
        <div class="max-w-xl">
          <h1 class="text-4xl md:text-6xl font-bold mb-6 leading-tight hero-title">
            {{ 'home.hero.title' | transloco }}
          </h1>
          <p class="text-lg md:text-xl mb-8 max-w-md hero-title">
            {{ 'home.hero.subtitle' | transloco }}
          </p>
          <div class="flex flex-wrap gap-4">
            <div class="hero-button">
              <a [routerLink]="shopLink()">
                <app-button [variant]="'outline'" [size]="'lg'">
                  {{ 'home.hero.cta_shop' | transloco }}
                </app-button>
              </a>
            </div>
            <div class="hero-button">
              <a [routerLink]="aboutLink()">
                <app-button [variant]="'outline'" [size]="'lg'">
                  {{ 'home.hero.cta_learn' | transloco }}
                </app-button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="container mx-auto px-4 py-16">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-3xl font-bold mb-2">{{ 'home.featured.title' | transloco }}</h2>
          <p class="text-muted-foreground">{{ 'home.featured.subtitle' | transloco }}</p>
        </div>
        <a [routerLink]="shopLink()" class="hidden md:block">
          <app-button [variant]="'ghost'">
            {{ 'home.featured.view_all' | transloco }} →
          </app-button>
        </a>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (i of [1,2,3,4]; track i) {
            <div class="animate-pulse">
              <div class="aspect-square bg-muted mb-4"></div>
              <div class="h-4 bg-muted rounded mb-2"></div>
              <div class="h-3 bg-muted rounded w-2/3"></div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="text-center py-12">
          <p class="text-danger mb-4">{{ error() }}</p>
          <app-button (clicked)="loadFeatured()">
            {{ 'common.retry' | transloco }}
          </app-button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (product of featuredProducts(); track product.id) {
            <app-product-card [product]="product" />
          }
        </div>
        
        <div class="text-center mt-8 md:hidden">
          <a [routerLink]="shopLink()">
            <app-button [variant]="'outline'" [fullWidth]="true">
              {{ 'home.featured.view_all' | transloco }}
            </app-button>
          </a>
        </div>
      }
    </section>

    <!-- Customer Reviews -->
    <section class="bg-muted border-y border-border">
      <div class="container mx-auto px-4 py-16">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold mb-2">{{ 'home.reviews.title' | transloco }}</h2>
          <p class="text-muted-foreground">{{ 'home.reviews.subtitle' | transloco }}</p>
        </div>

        @if (reviewsLoading()) {
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="animate-pulse">
                <div class="aspect-square bg-background rounded-lg mb-3"></div>
                <div class="h-3 bg-background rounded mb-2"></div>
                <div class="h-2 bg-background rounded w-2/3"></div>
              </div>
            }
          </div>
        } @else if (featuredReviews().length > 0) {
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            @for (review of featuredReviews(); track review.id) {
              <a [routerLink]="[currentLang(), 'review', review.id]" 
                 class="group block bg-background rounded-lg overflow-hidden transition-transform hover:scale-105 cursor-pointer">
                <div class="aspect-square bg-muted relative overflow-hidden">
                  @if (review.product.image_url) {
                    <img [src]="review.product.image_url" 
                         [alt]="review.product.name"
                         class="w-full h-full object-cover">
                  }
                  <div class="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                    <span class="text-yellow-500">⭐</span>
                    <span class="text-sm font-medium">{{ review.rating }}</span>
                  </div>
                </div>
                <div class="p-3">
                  <h3 class="font-medium text-sm mb-1 line-clamp-1 group-hover:text-accent transition-colors">
                    {{ review.product.name }}
                  </h3>
                  <p class="text-xs text-muted-foreground line-clamp-2">
                    {{ review.text }}
                  </p>
                </div>
              </a>
            }
          </div>
        } @else {
          <div class="text-center text-muted-foreground py-8">
            {{ 'home.reviews.no_reviews' | transloco }}
          </div>
        }
      </div>
    </section>

    <!-- About Section -->
    <section class="container mx-auto px-4 py-16">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl font-bold mb-6">{{ 'home.about.title' | transloco }}</h2>
        <p class="text-lg text-muted-foreground mb-8">
          {{ 'home.about.description' | transloco }}
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div>
            <div class="text-4xl font-bold text-accent mb-2">100%</div>
            <div class="font-mono text-sm uppercase tracking-wide">{{ 'home.about.stat1' | transloco }}</div>
          </div>
          <div>
            <div class="text-4xl font-bold text-accent mb-2">1/1</div>
            <div class="font-mono text-sm uppercase tracking-wide">{{ 'home.about.stat2' | transloco }}</div>
          </div>
          <div>
            <div class="text-4xl font-bold text-accent mb-2">∞</div>
            <div class="font-mono text-sm uppercase tracking-wide">{{ 'home.about.stat3' | transloco }}</div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private reviewService = inject(ReviewService);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);
  aboutLink = computed(() => `/${this.currentLang()}/about`);

  featuredProducts = signal<Product[]>([]);
  featuredReviews = signal<FeaturedReview[]>([]);
  limitedDrops = signal<Product[]>([]);
  loading = signal(false);
  reviewsLoading = signal(false);
  dropsLoading = signal(false);
  error = signal('');

  ngOnInit() {
    this.loadFeatured();
    this.loadReviews();
    this.loadDrops();
  }

  loadFeatured() {
    this.loading.set(true);
    this.error.set('');

    this.catalogService.getProducts({ ordering: '-created_at', page: 1 }).subscribe({
      next: (response) => {
        this.featuredProducts.set(response.results);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load products');
        this.loading.set(false);
      }
    });
  }

  loadReviews() {
    this.reviewsLoading.set(true);

    this.reviewService.getFeaturedReviews().subscribe({
      next: (reviews) => {
        this.featuredReviews.set(reviews);
        this.reviewsLoading.set(false);
      },
      error: () => {
        this.reviewsLoading.set(false);
      }
    });
  }

  loadDrops() {
    this.dropsLoading.set(true);

    this.catalogService.getProducts({ is_limited_drop: 'true', page: 1 }).subscribe({
      next: (response) => {
        this.limitedDrops.set(response.results);
        this.dropsLoading.set(false);
      },
      error: () => {
        this.dropsLoading.set(false);
      }
    });
  }
}
