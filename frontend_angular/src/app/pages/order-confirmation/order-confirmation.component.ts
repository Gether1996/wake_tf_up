import { Component, OnInit, inject, signal, PLATFORM_ID, DestroyRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { PaymentService } from '../../core/api/payment.service';
import { LanguageService } from '../../core/services/language.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { NotificationService } from '../../core/services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-order-confirmation',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-16">
      <div class="max-w-2xl mx-auto text-center">
        @if (loading()) {
          <div class="animate-pulse">
            <div class="w-16 h-16 bg-muted rounded-full mx-auto mb-4"></div>
            <div class="h-8 bg-muted rounded w-3/4 mx-auto mb-4"></div>
            <div class="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        } @else if (paymentStatus() === 'paid') {
          <!-- Success -->
          <div class="mb-8">
            <div class="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-12 h-12 text-success-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 class="text-4xl font-bold mb-4">{{ 'order_confirmation.success_title' | transloco }}</h1>
            <p class="text-lg text-muted-foreground mb-8">
              {{ 'order_confirmation.success_message' | transloco }}
            </p>
            
            @if (orderId()) {
              <div class="bg-muted p-6 rounded-lg mb-8">
                <p class="text-sm text-muted-foreground mb-2">{{ 'order_confirmation.order_number' | transloco }}</p>
                <p class="text-2xl font-bold font-mono">#{{ orderId() }}</p>
              </div>
            }

            <p class="text-muted-foreground mb-8">
              {{ 'order_confirmation.confirmation_email' | transloco }}
            </p>

            <div class="flex gap-4 justify-center">
              <app-button [routerLink]="orderLink()" [queryParams]="orderQueryParams()">
                {{ 'order_confirmation.view_orders' | transloco }}
              </app-button>
              <app-button [routerLink]="['/', currentLang(), 'shop']" [variant]="'secondary'">
                {{ 'order_confirmation.continue_shopping' | transloco }}
              </app-button>
            </div>
          </div>
        } @else if (paymentStatus() === 'cash_on_pickup') {
          <!-- Cash on Pickup -->
          <div class="mb-8">
            <div class="w-20 h-20 bg-warning rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-12 h-12 text-warning-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h1 class="text-4xl font-bold mb-4">{{ 'order_confirmation.cash_on_pickup_title' | transloco }}</h1>
            <p class="text-lg text-muted-foreground mb-8">
              {{ 'order_confirmation.cash_on_pickup_message' | transloco }}
            </p>
            
            @if (orderId()) {
              <div class="bg-muted p-6 rounded-lg mb-8">
                <p class="text-sm text-muted-foreground mb-2">{{ 'order_confirmation.order_number' | transloco }}</p>
                <p class="text-2xl font-bold font-mono">#{{ orderId() }}</p>
              </div>
            }

            <p class="text-muted-foreground mb-8">
              {{ 'order_confirmation.cash_on_pickup_info' | transloco }}
            </p>

            <div class="flex gap-4 justify-center">
              <app-button [routerLink]="orderLink()" [queryParams]="orderQueryParams()">
                {{ 'order_confirmation.view_orders' | transloco }}
              </app-button>
              <app-button [routerLink]="['/', currentLang(), 'shop']" [variant]="'secondary'">
                {{ 'order_confirmation.continue_shopping' | transloco }}
              </app-button>
            </div>
          </div>
        } @else if (paymentStatus() === 'canceled' || paymentStatus() === 'timeouted') {
          <!-- Cancelled -->
          <div class="mb-8">
            <div class="w-20 h-20 bg-warning rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-12 h-12 text-warning-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h1 class="text-4xl font-bold mb-4">{{ 'order_confirmation.cancelled_title' | transloco }}</h1>
            <p class="text-lg text-muted-foreground mb-8">
              {{ 'order_confirmation.cancelled_message' | transloco }}
            </p>

            <div class="flex gap-4 justify-center">
              <app-button (clicked)="retryPayment()">
                {{ 'order_confirmation.retry_payment' | transloco }}
              </app-button>
              <app-button [routerLink]="orderLink()" [queryParams]="orderQueryParams()" [variant]="'secondary'">
                {{ 'order_confirmation.view_orders' | transloco }}
              </app-button>
            </div>
          </div>
        } @else {
          <!-- Error or Unknown -->
          <div class="mb-8">
            <div class="w-20 h-20 bg-danger rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-12 h-12 text-danger-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h1 class="text-4xl font-bold mb-4">{{ 'order_confirmation.error_title' | transloco }}</h1>
            <p class="text-lg text-muted-foreground mb-8">
              {{ 'order_confirmation.error_message' | transloco }}
            </p>

            <div class="flex gap-4 justify-center">
              <app-button [routerLink]="orderLink()" [queryParams]="orderQueryParams()">
                {{ 'order_confirmation.view_orders' | transloco }}
              </app-button>
              <app-button [routerLink]="['/', currentLang(), 'contact']" [variant]="'secondary'">
                {{ 'order_confirmation.contact_support' | transloco }}
              </app-button>
            </div>
          </div>
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
export class OrderConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentService = inject(PaymentService);
  private languageService = inject(LanguageService);
  private notificationService = inject(NotificationService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  currentLang = this.languageService.currentLang;

  loading = signal(true);
  paymentStatus = signal<string>('');
  orderId = signal<number | null>(null);
  accessToken = signal<string | null>(null);

  ngOnInit() {
    // Get order_id and status from query params
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const orderId = params['order_id'];
      const status = params['status'];
      const paymentMethod = params['payment_method'];
      const accessToken = params['access_token'] || null;

      if (!orderId) {
        // No order ID, redirect to home
        this.router.navigate([this.currentLang(), 'shop']);
        return;
      }

      this.orderId.set(parseInt(orderId));
      this.accessToken.set(accessToken);

      // Cash on pickup - show pending state
      if (paymentMethod === 'cash_on_pickup') {
        this.paymentStatus.set('cash_on_pickup');
        this.loading.set(false);
        return;
      }

      if (status) {
        this.paymentStatus.set(status.toLowerCase());
        this.loading.set(false);
      } else {
        // Check payment status via API
        this.checkPaymentStatus(parseInt(orderId), accessToken);
      }
    });
  }

  checkPaymentStatus(orderId: number, accessToken?: string | null) {
    this.paymentService.checkPaymentStatus(orderId, accessToken || undefined).subscribe({
      next: (response) => {
        if (response.success && response.transaction) {
          if (response.transaction.status === 'completed') {
            this.paymentStatus.set('paid');
          } else if (response.transaction.status === 'failed') {
            this.paymentStatus.set('canceled');
          } else {
            this.paymentStatus.set(response.transaction.status);
          }
        } else {
          this.paymentStatus.set('error');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error checking payment status:', err);
        this.paymentStatus.set('error');
        this.loading.set(false);
      }
    });
  }

  retryPayment() {
    if (this.orderId()) {
      this.loading.set(true);
      this.paymentService.createPayment({
        order_id: this.orderId()!,
        ...(this.accessToken() ? { access_token: this.accessToken()! } : {})
      }).subscribe({
        next: (response) => {
          if (response.success && response.payment_url) {
            if (isPlatformBrowser(this.platformId)) {
              window.location.href = response.payment_url;
            }
          } else {
            this.loading.set(false);
            this.notificationService.error('Failed to retry payment. Please contact support.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.notificationService.error('Failed to retry payment. Please contact support.');
        }
      });
    }
  }

  orderLink(): (string | number)[] {
    if (this.orderId()) {
      return ['/', this.currentLang(), 'orders', this.orderId()!];
    }
    return ['/', this.currentLang(), 'orders'];
  }

  orderQueryParams() {
    return this.accessToken() ? { access_token: this.accessToken()! } : null;
  }
}
