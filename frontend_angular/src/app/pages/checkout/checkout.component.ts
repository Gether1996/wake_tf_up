import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { CartService } from '../../core/api/cart.service';
import { OrderService, CreateOrderRequest } from '../../core/api/order.service';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl md:text-4xl font-bold mb-8">{{ 'checkout.title' | transloco }}</h1>

      @if (cartService.items().length === 0) {
        <div class="text-center py-16">
          <p class="text-muted-foreground mb-4">{{ 'cart.empty' | transloco }}</p>
          <app-button [routerLink]="shopLink()">
            {{ 'cart.continueShopping' | transloco }}
          </app-button>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Checkout Form -->
          <div class="lg:col-span-2">
            <form [formGroup]="checkoutForm" (ngSubmit)="onSubmit()">
              <!-- Shipping Method -->
              <div class="border border-border p-6 mb-6">
                <h2 class="text-xl font-bold mb-6">{{ 'checkout.shipping_method' | transloco }}</h2>
                
                <div class="space-y-3">
                  <!-- Personal Pickup -->
                  <label class="flex items-center p-4 border border-border cursor-pointer hover:border-foreground transition-colors"
                         [class.border-foreground]="checkoutForm.get('shippingMethod')?.value === 'pickup'"
                         [class.bg-muted]="checkoutForm.get('shippingMethod')?.value === 'pickup'">
                    <input type="radio" formControlName="shippingMethod" value="pickup" class="mr-3">
                    <div class="flex-1">
                      <div class="font-mono uppercase font-bold">{{ 'checkout.pickup' | transloco }}</div>
                      <div class="text-sm text-muted-foreground">{{ 'checkout.pickup_desc' | transloco }}</div>
                    </div>
                    <div class="font-mono font-bold">{{ 'checkout.free' | transloco }}</div>
                  </label>

                  <!-- Packeta Z-Box -->
                  <label class="flex items-center p-4 border border-border cursor-pointer hover:border-foreground transition-colors"
                         [class.border-foreground]="checkoutForm.get('shippingMethod')?.value === 'packeta'"
                         [class.bg-muted]="checkoutForm.get('shippingMethod')?.value === 'packeta'">
                    <input type="radio" formControlName="shippingMethod" value="packeta" class="mr-3">
                    <div class="flex-1">
                      <div class="font-mono uppercase font-bold">{{ 'checkout.packeta' | transloco }}</div>
                      <div class="text-sm text-muted-foreground">{{ 'checkout.packeta_desc' | transloco }}</div>
                    </div>
                    <div class="font-mono font-bold">€3.50</div>
                  </label>

                  <!-- Courier -->
                  <label class="flex items-center p-4 border border-border cursor-pointer hover:border-foreground transition-colors"
                         [class.border-foreground]="checkoutForm.get('shippingMethod')?.value === 'courier'"
                         [class.bg-muted]="checkoutForm.get('shippingMethod')?.value === 'courier'">
                    <input type="radio" formControlName="shippingMethod" value="courier" class="mr-3">
                    <div class="flex-1">
                      <div class="font-mono uppercase font-bold">{{ 'checkout.courier' | transloco }}</div>
                      <div class="text-sm text-muted-foreground">{{ 'checkout.courier_desc' | transloco }}</div>
                    </div>
                    <div class="font-mono font-bold">€5.99</div>
                  </label>
                </div>
              </div>

              <!-- Shipping Information -->
              <div class="border border-border p-6 mb-6">
                <h2 class="text-xl font-bold mb-6">{{ 'checkout.shipping' | transloco }}</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Email -->
                  <div class="md:col-span-2">
                    <label class="block text-sm font-mono uppercase mb-2" for="email">
                      {{ 'checkout.email' | transloco }} *
                    </label>
                    <input
                      type="email"
                      id="email"
                      formControlName="email"
                      class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                      [class.border-danger]="checkoutForm.get('email')?.invalid && checkoutForm.get('email')?.touched">
                    @if (checkoutForm.get('email')?.invalid && checkoutForm.get('email')?.touched) {
                      <p class="text-sm text-danger mt-1">{{ 'checkout.email_required' | transloco }}</p>
                    }
                  </div>

                  <!-- Full Name -->
                  <div class="md:col-span-2">
                    <label class="block text-sm font-mono uppercase mb-2" for="fullName">
                      {{ 'checkout.name' | transloco }} *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      formControlName="fullName"
                      class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                      [class.border-danger]="checkoutForm.get('fullName')?.invalid && checkoutForm.get('fullName')?.touched">
                  </div>

                  <!-- Phone -->
                  <div class="md:col-span-2">
                    <label class="block text-sm font-mono uppercase mb-2" for="phone">
                      {{ 'checkout.phone' | transloco }} *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      formControlName="phone"
                      class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                      [class.border-danger]="checkoutForm.get('phone')?.invalid && checkoutForm.get('phone')?.touched">
                  </div>

                  <!-- Address -->
                  <div class="md:col-span-2">
                    <label class="block text-sm font-mono uppercase mb-2" for="address">
                      {{ 'checkout.address' | transloco }} *
                    </label>
                    <input
                      type="text"
                      id="address"
                      formControlName="address"
                      class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                      [class.border-danger]="checkoutForm.get('address')?.invalid && checkoutForm.get('address')?.touched">
                  </div>

                  <!-- City -->
                  <div>
                    <label class="block text-sm font-mono uppercase mb-2" for="city">
                      {{ 'checkout.city' | transloco }} *
                    </label>
                    <input
                      type="text"
                      id="city"
                      formControlName="city"
                      class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                      [class.border-danger]="checkoutForm.get('city')?.invalid && checkoutForm.get('city')?.touched">
                  </div>

                  <!-- Postal Code -->
                  <div>
                    <label class="block text-sm font-mono uppercase mb-2" for="postalCode">
                      {{ 'checkout.postalCode' | transloco }} *
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      formControlName="postalCode"
                      class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                      [class.border-danger]="checkoutForm.get('postalCode')?.invalid && checkoutForm.get('postalCode')?.touched">
                  </div>

                  <!-- Country -->
                  <div class="md:col-span-2">
                    <label class="block text-sm font-mono uppercase mb-2" for="country">
                      {{ 'checkout.country' | transloco }} *
                    </label>
                    <select
                      id="country"
                      formControlName="country"
                      class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors">
                      <option value="SK">Slovakia</option>
                      <option value="CZ">Czech Republic</option>
                      <option value="AT">Austria</option>
                      <option value="PL">Poland</option>
                      <option value="HU">Hungary</option>
                      <option value="DE">Germany</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Additional Notes -->
              <div class="border border-border p-6 mb-6">
                <h2 class="text-xl font-bold mb-4">{{ 'checkout.notes' | transloco }}</h2>
                <textarea
                  formControlName="notes"
                  rows="3"
                  class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors resize-none"
                  [placeholder]="'checkout.notes_placeholder' | transloco"></textarea>
              </div>

              <!-- Company Purchase Toggle -->
              <div class="border border-border p-6 mb-6">
                <label class="flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    [checked]="isCompanyPurchase()"
                    (change)="toggleCompanyPurchase()"
                    class="mr-3">
                  <span class="font-mono uppercase font-bold">{{ 'checkout.company_purchase' | transloco }}</span>
                </label>

                @if (isCompanyPurchase()) {
                  <div class="mt-6 space-y-4">
                    <!-- Company Name -->
                    <div>
                      <label class="block text-sm font-mono uppercase mb-2" for="billingCompany">
                        {{ 'checkout.billing_company' | transloco }} *
                      </label>
                      <input
                        type="text"
                        id="billingCompany"
                        formControlName="billingCompany"
                        class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                        [class.border-danger]="checkoutForm.get('billingCompany')?.invalid && checkoutForm.get('billingCompany')?.touched">
                    </div>

                    <!-- IČO -->
                    <div>
                      <label class="block text-sm font-mono uppercase mb-2" for="billingIco">
                        {{ 'checkout.billing_ico' | transloco }} *
                      </label>
                      <input
                        type="text"
                        id="billingIco"
                        formControlName="billingIco"
                        class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                        [class.border-danger]="checkoutForm.get('billingIco')?.invalid && checkoutForm.get('billingIco')?.touched"
                        placeholder="12345678">
                    </div>

                    <!-- DIČ -->
                    <div>
                      <label class="block text-sm font-mono uppercase mb-2 text-muted-foreground" for="billingDic">
                        {{ 'checkout.billing_dic' | transloco }}
                      </label>
                      <input
                        type="text"
                        id="billingDic"
                        formControlName="billingDic"
                        class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                        placeholder="1234567890">
                    </div>

                    <!-- IČ DPH -->
                    <div>
                      <label class="block text-sm font-mono uppercase mb-2 text-muted-foreground" for="billingIcDph">
                        {{ 'checkout.billing_ic_dph' | transloco }}
                      </label>
                      <input
                        type="text"
                        id="billingIcDph"
                        formControlName="billingIcDph"
                        class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                        placeholder="SK1234567890">
                    </div>
                  </div>
                }
              </div>

              @if (error()) {
                <div class="bg-danger/10 border border-danger text-danger px-4 py-3 mb-6">
                  {{ error() }}
                </div>
              }
            </form>
          </div>

          <!-- Order Summary -->
          <div class="lg:col-span-1">
            <div class="border border-border p-6 sticky top-4">
              <h2 class="text-xl font-bold mb-6">{{ 'checkout.order_summary' | transloco }}</h2>

              <!-- Items -->
              <div class="space-y-3 mb-6 pb-6 border-b border-border max-h-[300px] overflow-y-auto">
                @for (item of cartService.items(); track item.product.id) {
                  <div class="flex gap-3">
                    <div class="w-16 h-20 bg-muted overflow-hidden flex-shrink-0">
                      @if (item.product.images && item.product.images.length > 0) {
                        <img 
                          [src]="item.product.images[0].image" 
                          [alt]="item.product.name"
                          class="w-full h-full object-cover">
                      }
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate">{{ item.product.name }}</p>
                      <p class="text-xs text-muted-foreground">{{ 'checkout.qty' | transloco }}: {{ item.quantity }}</p>
                      <p class="text-sm font-medium mt-1">
                        {{ (item.product.discount_price || item.product.price) | currency: 'EUR' }}
                      </p>
                    </div>
                  </div>
                }
              </div>

              <!-- Totals -->
              <div class="space-y-3 mb-6 pb-6 border-b border-border">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ 'cart.subtotal' | transloco }}</span>
                  <span class="font-medium">{{ cartService.subtotal() | currency: 'EUR' }}</span>
                </div>

                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ 'cart.shipping' | transloco }}</span>
                  <span class="font-medium">
                    @if (cartService.subtotal() >= freeShippingThreshold) {
                      <span class="text-success">{{ 'cart.free' | transloco }}</span>
                    } @else {
                      {{ shippingCost | currency: 'EUR' }}
                    }
                  </span>
                </div>
              </div>

              <div class="flex justify-between text-lg font-bold mb-6">
                <span>{{ 'cart.total' | transloco }}</span>
                <span>{{ total() | currency: 'EUR' }}</span>
              </div>

              <app-button 
                [variant]="'primary'"
                [size]="'lg'"
                [fullWidth]="true"
                [loading]="submitting()"
                [disabled]="checkoutForm.invalid"
                (clicked)="onSubmit()">
                {{ 'checkout.place_order' | transloco }}
              </app-button>

              <p class="text-xs text-muted-foreground text-center mt-4">
                {{ 'checkout.secure_checkout' | transloco }}
              </p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  cartService = inject(CartService);
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);

  submitting = signal(false);
  error = signal('');
  isCompanyPurchase = signal(false);
  
  freeShippingThreshold = 50;
  shippingCost = 5.99;

  checkoutForm: FormGroup;

  constructor() {
    this.checkoutForm = this.fb.group({
      shippingMethod: ['courier', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', Validators.required],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      postalCode: ['', Validators.required],
      country: ['SK', Validators.required],
      notes: [''],
      // Billing fields (conditional)
      billingCompany: [''],
      billingIco: [''],
      billingDic: [''],
      billingIcDph: ['']
    });
  }

  ngOnInit() {
    if (this.cartService.items().length === 0) {
      this.router.navigate(['/cart']);
      return;
    }
    
    // Pre-fill address from user profile if available
    const currentUser = this.authService.user();
    if (currentUser) {
      const nameParts = [currentUser.first_name, currentUser.last_name].filter(Boolean);
      const fullName = nameParts.join(' ');
      
      this.checkoutForm.patchValue({
        email: currentUser.email || '',
        fullName: fullName || '',
        phone: currentUser.phone || '',
        address: currentUser.street || '',
        city: currentUser.city || '',
        postalCode: currentUser.postal_code || '',
        country: currentUser.country || 'SK'
      });
    }
  }

  toggleCompanyPurchase() {
    this.isCompanyPurchase.set(!this.isCompanyPurchase());
    
    // Update validators based on company purchase
    const billingFields = ['billingCompany', 'billingIco'];
    if (this.isCompanyPurchase()) {
      billingFields.forEach(field => {
        this.checkoutForm.get(field)?.setValidators([Validators.required]);
        this.checkoutForm.get(field)?.updateValueAndValidity();
      });
    } else {
      billingFields.forEach(field => {
        this.checkoutForm.get(field)?.clearValidators();
        this.checkoutForm.get(field)?.updateValueAndValidity();
      });
    }
  }

  total(): number {
    const subtotal = this.cartService.subtotal();
    const shipping = subtotal >= this.freeShippingThreshold ? 0 : this.shippingCost;
    return subtotal + shipping;
  }

  onSubmit() {
    if (this.checkoutForm.invalid || this.submitting()) {
      Object.keys(this.checkoutForm.controls).forEach(key => {
        this.checkoutForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    const formValue = this.checkoutForm.value;

    const orderData: CreateOrderRequest = {
      shipping_method: formValue.shippingMethod,
      shipping_name: formValue.fullName,
      shipping_address: formValue.address,
      shipping_city: formValue.city,
      shipping_postal_code: formValue.postalCode,
      shipping_country: formValue.country,
      phone: formValue.phone,
      is_company_purchase: this.isCompanyPurchase(),
      ...(this.isCompanyPurchase() && {
        billing_company: formValue.billingCompany,
        billing_ico: formValue.billingIco,
        billing_dic: formValue.billingDic || '',
        billing_ic_dph: formValue.billingIcDph || ''
      }),
      items: this.cartService.items().map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }))
    };

    this.orderService.createOrder(orderData).subscribe({
      next: (order) => {
        this.cartService.clearCart();
        this.router.navigate(['/orders', order.id]);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to place order. Please try again.');
        this.submitting.set(false);
      }
    });
  }
}
