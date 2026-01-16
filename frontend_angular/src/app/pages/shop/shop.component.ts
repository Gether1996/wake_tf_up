import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { CatalogService, ProductFilters } from '../../core/api/catalog.service';
import { Product, Category, Color } from '../../core/api/api.models';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-shop',
  imports: [CommonModule, RouterModule, FormsModule, TranslocoModule, ProductCardComponent, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Filters Sidebar -->
        <aside class="lg:w-64 space-y-6">
          <div>
            <h2 class="text-2xl font-bold mb-6">{{ 'shop.title' | transloco }}</h2>
          </div>

          <!-- Category Filter -->
          <div>
            <h3 class="font-mono text-sm uppercase tracking-wide mb-3">{{ 'shop.filters.category' | transloco }}</h3>
            <select 
              [(ngModel)]="selectedCategory" 
              (ngModelChange)="applyFilters()"
              class="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground font-mono text-sm">
              <option [value]="null">{{ 'shop.filters.all' | transloco }}</option>
              @for (category of categories(); track category.id) {
                <option [value]="category.slug">{{ category.name }}</option>
              }
            </select>
          </div>

          <!-- Color Filter -->
          <div>
            <h3 class="font-mono text-sm uppercase tracking-wide mb-3">{{ 'shop.filters.color' | transloco }}</h3>
            <div class="grid grid-cols-6 gap-2">
              @for (color of colors(); track color.id) {
                <button
                  (click)="toggleColor(color.id)"
                  [class]="'w-8 h-8 rounded-full border-2 transition-all ' + (selectedColor === color.id ? 'border-foreground scale-110' : 'border-border')"
                  [style.background-color]="color.hex_code"
                  [attr.aria-label]="color.name"
                  [title]="color.name">
                </button>
              }
            </div>
          </div>

          <!-- Availability Filter -->
          <div>
            <h3 class="font-mono text-sm uppercase tracking-wide mb-3">{{ 'shop.filters.stock' | transloco }}</h3>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  [(ngModel)]="showInStock" 
                  (ngModelChange)="applyFilters()"
                  class="w-4 h-4">
                <span class="text-sm">{{ 'shop.filters.inStock' | transloco }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  [(ngModel)]="showPreOrder" 
                  (ngModelChange)="applyFilters()"
                  class="w-4 h-4">
                <span class="text-sm">{{ 'shop.filters.preOrder' | transloco }}</span>
              </label>
            </div>
          </div>

          <!-- Special Filters -->
          <div>
            <h3 class="font-mono text-sm uppercase tracking-wide mb-3">{{ 'shop.filters.special' | transloco }}</h3>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  [(ngModel)]="showLimitedDrops" 
                  (ngModelChange)="applyFilters()"
                  class="w-4 h-4">
                <span class="text-sm">{{ 'badges.drop' | transloco }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  [(ngModel)]="showRecycled" 
                  (ngModelChange)="applyFilters()"
                  class="w-4 h-4">
                <span class="text-sm">{{ 'badges.recycled' | transloco }}</span>
              </label>
            </div>
          </div>

          <!-- Clear Filters -->
          @if (hasActiveFilters()) {
            <app-button 
              [variant]="'outline'" 
              [fullWidth]="true"
              (clicked)="clearFilters()">
              {{ 'shop.filters.clear' | transloco }}
            </app-button>
          }
        </aside>

        <!-- Products Grid -->
        <div class="flex-1">
          <!-- Sort & Results Count -->
          <div class="flex justify-between items-center mb-6">
            <p class="text-sm text-muted-foreground">
              @if (totalProducts() > 0) {
                {{ totalProducts() }} {{ 'shop.products' | transloco }}
              }
            </p>
            <select 
              [(ngModel)]="sortBy" 
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground font-mono text-sm">
              <option value="-created_at">{{ 'shop.sort.newest' | transloco }}</option>
              <option value="price">{{ 'shop.sort.priceAsc' | transloco }}</option>
              <option value="-price">{{ 'shop.sort.priceDesc' | transloco }}</option>
              <option value="name">{{ 'shop.sort.nameAsc' | transloco }}</option>
            </select>
          </div>

          <!-- Loading State -->
          @if (loading()) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="animate-pulse">
                  <div class="aspect-[3/4] bg-muted mb-4"></div>
                  <div class="h-4 bg-muted rounded mb-2"></div>
                  <div class="h-3 bg-muted rounded w-2/3"></div>
                </div>
              }
            </div>
          }

          <!-- Error State -->
          @else if (error()) {
            <div class="text-center py-12">
              <p class="text-danger mb-4">{{ error() }}</p>
              <app-button (clicked)="loadProducts()">
                {{ 'common.retry' | transloco }}
              </app-button>
            </div>
          }

          <!-- Products Grid -->
          @else if (products().length > 0) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (product of products(); track product.id) {
                <app-product-card [product]="product" />
              }
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="flex justify-center gap-2 mt-8">
                <app-button 
                  [variant]="'outline'"
                  [disabled]="currentPage() === 1"
                  (clicked)="goToPage(currentPage() - 1)">
                  ←
                </app-button>
                
                @for (page of visiblePages(); track page) {
                  <app-button 
                    [variant]="page === currentPage() ? 'primary' : 'outline'"
                    (clicked)="goToPage(page)">
                    {{ page }}
                  </app-button>
                }
                
                <app-button 
                  [variant]="'outline'"
                  [disabled]="currentPage() === totalPages()"
                  (clicked)="goToPage(currentPage() + 1)">
                  →
                </app-button>
              </div>
            }
          }

          <!-- Empty State -->
          @else {
            <div class="text-center py-12">
              <p class="text-muted-foreground mb-4">{{ 'shop.noProducts' | transloco }}</p>
              @if (hasActiveFilters()) {
                <app-button (clicked)="clearFilters()">
                  {{ 'shop.filters.clear' | transloco }}
                </app-button>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ShopComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  colors = signal<Color[]>([]);
  loading = signal(false);
  error = signal('');
  
  totalProducts = signal(0);
  currentPage = signal(1);
  pageSize = 12;
  totalPages = computed(() => Math.ceil(this.totalProducts() / this.pageSize));
  
  // Filters
  selectedCategory: string | null = null;
  selectedColor: number | null = null;
  showInStock = false;
  showPreOrder = false;
  showLimitedDrops = false;
  showRecycled = false;
  sortBy = '-created_at';

  hasActiveFilters = computed(() => 
    this.selectedCategory !== null ||
    this.selectedColor !== null ||
    this.showInStock ||
    this.showPreOrder ||
    this.showLimitedDrops ||
    this.showRecycled
  );

  visiblePages = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: number[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1); // ellipsis
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (current < total - 2) pages.push(-1); // ellipsis
      pages.push(total);
    }
    
    return pages;
  });

  ngOnInit() {
    this.loadCategories();
    this.loadColors();
    
    // Load filters from query params
    this.route.queryParams.subscribe(params => {
      this.selectedCategory = params['category'] || null;
      this.selectedColor = params['color'] ? +params['color'] : null;
      this.showInStock = params['in_stock'] === 'true';
      this.showPreOrder = params['pre_order'] === 'true';
      this.showLimitedDrops = params['is_limited_drop'] === 'true';
      this.showRecycled = params['is_recycled'] === 'true';
      this.sortBy = params['ordering'] || '-created_at';
      this.currentPage.set(params['page'] ? +params['page'] : 1);
      
      this.loadProducts();
    });
  }

  loadProducts() {
    this.loading.set(true);
    this.error.set('');

    const filters: ProductFilters = {
      page: this.currentPage(),
      ordering: this.sortBy
    };

    if (this.selectedCategory) filters.category = this.selectedCategory;
    if (this.selectedColor) filters.color = this.selectedColor;
    if (this.showInStock) filters.in_stock = true;
    if (this.showPreOrder) filters.pre_order = true;
    if (this.showLimitedDrops) filters.is_limited_drop = 'true';
    if (this.showRecycled) filters.is_recycled = 'true';

    this.catalogService.getProducts(filters).subscribe({
      next: (response) => {
        this.products.set(response.results);
        this.totalProducts.set(response.count);
        this.loading.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load products');
        this.loading.set(false);
      }
    });
  }

  loadCategories() {
    this.catalogService.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => {}
    });
  }

  loadColors() {
    this.catalogService.getColors().subscribe({
      next: (colors) => this.colors.set(colors),
      error: () => {}
    });
  }

  toggleColor(colorId: number) {
    this.selectedColor = this.selectedColor === colorId ? null : colorId;
    this.applyFilters();
  }

  applyFilters() {
    this.currentPage.set(1);
    this.updateQueryParams();
  }

  clearFilters() {
    this.selectedCategory = null;
    this.selectedColor = null;
    this.showInStock = false;
    this.showPreOrder = false;
    this.showLimitedDrops = false;
    this.showRecycled = false;
    this.sortBy = '-created_at';
    this.currentPage.set(1);
    this.updateQueryParams();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages() || page === -1) return;
    this.currentPage.set(page);
    this.updateQueryParams();
  }

  private updateQueryParams() {
    const queryParams: any = {};
    
    if (this.selectedCategory) queryParams.category = this.selectedCategory;
    if (this.selectedColor) queryParams.color = this.selectedColor;
    if (this.showInStock) queryParams.in_stock = 'true';
    if (this.showPreOrder) queryParams.pre_order = 'true';
    if (this.showLimitedDrops) queryParams.is_limited_drop = 'true';
    if (this.showRecycled) queryParams.is_recycled = 'true';
    if (this.sortBy !== '-created_at') queryParams.ordering = this.sortBy;
    if (this.currentPage() > 1) queryParams.page = this.currentPage();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }
}
