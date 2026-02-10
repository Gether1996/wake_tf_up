import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { OrderService } from '../../core/api/order.service';
import { Order } from '../../core/api/api.models';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentService } from '../../core/api/payment.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-order-detail',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto space-y-6">
        <button
          class="inline-flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          (click)="goBack()">
          ← {{ 'orders.back_to_orders' | transloco }}
        </button>

        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm font-mono text-muted-foreground">{{ 'orders.order_number' | transloco: { number: order()?.id || '—' } }}</p>
            <h1 class="text-3xl md:text-4xl font-bold">{{ 'orders.detail_title' | transloco }}</h1>
          </div>
          @if (order(); as currentOrder) {
            <span
              class="inline-flex px-4 py-2 text-xs font-mono uppercase border"
              [class]="getStatusClass(currentOrder.status)">
              {{ getStatusText(currentOrder.status) | transloco }}
            </span>
          }
        </div>

        @if (loading()) {
          <div class="space-y-6">
            @for (i of [1,2]; track i) {
              <div class="border border-border p-6 animate-pulse">
                <div class="h-4 bg-muted rounded w-1/4 mb-4"></div>
                <div class="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div class="h-4 bg-muted rounded w-full"></div>
              </div>
            }
          </div>
        } @else if (error()) {
          <div class="border border-border p-6 text-center">
            <p class="text-muted-foreground">{{ error() }}</p>
          </div>
        } @else if (order(); as currentOrder) {
          <section class="border border-border">
            <div class="bg-muted px-6 py-4 grid md:grid-cols-2 gap-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ 'orders.placed_on' | transloco }}</p>
                <p class="text-lg font-semibold">{{ currentOrder.created_at | date: 'medium' }}</p>
              </div>
              <div>
                <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ 'orders.updated_on' | transloco }}</p>
                <p class="text-lg font-semibold">{{ currentOrder.updated_at | date: 'medium' }}</p>
              </div>
            </div>

            <div class="p-6 grid md:grid-cols-2 gap-8">
              <div class="space-y-6">
                <div>
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ 'orders.shipping_info' | transloco }}</p>
                  <p class="text-lg font-semibold mt-2">{{ currentOrder.shipping_name }}</p>
                  <p class="text-sm">{{ currentOrder.shipping_address }}</p>
                  <p class="text-sm">{{ currentOrder.shipping_city }}, {{ currentOrder.shipping_postal_code }}</p>
                  <p class="text-sm text-muted-foreground">{{ currentOrder.shipping_country }}</p>
                  <p class="text-xs uppercase tracking-wide text-muted-foreground mt-4">{{ 'orders.contact_phone' | transloco }}</p>
                  <p class="text-sm font-mono">{{ currentOrder.phone }}</p>
                  <p class="text-xs uppercase tracking-wide text-muted-foreground mt-4">{{ 'orders.shipping_method' | transloco }}</p>
                  @if (getShippingMethodKey(currentOrder.shipping_method); as shippingKey) {
                    <p class="text-sm font-mono">{{ shippingKey | transloco }}</p>
                  } @else {
                    <p class="text-sm font-mono">{{ currentOrder.shipping_method }}</p>
                  }
                </div>

                @if (currentOrder.shipping_method === 'packeta_box' && currentOrder.packeta_point_name) {
                  <div>
                    <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ 'orders.packeta_details' | transloco }}</p>
                    <p class="text-sm font-semibold mt-2">{{ currentOrder.packeta_point_name }}</p>
                    <p class="text-sm text-muted-foreground">{{ currentOrder.packeta_point_address }}</p>
                  </div>
                }

                @if (currentOrder.is_company_purchase) {
                  <div class="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ 'orders.company_info' | transloco }}</p>
                      <p class="text-sm font-semibold mt-2">{{ currentOrder.billing_company }}</p>
                      <p class="text-sm">ICO: {{ currentOrder.billing_ico }}</p>
                      <p class="text-sm">DIC: {{ currentOrder.billing_dic }}</p>
                      @if (currentOrder.billing_ic_dph) {
                        <p class="text-sm">IC DPH: {{ currentOrder.billing_ic_dph }}</p>
                      }
                    </div>
                  </div>
                }
              </div>

              <div class="space-y-6">
                <div class="border border-border p-5">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ 'orders.payment_summary' | transloco }}</p>
                  <div class="flex justify-between text-sm mt-4">
                    <span class="text-muted-foreground">{{ 'orders.payment_method' | transloco }}</span>
                    <span class="font-mono">{{ getPaymentMethodText(currentOrder.payment_method) | transloco }}</span>
                  </div>
                  <div class="flex justify-between mt-4 text-sm">
                    <span>{{ 'orders.items_subtotal' | transloco }}</span>
                    <span>{{ getItemsSubtotal(currentOrder) | currency: 'EUR' }}</span>
                  </div>
                  <div class="flex justify-between text-base font-semibold mt-4">
                    <span>{{ 'orders.grand_total' | transloco }}</span>
                    <span>{{ getOrderTotal(currentOrder) | currency: 'EUR' }}</span>
                  </div>
                </div>

                @if (currentOrder.tracking_number) {
                  <div class="border border-dashed border-border p-5">
                    <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ 'orders.tracking_number' | transloco }}</p>
                    <p class="text-lg font-semibold mt-2 font-mono">{{ currentOrder.tracking_number }}</p>
                    @if (currentOrder.carrier_tracking_url) {
                      <a [href]="currentOrder.carrier_tracking_url" target="_blank" class="text-sm text-foreground hover:underline">
                        {{ 'orders.track_shipment' | transloco }} →
                      </a>
                    }
                  </div>
                }

                <div class="flex flex-wrap gap-3">
                  @if (canShowPayNow(currentOrder)) {
                    <app-button [loading]="paying()" (clicked)="payNow(currentOrder.id)">
                      {{ 'orders.pay_now' | transloco }}
                    </app-button>
                  }
                </div>
              </div>
            </div>
          </section>

          <section class="border border-border p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ 'orders.items_section' | transloco }}</p>
                <p class="text-2xl font-bold">{{ currentOrder.items.length || 0 }}</p>
              </div>
            </div>

            @if ((currentOrder.items || []).length === 0) {
              <p class="text-muted-foreground">{{ 'orders.no_items' | transloco }}</p>
            } @else {
              <div class="divide-y divide-border">
                @for (item of currentOrder.items || []; track item.id) {
                  @if (item.product.is_published) {
                    <a
                      class="flex gap-4 py-4 group transition-colors hover:bg-muted/50 px-1 -mx-1 rounded"
                      [routerLink]="['/', currentLang(), 'product', item.product.slug]">
                      <div class="w-20 h-24 bg-muted overflow-hidden flex-shrink-0">
                        @if (item.product.images && item.product.images.length > 0) {
                          <img
                            [src]="getImageUrl(item.product.images[0].image)"
                            [alt]="item.product.name"
                            class="w-full h-full object-cover" />
                        } @else if (item.product.primary_image) {
                          <img
                            [src]="getImageUrl(item.product.primary_image)"
                            [alt]="item.product.name"
                            class="w-full h-full object-cover" />
                        }
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-4">
                          <p class="font-semibold truncate group-hover:text-foreground">{{ item.product.name || 'Product' }}</p>
                          <p class="text-sm text-muted-foreground">× {{ item.quantity }}</p>
                        </div>
                        <p class="text-sm text-muted-foreground mt-1">{{ 'orders.status' | transloco }}: {{ getStatusText(currentOrder.status) | transloco }}</p>
                        <p class="text-base font-semibold mt-2">{{ item.price_at_purchase | currency: 'EUR' }}</p>
                      </div>
                    </a>
                  } @else {
                    <div class="flex gap-4 py-4">
                      <div class="w-20 h-24 bg-muted overflow-hidden flex-shrink-0">
                        @if (item.product.images && item.product.images.length > 0) {
                          <img
                            [src]="getImageUrl(item.product.images[0].image)"
                            [alt]="item.product.name"
                            class="w-full h-full object-cover" />
                        } @else if (item.product.primary_image) {
                          <img
                            [src]="getImageUrl(item.product.primary_image)"
                            [alt]="item.product.name"
                            class="w-full h-full object-cover" />
                        }
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-4">
                          <p class="font-semibold truncate">{{ item.product.name || 'Product' }}</p>
                          <p class="text-sm text-muted-foreground">× {{ item.quantity }}</p>
                        </div>
                        <p class="text-sm text-muted-foreground mt-1">{{ 'orders.status' | transloco }}: {{ getStatusText(currentOrder.status) | transloco }}</p>
                        <p class="text-base font-semibold mt-2">{{ item.price_at_purchase | currency: 'EUR' }}</p>
                      </div>
                    </div>
                  }
                }
              </div>
            }
          </section>
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
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private languageService = inject(LanguageService);
  private notificationService = inject(NotificationService);
  private paymentService = inject(PaymentService);
  private translocoService = inject(TranslocoService);

  currentLang = this.languageService.currentLang;
  order = signal<Order | null>(null);
  loading = signal(true);
  error = signal('');
  paying = signal(false);
  private orderId: number | null = null;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      const id = idParam ? Number(idParam) : NaN;
      if (!Number.isFinite(id)) {
        this.error.set(this.translocoService.translate('orders.empty_state'));
        this.loading.set(false);
        return;
      }
      this.orderId = id;
      this.fetchOrder();
    });
  }

  goBack() {
    this.router.navigate(['/', this.currentLang(), 'orders']);
  }

  payNow(orderId: number) {
    this.paying.set(true);
    this.paymentService.createPayment({ order_id: orderId }).subscribe({
      next: (response) => {
        if (response.success && response.payment_url) {
          window.location.href = response.payment_url;
        } else {
          this.notificationService.error('Failed to initialize payment');
          this.paying.set(false);
        }
      },
      error: (err) => {
        console.error('Payment error:', err);
        const errorMsg = err.error?.error || 'Failed to initialize payment. Please try again.';
        this.notificationService.error(errorMsg);
        this.paying.set(false);
      }
    });
  }

  private fetchOrder() {
    if (!this.orderId) return;
    this.loading.set(true);
    this.error.set('');
    this.orderService.getOrder(this.orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load order:', err);
        this.order.set(null);
        this.error.set(this.translocoService.translate('orders.load_error'));
        this.loading.set(false);
      }
    });
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

  getShippingMethodKey(method: string): string | null {
    const shippingMap: Record<string, string> = {
      'pickup': 'checkout.pickup',
      'packeta_box': 'checkout.packeta_box',
      'packeta_courier': 'checkout.packeta_courier',
      'dpd_courier': 'checkout.dpd_courier'
    };
    return shippingMap[method] || null;
  }

  getPaymentMethodText(method?: string | null): string {
    const paymentMap: Record<string, string> = {
      'gopay': 'orders.payment_method_gopay',
      'cash_on_pickup': 'orders.payment_method_cash_on_pickup',
    };
    return paymentMap[method || ''] || 'orders.payment_method_unknown';
  }

  canShowPayNow(order: Order | null): boolean {
    if (!order) {
      return false;
    }
    return order.status === 'created' && order.payment_method !== 'cash_on_pickup';
  }

  getItemsSubtotal(order: Order | null): number {
    if (!order?.items?.length) {
      return 0;
    }
    const subtotal = order.items.reduce((sum, item) => {
      const price = typeof item.price_at_purchase === 'string' ? parseFloat(item.price_at_purchase) : Number(item.price_at_purchase);
      return sum + (Number.isFinite(price) ? price * item.quantity : 0);
    }, 0);
    return Number.isFinite(subtotal) ? subtotal : 0;
  }

  getOrderTotal(order: Order | null): number {
    if (!order) {
      return 0;
    }
    const total = (order as any).total ?? order.total_amount ?? 0;
    const value = typeof total === 'string' ? parseFloat(total) : Number(total);
    return Number.isFinite(value) ? value : 0;
  }

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) {
      return '';
    }
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return `${environment.apiBaseUrl}${imagePath}`;
  }
}
