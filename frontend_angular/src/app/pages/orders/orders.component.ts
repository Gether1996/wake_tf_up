import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { OrderService } from '../../core/api/order.service';
import { PaymentService } from '../../core/api/payment.service';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { environment } from '../../../environments/environment';

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
              <div 
                class="border border-border overflow-hidden hover:border-foreground transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                role="button"
                tabindex="0"
                (click)="viewOrder(order.id)"
                (keydown.enter)="viewOrder(order.id)"
                (keydown.space)="$event.preventDefault(); viewOrder(order.id)">
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
                              [src]="getImageUrl(item.product.images[0].image)" 
                              [alt]="item.product.name"
                              class="w-full h-full object-cover">
                          } @else if (item.product?.primary_image) {
                            <img 
                              [src]="getImageUrl(item.product.primary_image)" 
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
                            } @else if (order.shipping_method === 'packeta_box') {
                              {{ 'checkout.packeta_box' | transloco }}
                            } @else if (order.shipping_method === 'packeta_courier') {
                              {{ 'checkout.packeta_courier' | transloco }}
                            } @else if (order.shipping_method === 'dpd_courier') {
                              {{ 'checkout.dpd_courier' | transloco }}
                            } @else {
                              {{ order.shipping_method }}
                            }
                          </p>
                        </div>
                        @if (order.shipping_method === 'packeta_box' && order.packeta_point_name) {
                          <div>
                            <p class="text-sm text-muted-foreground">{{ 'orders.pickup_point' | transloco }}</p>
                            <p class="text-sm font-medium">{{ order.packeta_point_name }}</p>
                            <p class="text-xs text-muted-foreground">{{ order.packeta_point_address }}</p>
                          </div>
                        } @else if (order.shipping_name && order.shipping_address && order.shipping_city && order.shipping_postal_code && order.shipping_country) {
                          <div>
                            <p class="text-sm text-muted-foreground">{{ 'orders.shipping_address' | transloco }}</p>
                            <p class="text-sm">{{ order.shipping_name }}</p>
                            <p class="text-xs text-muted-foreground">
                              {{ order.shipping_address }}, {{ order.shipping_city }}, {{ order.shipping_postal_code }}, {{ order.shipping_country }}
                            </p>
                          </div>
                        }
                        @if (order.tracking_number) {
                          <div>
                            <p class="text-sm text-muted-foreground">{{ 'orders.tracking_number' | transloco }}</p>
                            <p class="text-sm font-mono font-bold">{{ order.tracking_number }}</p>
                            @if (order.carrier_tracking_url) {
                              <a [href]="order.carrier_tracking_url" target="_blank" 
                                 class="text-xs text-foreground hover:underline">
                                {{ 'orders.track_shipment' | transloco }} →
                              </a>
                            }
                          </div>
                        }
                      </div>
                      <div class="text-right">
                        <p class="text-sm text-muted-foreground mb-1">{{ 'orders.total' | transloco }}</p>
                        <p class="text-2xl font-bold">{{ getOrderTotal(order) | currency: 'EUR' }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="mt-4 pt-4 border-t border-border flex gap-3">
                    @if (order.status === 'created') {
                      <app-button 
                        [variant]="'primary'" 
                        [size]="'sm'" 
                        (clicked)="payNow(order.id); $event.stopPropagation();"
                        [loading]="payingOrderId() === order.id">
                        {{ 'orders.pay_now' | transloco }}
                      </app-button>
                    }
                  </div>
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
  private paymentService = inject(PaymentService);
  private languageService = inject(LanguageService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);

  orders = signal<any[]>([]);
  loading = signal(false);
  payingOrderId = signal<number | null>(null);
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
        this.notificationService.error('Failed to load orders. Please try again.');
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

  getOrderTotal(order: any): number {
    const total = order?.total ?? order?.total_amount ?? 0;
    const value = typeof total === 'string' ? parseFloat(total) : total;
    return Number.isFinite(value) ? value : 0;
  }

  viewOrder(orderId: number) {
    this.router.navigate(['/', this.currentLang(), 'orders', orderId]);
  }

  payNow(orderId: number) {
    this.payingOrderId.set(orderId);
    
    this.paymentService.createPayment({ order_id: orderId }).subscribe({
      next: (response) => {
        if (response.success && response.payment_url) {
          // Redirect to GoPay payment page
          window.location.href = response.payment_url;
        } else {
          this.notificationService.error('Failed to initialize payment');
          this.payingOrderId.set(null);
        }
      },
      error: (err) => {
        console.error('Payment error:', err);
        const errorMsg = err.error?.error || 'Failed to initialize payment. Please try again.';
        this.notificationService.error(errorMsg);
        this.payingOrderId.set(null);
      }
    });
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    // If already absolute URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    // If relative path, prepend base URL
    return `${environment.apiBaseUrl}${imagePath}`;
  }
}
