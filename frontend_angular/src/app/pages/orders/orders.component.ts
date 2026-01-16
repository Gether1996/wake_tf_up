import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { OrderService } from '../../core/api/order.service';
import { LanguageService } from '../../core/services/language.service';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl md:text-4xl font-bold mb-8">{{ 'orders.title' | transloco }}</h1>

        @if (loading()) {
          <div class="space-y-4">
            @for (i of [1,2,3]; track i) {
              <div class="animate-pulse border border-border p-6">
                <div class="h-4 bg-muted rounded w-1/4 mb-4"></div>
                <div class="h-4 bg-muted rounded w-3/4"></div>
              </div>
            }
          </div>
        } @else if (orders().length === 0) {
          <div class="text-center py-16 border border-border">
            <svg class="w-24 h-24 mx-auto mb-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 class="text-2xl font-bold mb-4">{{ 'orders.no_orders' | transloco }}</h2>
            <p class="text-muted-foreground mb-6">{{ 'orders.no_orders_description' | transloco }}</p>
            <app-button [routerLink]="shopLink()">
              {{ 'orders.start_shopping' | transloco }}
            </app-button>
          </div>
        } @else {
          <div class="space-y-6">
            @for (order of orders(); track order.id) {
              <div class="border border-border overflow-hidden hover:border-foreground transition-all">
                <!-- Order Header -->
                <div class="bg-muted px-6 py-4 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p class="font-mono text-sm mb-1">{{ 'orders.order_number' | transloco: { number: order.id } }}</p>
                    <p class="text-sm text-muted-foreground">{{ order.created_at | date: 'medium' }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-muted-foreground mb-1">{{ 'orders.status' | transloco }}</p>
                    <span 
                      class="inline-block px-3 py-1 text-xs font-mono uppercase"
                      [class]="getStatusClass(order.status)">
                      {{ getStatusText(order.status) | transloco }}
                    </span>
                  </div>
                </div>

                <!-- Order Items -->
                <div class="p-6">
                  <div class="space-y-4 mb-4">
                    @for (item of order.items || []; track item.id) {
                      <div class="flex gap-4">
                        <div class="w-16 h-20 bg-muted overflow-hidden flex-shrink-0">
                          @if (item.product?.images && item.product.images.length > 0) {
                            <img 
                              [src]="item.product.images[0].image" 
                              [alt]="item.product.name"
                              class="w-full h-full object-cover">
                          }
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="font-medium truncate">{{ item.product?.name || 'Product' }}</p>
                          <p class="text-sm text-muted-foreground">{{ 'orders.quantity' | transloco }}: {{ item.quantity }}</p>
                          <p class="text-sm font-medium mt-1">{{ item.price_at_purchase | currency: 'EUR' }}</p>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Order Summary -->
                  <div class="border-t border-border pt-4 mt-4">
                    <div class="flex justify-between items-start">
                      <div class="space-y-2">
                        <div>
                          <p class="text-sm text-muted-foreground">{{ 'orders.shipping_method' | transloco }}</p>
                          <p class="text-sm font-mono uppercase">
                            @if (order.shipping_method === 'pickup') {
                              {{ 'checkout.pickup' | transloco }}
                            } @else if (order.shipping_method === 'packeta') {
                              {{ 'checkout.packeta' | transloco }}
                            } @else {
                              {{ 'checkout.courier' | transloco }}
                            }
                          </p>
                        </div>
                        <div>
                          <p class="text-sm text-muted-foreground">{{ 'orders.shipping_address' | transloco }}</p>
                          <p class="text-sm">{{ order.shipping_address || 'N/A' }}</p>
                        </div>
                      </div>
                      <div class="text-right">
                        <p class="text-sm text-muted-foreground mb-1">{{ 'orders.total' | transloco }}</p>
                        <p class="text-2xl font-bold">{{ order.total | currency: 'EUR' }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  @if (order.status === 'created' || order.status === 'paid') {
                    <div class="mt-4 pt-4 border-t border-border">
                      <app-button [variant]="'ghost'" [size]="'sm'" (clicked)="trackOrder(order.id)">
                        {{ 'orders.track' | transloco }}
                      </app-button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex justify-center gap-2 mt-8">
              <button
                (click)="goToPage(currentPage() - 1)"
                [disabled]="currentPage() === 1"
                class="px-4 py-2 border border-border hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                ←
              </button>
              
              @for (page of visiblePages(); track page) {
                @if (page === '...') {
                  <span class="px-4 py-2">...</span>
                } @else {
                  <button
                    (click)="goToPage(page)"
                    [class]="'px-4 py-2 border transition-all ' + (currentPage() === page ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground')">
                    {{ page }}
                  </button>
                }
              }

              <button
                (click)="goToPage(currentPage() + 1)"
                [disabled]="currentPage() === totalPages()"
                class="px-4 py-2 border border-border hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                →
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);

  orders = signal<any[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  pageSize = 10;

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.orderService.getOrders({ page: this.currentPage(), page_size: this.pageSize }).subscribe({
      next: (response) => {
        this.orders.set(response.results);
        this.totalPages.set(Math.ceil(response.count / this.pageSize));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load orders:', err);
        this.loading.set(false);
      }
    });
  }

  goToPage(page: number | string) {
    if (typeof page === 'string') return;
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  visiblePages(): (number | string)[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 3; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'created': 'bg-warning/20 text-warning border border-warning',
      'paid': 'bg-info/20 text-info border border-info',
      'shipped': 'bg-info/20 text-info border border-info',
      'delivered': 'bg-success/20 text-success border border-success',
      'cancelled': 'bg-danger/20 text-danger border border-danger',
      'refunded': 'bg-muted/20 text-muted-foreground border border-muted'
    };
    return classes[status] || 'bg-muted text-muted-foreground border border-border';
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'created': 'orders.status_created',
      'paid': 'orders.status_paid',
      'shipped': 'orders.status_shipped',
      'delivered': 'orders.status_delivered',
      'cancelled': 'orders.status_cancelled',
      'refunded': 'orders.status_refunded'
    };
    return statusMap[status] || 'orders.status_unknown';
  }

  trackOrder(orderId: number) {
    // TODO: Implement order tracking modal or redirect
    console.log('Track order:', orderId);
  }
}
