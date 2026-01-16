import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { CatalogService } from '../../core/api/catalog.service';
import { LanguageService } from '../../core/services/language.service';
import { Product } from '../../core/api/api.models';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, TranslocoModule, ProductCardComponent, ButtonComponent],
  template: `
    <!-- Hero Section -->
    <section class="relative bg-background border-b border-border">
      <div class="container mx-auto px-4 py-16 md:py-24">
        <div class="max-w-3xl">
          <h1 class="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {{ 'home.hero.title' | transloco }}
          </h1>
          <p class="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
            {{ 'home.hero.subtitle' | transloco }}
          </p>
          <div class="flex flex-wrap gap-4">
            <a [routerLink]="shopLink()">
              <app-button [variant]="'primary'" [size]="'lg'">
                {{ 'home.hero.cta_shop' | transloco }}
              </app-button>
            </a>
            <a [routerLink]="aboutLink()">
              <app-button [variant]="'outline'" [size]="'lg'">
                {{ 'home.hero.cta_learn' | transloco }}
              </app-button>
            </a>
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
              <div class="aspect-[3/4] bg-muted mb-4"></div>
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

    <!-- Limited Drops -->
    <section class="bg-muted border-y border-border">
      <div class="container mx-auto px-4 py-16">
        <div class="flex justify-between items-center mb-8">
          <div>
            <h2 class="text-3xl font-bold mb-2">{{ 'home.drops.title' | transloco }}</h2>
            <p class="text-muted-foreground">{{ 'home.drops.subtitle' | transloco }}</p>
          </div>
          <a [routerLink]="shopLink()" [queryParams]="{is_limited_drop: 'true'}" class="hidden md:block">
            <app-button [variant]="'ghost'">
              {{ 'home.drops.view_all' | transloco }} →
            </app-button>
          </a>
        </div>

        @if (dropsLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (i of [1,2,3]; track i) {
              <div class="animate-pulse">
                <div class="aspect-[3/4] bg-background mb-4"></div>
                <div class="h-4 bg-background rounded mb-2"></div>
                <div class="h-3 bg-background rounded w-2/3"></div>
              </div>
            }
          </div>
        } @else if (limitedDrops().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (product of limitedDrops(); track product.id) {
              <app-product-card [product]="product" />
            }
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
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class HomeComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);
  aboutLink = computed(() => `/${this.currentLang()}/about`);

  featuredProducts = signal<Product[]>([]);
  limitedDrops = signal<Product[]>([]);
  loading = signal(false);
  dropsLoading = signal(false);
  error = signal('');

  ngOnInit() {
    this.loadFeatured();
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
