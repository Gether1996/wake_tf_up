import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CartService } from '../../core/api/cart.service';
import { OrderService, CreateOrderRequest } from '../../core/api/order.service';
import { PaymentService } from '../../core/api/payment.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoyaltyService, ValidateDiscountCodeResponse } from '../../core/api/loyalty.service';
import { LanguageService } from '../../core/services/language.service';
import { SettingsService } from '../../core/api/settings.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <!-- Progress Steps -->
      <div class="max-w-3xl mx-auto mb-12">
        <div class="flex items-center justify-center gap-2">
          <!-- Step 1: Cart (completed) -->
          <div class="flex items-center">
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-success text-success-foreground font-mono font-bold">
              ✓
            </div>
            <div class="ml-2 text-xs hidden md:block">
              <div class="font-mono uppercase font-bold text-success">{{ 'checkout.step_cart' | transloco }}</div>
            </div>
          </div>

          <!-- Connector -->
          <div [class]="'w-8 md:w-16 h-0.5 mx-1 ' + (currentStep() >= 2 ? 'bg-foreground' : 'bg-border')"></div>

          <!-- Step 2: Shipping -->
          <div 
            class="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            (click)="goToStep(1)">
            <div [class]="'flex items-center justify-center w-10 h-10 rounded-full font-mono font-bold ' + (currentStep() >= 2 ? 'bg-success text-success-foreground' : currentStep() === 1 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')">
              @if (currentStep() > 1) { ✓ } @else { 1 }
            </div>
            <div class="ml-2 text-xs hidden md:block">
              <div [class]="'font-mono uppercase font-bold ' + (currentStep() >= 1 ? '' : 'text-muted-foreground')">{{ 'checkout.step_shipping' | transloco }}</div>
            </div>
          </div>

          <!-- Connector -->
          <div [class]="'w-8 md:w-16 h-0.5 mx-1 ' + (currentStep() >= 3 ? 'bg-foreground' : 'bg-border')"></div>

          <!-- Step 3: Contact -->
          <div 
            [class]="'flex items-center transition-opacity ' + (currentStep() >= 2 ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60')"
            (click)="goToStep(2)">
            <div [class]="'flex items-center justify-center w-10 h-10 rounded-full font-mono font-bold ' + (currentStep() >= 3 ? 'bg-success text-success-foreground' : currentStep() === 2 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')">
              @if (currentStep() > 2) { ✓ } @else { 2 }
            </div>
            <div class="ml-2 text-xs hidden md:block">
              <div [class]="'font-mono uppercase font-bold ' + (currentStep() >= 2 ? '' : 'text-muted-foreground')">{{ 'checkout.step_contact' | transloco }}</div>
            </div>
          </div>

          <!-- Connector -->
          <div [class]="'w-8 md:w-16 h-0.5 mx-1 ' + (currentStep() >= 4 ? 'bg-foreground' : 'bg-border')"></div>

          <!-- Step 4: Payment -->
          <div 
            [class]="'flex items-center transition-opacity ' + (currentStep() >= 3 ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60')"
            (click)="goToStep(3)">
            <div [class]="'flex items-center justify-center w-10 h-10 rounded-full font-mono font-bold ' + (currentStep() >= 4 ? 'bg-success text-success-foreground' : currentStep() === 3 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')">
              @if (currentStep() > 3) { ✓ } @else { 3 }
            </div>
            <div class="ml-2 text-xs hidden md:block">
              <div [class]="'font-mono uppercase font-bold ' + (currentStep() >= 3 ? '' : 'text-muted-foreground')">{{ 'checkout.step_payment' | transloco }}</div>
            </div>
          </div>

          <!-- Connector -->
          <div [class]="'w-8 md:w-16 h-0.5 mx-1 ' + (currentStep() >= 4 ? 'bg-foreground' : 'bg-border')"></div>

          <!-- Step 5: Review -->
          <div 
            [class]="'flex items-center transition-opacity ' + (currentStep() >= 4 ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60')"
            (click)="goToStep(4)">
            <div [class]="'flex items-center justify-center w-10 h-10 rounded-full font-mono font-bold ' + (currentStep() === 4 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')">
              4
            </div>
            <div class="ml-2 text-xs hidden md:block">
              <div [class]="'font-mono uppercase font-bold ' + (currentStep() >= 4 ? '' : 'text-muted-foreground')">{{ 'checkout.step_review' | transloco }}</div>
            </div>
          </div>
        </div>
      </div>

      <h1 class="text-3xl md:text-4xl font-bold mb-8 text-center">{{ 'checkout.title' | transloco }}</h1>

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
              
              <!-- STEP 1: Shipping Method -->
              @if (currentStep() === 1) {
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
                    <div class="font-mono font-bold">
                      @if (pickupCost() === 0) {
                        {{ 'checkout.free' | transloco }}
                      } @else {
                        {{ pickupCost() | currency: 'EUR' }}
                      }
                    </div>
                  </label>

                  <!-- Packeta Z-Box -->
                  <label class="flex items-center p-4 border border-border cursor-pointer hover:border-foreground transition-colors"
                         [class.border-foreground]="checkoutForm.get('shippingMethod')?.value === 'packeta_box'"
                         [class.bg-muted]="checkoutForm.get('shippingMethod')?.value === 'packeta_box'">
                    <input type="radio" formControlName="shippingMethod" value="packeta_box" class="mr-3">
                    <div class="flex-1">
                      <div class="font-mono uppercase font-bold">{{ 'checkout.packeta_box' | transloco }}</div>
                      <div class="text-sm text-muted-foreground">{{ 'checkout.packeta_box_desc' | transloco }}</div>
                      @if (checkoutForm.get('shippingMethod')?.value === 'packeta_box' && selectedPacketaPoint()) {
                        <div class="mt-2 text-sm bg-success/10 border border-success text-success p-2 rounded">
                          <strong>✓ {{ selectedPacketaPoint()?.name }}</strong><br>
                          <span class="text-xs">{{ selectedPacketaPoint()?.address }}</span>
                        </div>
                      }
                    </div>
                    <div class="font-mono font-bold">{{ packetaBoxCost() | currency: 'EUR' }}</div>
                  </label>

                  @if (checkoutForm.get('shippingMethod')?.value === 'packeta_box') {
                    <div class="pl-10">
                      <app-button 
                        [variant]="'secondary'"
                        [size]="'sm'"
                        (clicked)="openPacketaWidget()">
                        {{ selectedPacketaPoint() ? ('checkout.change_pickup_point' | transloco) : ('checkout.select_pickup_point' | transloco) }}
                      </app-button>
                    </div>
                  }

                  <!-- DPD Courier -->
                  <label class="flex items-center p-4 border border-border cursor-pointer hover:border-foreground transition-colors"
                         [class.border-foreground]="checkoutForm.get('shippingMethod')?.value === 'dpd_courier'"
                         [class.bg-muted]="checkoutForm.get('shippingMethod')?.value === 'dpd_courier'">
                    <input type="radio" formControlName="shippingMethod" value="dpd_courier" class="mr-3">
                    <div class="flex-1">
                      <div class="font-mono uppercase font-bold">{{ 'checkout.dpd_courier' | transloco }}</div>
                      <div class="text-sm text-muted-foreground">{{ 'checkout.dpd_courier_desc' | transloco }}</div>
                    </div>
                    <div class="font-mono font-bold">{{ dpdCourierCost() | currency: 'EUR' }}</div>
                  </label>

                  <!-- Packeta Courier -->
                  <label class="flex items-center p-4 border border-border cursor-pointer hover:border-foreground transition-colors"
                         [class.border-foreground]="checkoutForm.get('shippingMethod')?.value === 'packeta_courier'"
                         [class.bg-muted]="checkoutForm.get('shippingMethod')?.value === 'packeta_courier'">
                    <input type="radio" formControlName="shippingMethod" value="packeta_courier" class="mr-3">
                    <div class="flex-1">
                      <div class="font-mono uppercase font-bold">{{ 'checkout.packeta_courier' | transloco }}</div>
                      <div class="text-sm text-muted-foreground">{{ 'checkout.packeta_courier_desc' | transloco }}</div>
                    </div>
                    <div class="font-mono font-bold">{{ packetaCourierCost() | currency: 'EUR' }}</div>
                  </label>
                </div>
              </div>
              }

              <!-- STEP 2: Contact & Shipping Information -->
              @if (currentStep() === 2) {
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
              }

              <!-- STEP 3: Payment Method -->
              @if (currentStep() === 3) {
              <div class="border border-border p-6 mb-6">
                <h2 class="text-xl font-bold mb-6">{{ 'checkout.payment_method' | transloco }}</h2>
                
                <div class="space-y-3">
                  <!-- GoPay Payment -->
                  <label 
                    class="flex items-center p-4 border border-border cursor-pointer hover:border-foreground transition-colors"
                    [class.border-foreground]="selectedPaymentMethod() === 'gopay'"
                    [class.bg-muted]="selectedPaymentMethod() === 'gopay'">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="gopay" 
                      [checked]="selectedPaymentMethod() === 'gopay'"
                      (change)="selectedPaymentMethod.set('gopay'); saveCheckoutData()"
                      class="mr-3">
                    <div class="flex-1">
                      <div class="font-mono uppercase font-bold">GoPay</div>
                      <div class="text-sm text-muted-foreground">{{ 'checkout.gopay_desc' | transloco }}</div>
                      <div class="mt-2 flex gap-2 items-center flex-wrap">
                        <span class="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white px-3 py-1.5 rounded flex items-center gap-1 font-medium shadow-sm">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
                            <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" stroke-width="2"/>
                            <path d="M2 10h20" stroke="white" stroke-width="2"/>
                          </svg>
                          <span>{{ 'checkout.card' | transloco }}</span>
                        </span>
                        <span class="text-xs bg-gradient-to-br from-green-600 to-teal-600 text-white px-3 py-1.5 rounded flex items-center gap-1 font-medium shadow-sm">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
                            <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" stroke-width="2"/>
                            <path d="M21 9V6a2 2 0 00-2-2H5a2 2 0 00-2 2v3" stroke="white" stroke-width="2"/>
                            <path d="M12 3v6M8 13h8M8 17h5" stroke="white" stroke-width="2" stroke-linecap="round"/>
                          </svg>
                          <span>{{ 'checkout.bank' | transloco }}</span>
                        </span>
                        <span class="text-xs bg-white text-black px-3 py-1.5 border border-gray-200 rounded flex items-center gap-1 font-medium shadow-sm" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;">
                          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
                            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#4285F4"/>
                          </svg>
                          <span style="letter-spacing: -0.01em;">Pay</span>
                        </span>
                        <span class="text-xs bg-black text-white px-3 py-1.5 border border-black rounded flex items-center gap-1 font-medium shadow-sm" style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;">
                          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="white" style="flex-shrink: 0;">
                            <path d="M16.365 8.115c-.378.445-.999 1.213-.999 2.338 0 1.294.756 1.854 1.026 2.016-.067.203-.319 1.093-.999 2.05-.621.874-1.269 1.747-2.268 1.747s-1.243-.555-2.352-.555c-1.081 0-1.458.571-2.352.571-.894 0-1.539-.807-2.283-1.798C5.286 12.858 4.5 10.521 4.5 8.319c0-3.264 2.117-4.995 4.199-4.995.999 0 1.832.656 2.461.656.596 0 1.526-.689 2.663-.689.428 0 1.966.038 2.982 1.48-.077.048-1.78 1.04-1.78 3.09.001 0 .001 0 0 0zm-2.58-4.904c.336-.42.596-.999.596-1.578 0-.081-.008-.162-.023-.211-.569.023-1.247.378-1.651.84-.32.354-.621.92-.621 1.506 0 .087.015.174.023.202.039.007.103.015.166.015.51 0 1.148-.342 1.51-.774z"/>
                          </svg>
                          <span style="letter-spacing: -0.02em;">Pay</span>
                        </span>
                      </div>
                    </div>
                    <div class="text-right">
                      <img src="/assets/gopay-logo.svg" alt="GoPay" class="h-8 opacity-80" onerror="this.style.display='none'">
                    </div>
                  </label>

                  <!-- Cash on Pickup (only for personal pickup) -->
                  @if (selectedShippingMethod() === 'pickup') {
                  <label 
                    class="flex items-center p-4 border border-border cursor-pointer hover:border-foreground transition-colors"
                    [class.border-foreground]="selectedPaymentMethod() === 'cash_on_pickup'"
                    [class.bg-muted]="selectedPaymentMethod() === 'cash_on_pickup'">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="cash_on_pickup" 
                      [checked]="selectedPaymentMethod() === 'cash_on_pickup'"
                      (change)="selectedPaymentMethod.set('cash_on_pickup'); saveCheckoutData()"
                      class="mr-3">
                    <div class="flex-1">
                      <div class="font-mono uppercase font-bold">{{ 'checkout.cash_on_pickup' | transloco }}</div>
                      <div class="text-sm text-muted-foreground">{{ 'checkout.cash_on_pickup_desc' | transloco }}</div>
                      <div class="mt-2">
                        <span class="text-xs bg-background px-2 py-1 border border-border">💵 {{ 'checkout.cash' | transloco }}</span>
                      </div>
                    </div>
                    <div class="text-2xl">
                      💰
                    </div>
                  </label>
                  }
                </div>
              </div>
              }

              <!-- STEP 4: Review Order -->
              @if (currentStep() === 4) {
              <div class="border border-border p-6 mb-6">
                <h2 class="text-xl font-bold mb-6">{{ 'checkout.review_order' | transloco }}</h2>

                <!-- Order Items -->
                <div class="mb-6">
                  <h3 class="font-mono uppercase font-bold text-sm mb-4">{{ 'checkout.order_items' | transloco }}</h3>
                  <div class="space-y-4">
                    @for (item of cartService.items(); track item.product.id) {
                      <div class="flex gap-4 pb-4 border-b border-border last:border-0">
                        <div class="w-20 h-24 bg-muted overflow-hidden flex-shrink-0">
                          @if (item.product.images && item.product.images.length > 0) {
                            <img 
                              [src]="getImageUrl(item.product.images[0].image)" 
                              [alt]="item.product.name"
                              class="w-full h-full object-cover">
                          } @else if (item.product.primary_image) {
                            <img 
                              [src]="getImageUrl(item.product.primary_image)" 
                              [alt]="item.product.name"
                              class="w-full h-full object-cover">
                          }
                        </div>
                        <div class="flex-1">
                          <p class="font-medium">{{ item.product.name }}</p>
                          <p class="text-sm text-muted-foreground">{{ 'checkout.qty' | transloco }}: {{ item.quantity }}</p>
                          <p class="font-medium mt-2">
                            {{ (+(item.product.discount_price ?? item.product.price)) * item.quantity | currency: 'EUR' }}
                          </p>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Shipping Method -->
                <div class="mb-6 pb-6 border-b border-border">
                  <h3 class="font-mono uppercase font-bold text-sm mb-3">{{ 'checkout.shipping_method' | transloco }}</h3>
                  <div class="bg-muted p-4">
                    <p class="font-medium">{{ getShippingMethodName() }}</p>
                    @if (selectedShippingMethod() === 'packeta_box' && selectedPacketaPoint()) {
                      <p class="text-sm text-muted-foreground mt-2">
                        <strong>{{ selectedPacketaPoint()?.name }}</strong><br>
                        {{ selectedPacketaPoint()?.address }}
                      </p>
                    }
                    <p class="font-medium mt-2">{{ selectedShippingCost() | currency: 'EUR' }}</p>
                  </div>
                </div>

                <!-- Contact Information -->
                <div class="mb-6 pb-6 border-b border-border">
                  <h3 class="font-mono uppercase font-bold text-sm mb-3">{{ 'checkout.contact_info' | transloco }}</h3>
                  <div class="bg-muted p-4 text-sm space-y-1">
                    <p><strong>{{ 'checkout.email' | transloco }}:</strong> {{ checkoutForm.get('email')?.value }}</p>
                    <p><strong>{{ 'checkout.name' | transloco }}:</strong> {{ checkoutForm.get('fullName')?.value }}</p>
                    <p><strong>{{ 'checkout.phone' | transloco }}:</strong> {{ checkoutForm.get('phone')?.value }}</p>
                  </div>
                </div>

                <!-- Shipping Address -->
                @if (selectedShippingMethod() !== 'packeta_box') {
                <div class="mb-6 pb-6 border-b border-border">
                  <h3 class="font-mono uppercase font-bold text-sm mb-3">{{ 'checkout.shipping_address' | transloco }}</h3>
                  <div class="bg-muted p-4 text-sm space-y-1">
                    <p>{{ checkoutForm.get('address')?.value }}</p>
                    <p>{{ checkoutForm.get('city')?.value }}, {{ checkoutForm.get('postalCode')?.value }}</p>
                    <p>{{ checkoutForm.get('country')?.value }}</p>
                  </div>
                </div>
                }

                <!-- Company Info (if applicable) -->
                @if (isCompanyPurchase()) {
                <div class="mb-6 pb-6 border-b border-border">
                  <h3 class="font-mono uppercase font-bold text-sm mb-3">{{ 'checkout.company_info' | transloco }}</h3>
                  <div class="bg-muted p-4 text-sm space-y-1">
                    <p><strong>{{ 'checkout.billing_company' | transloco }}:</strong> {{ checkoutForm.get('billingCompany')?.value }}</p>
                    <p><strong>{{ 'checkout.billing_ico' | transloco }}:</strong> {{ checkoutForm.get('billingIco')?.value }}</p>
                    @if (checkoutForm.get('billingDic')?.value) {
                      <p><strong>{{ 'checkout.billing_dic' | transloco }}:</strong> {{ checkoutForm.get('billingDic')?.value }}</p>
                    }
                    @if (checkoutForm.get('billingIcDph')?.value) {
                      <p><strong>{{ 'checkout.billing_ic_dph' | transloco }}:</strong> {{ checkoutForm.get('billingIcDph')?.value }}</p>
                    }
                  </div>
                </div>
                }

                <!-- Payment Method -->
                <div class="mb-6 pb-6 border-b border-border">
                  <h3 class="font-mono uppercase font-bold text-sm mb-3">{{ 'checkout.payment_method' | transloco }}</h3>
                  <div class="bg-muted p-4">
                    @if (selectedPaymentMethod() === 'gopay') {
                      <p class="font-medium">GoPay</p>
                      <p class="text-sm text-muted-foreground mt-1">{{ 'checkout.gopay_desc' | transloco }}</p>
                    } @else if (selectedPaymentMethod() === 'cash_on_pickup') {
                      <p class="font-medium">{{ 'checkout.cash_on_pickup' | transloco }}</p>
                      <p class="text-sm text-muted-foreground mt-1">{{ 'checkout.cash_on_pickup_desc' | transloco }}</p>
                    }
                  </div>
                </div>

                <!-- Additional Notes -->
                @if (checkoutForm.get('notes')?.value) {
                <div class="mb-6">
                  <h3 class="font-mono uppercase font-bold text-sm mb-3">{{ 'checkout.notes' | transloco }}</h3>
                  <div class="bg-muted p-4 text-sm">
                    <p>{{ checkoutForm.get('notes')?.value }}</p>
                  </div>
                </div>
                }

                <!-- Total Summary -->
                <div class="bg-foreground text-background p-4">
                  <div class="flex justify-between items-center">
                    <span class="font-mono uppercase font-bold">{{ 'checkout.total' | transloco }}</span>
                    <span class="text-2xl font-bold">{{ total() | currency: 'EUR' }}</span>
                  </div>
                </div>

                <!-- Terms of Service Checkbox -->
                <div class="mt-6">
                  <label class="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      formControlName="acceptTerms"
                      class="mt-1 w-4 h-4 cursor-pointer">
                    <span class="text-sm">
                      <ng-container *transloco="let t">
                        {{ t('checkout.accept_terms_1') }}
                        <a [routerLink]="'/' + currentLang() + '/terms-of-service'" target="_blank" class="text-accent hover:underline">
                          {{ t('checkout.terms_of_service') }}
                        </a>
                        {{ t('checkout.accept_terms_2') }}
                      </ng-container>
                    </span>
                  </label>
                  @if (checkoutForm.get('acceptTerms')?.invalid && checkoutForm.get('acceptTerms')?.touched) {
                    <p class="text-sm text-danger mt-2">{{ 'checkout.terms_required' | transloco }}</p>
                  }
                </div>
              </div>
              }

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
                          [src]="getImageUrl(item.product.images[0].image)" 
                          [alt]="item.product.name"
                          class="w-full h-full object-cover">
                      } @else if (item.product.primary_image) {
                        <img 
                          [src]="getImageUrl(item.product.primary_image)" 
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
                    @if (cartService.subtotal() >= freeShippingThreshold()) {
                      <span class="text-success">{{ 'cart.free' | transloco }}</span>
                    } @else {
                      {{ selectedShippingCost() | currency: 'EUR' }}
                    }
                  </span>
                </div>

                @if (discountValidation()?.valid) {
                  <div class="flex justify-between text-success">
                    <span>{{ 'checkout.discount' | transloco }} ({{ discountCode() }})</span>
                    <span>-{{ discountValidation()!.discount_amount | currency: 'EUR' }}</span>
                  </div>
                }
              </div>

              <!-- Discount Code Input -->
              <div class="mb-6 pb-6 border-b border-border">
                <h3 class="font-mono uppercase font-bold text-sm mb-3">{{ 'checkout.discount_code' | transloco }}</h3>
                
                @if (!discountValidation()?.valid) {
                  <div class="flex gap-2">
                    <input
                      type="text"
                      [(ngModel)]="discountCode"
                      (ngModelChange)="saveCheckoutData()"
                      [disabled]="validatingDiscount()"
                      class="flex-1 px-3 py-2 text-sm border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                      [class.border-danger]="discountError()"
                      [placeholder]="(currentLang() === 'sk' ? 'Zadajte kód' : 'Enter code') + ''">
                    <app-button
                      [size]="'sm'"
                      [disabled]="validatingDiscount() || !discountCode().trim()"
                      [loading]="validatingDiscount()"
                      (clicked)="validateDiscountCode()">
                      {{ currentLang() === 'sk' ? 'Použiť' : 'Apply' }}
                    </app-button>
                  </div>
                  @if (discountError()) {
                    <p class="text-xs text-danger mt-1">{{ discountError() }}</p>
                  }
                } @else {
                  <div class="bg-success/10 border border-success p-3 flex items-center justify-between">
                    <div class="flex-1">
                      <p class="text-sm font-medium text-success">✓ {{ discountValidation()!.message }}</p>
                      <p class="text-xs text-muted-foreground mt-1">{{ 'checkout.code' | transloco }}: {{ discountCode() }}</p>
                    </div>
                    <button
                      type="button"
                      (click)="removeDiscountCode()"
                      class="text-muted-foreground hover:text-foreground transition-colors">
                      ✕
                    </button>
                  </div>
                }
              </div>

              <div class="flex justify-between text-lg font-bold mb-6">
                <span>{{ 'cart.total' | transloco }}</span>
                <span>{{ total() | currency: 'EUR' }}</span>
              </div>

              <!-- Navigation Buttons -->
              @if (currentStep() === 1) {
                <app-button 
                  [type]="'button'"
                  [fullWidth]="true"
                  (clicked)="nextStep()">
                  {{ 'checkout.next_step' | transloco }}
                </app-button>
              } @else if (currentStep() === 4) {
                <div class="space-y-3">
                  <app-button 
                    [type]="'button'"
                    [fullWidth]="true"
                    [loading]="submitting()"
                    [disabled]="checkoutForm.invalid || submitting()"
                    (clicked)="onSubmit()">
                    {{ 'checkout.place_order' | transloco }}
                  </app-button>
                  <app-button 
                    [type]="'button'"
                    [variant]="'secondary'"
                    [fullWidth]="true"
                    (clicked)="previousStep()">
                    {{ 'checkout.previous_step' | transloco }}
                  </app-button>
                </div>
              } @else {
                <div class="space-y-3">
                  <app-button 
                    [type]="'button'"
                    [fullWidth]="true"
                    (clicked)="nextStep()">
                    {{ 'checkout.next_step' | transloco }}
                  </app-button>
                  <app-button 
                    [type]="'button'"
                    [variant]="'secondary'"
                    [fullWidth]="true"
                    (clicked)="previousStep()">
                    {{ 'checkout.previous_step' | transloco }}
                  </app-button>
                </div>
              }
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
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);
  private settingsService = inject(SettingsService);
  private loyaltyService = inject(LoyaltyService);
  private translocoService = inject(TranslocoService);

  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);

  submitting = signal(false);
  error = signal('');
  currentStep = signal(1); // 1=shipping, 2=contact, 3=payment, 4=review
  isCompanyPurchase = signal(false);
  selectedShippingMethod = signal<'pickup' | 'dpd_courier' | 'packeta_box' | 'packeta_courier'>('dpd_courier');
  selectedPacketaPoint = signal<{ id: string; name: string; address: string } | null>(null);
  selectedPaymentMethod = signal<'gopay' | 'cash_on_pickup'>('gopay');
  
  // Discount code
  discountCode = signal('');
  validatingDiscount = signal(false);
  discountValidation = signal<ValidateDiscountCodeResponse | null>(null);
  discountError = signal('');
  
  // Shipping costs from settings
  freeShippingThreshold = computed(() => {
    const threshold = this.settingsService.settings()?.free_shipping_threshold;
    return threshold ? Number(threshold) : 50;
  });
  
  pickupCost = computed(() => {
    const cost = this.settingsService.settings()?.pickup_cost;
    return cost ? Number(cost) : 0;
  });
  
  dpdCourierCost = computed(() => {
    const cost = this.settingsService.settings()?.dpd_courier_cost;
    return cost ? Number(cost) : 5.99;
  });
  
  packetaBoxCost = computed(() => {
    const cost = this.settingsService.settings()?.packeta_box_cost;
    return cost ? Number(cost) : 3.99;
  });
  
  packetaCourierCost = computed(() => {
    const cost = this.settingsService.settings()?.packeta_courier_cost;
    return cost ? Number(cost) : 4.99;
  });
  
  selectedShippingCost = computed(() => {
    const method = this.selectedShippingMethod();
    switch(method) {
      case 'pickup': return this.pickupCost();
      case 'dpd_courier': return this.dpdCourierCost();
      case 'packeta_box': return this.packetaBoxCost();
      case 'packeta_courier': return this.packetaCourierCost();
      default: return 0;
    }
  });

  checkoutForm: FormGroup;

  constructor() {
    this.checkoutForm = this.fb.group({
      shippingMethod: ['dpd_courier', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', Validators.required],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      postalCode: ['', Validators.required],
      country: ['SK', Validators.required],
      notes: [''],
      acceptTerms: [false, Validators.requiredTrue],
      // Billing fields (conditional)
      billingCompany: [''],
      billingIco: [''],
      billingDic: [''],
      billingIcDph: ['']
    });

    // Auto-fill form when user data becomes available
    effect(() => {
      const currentUser = this.authService.user();
      if (currentUser && !this.checkoutForm.get('email')?.value) {
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
    });
  }

  ngOnInit() {
    if (this.cartService.items().length === 0) {
      const lang = this.languageService.currentLang();
      this.router.navigate([lang, 'cart']);
      return;
    }
    
    // Load saved checkout data from localStorage
    this.loadCheckoutData();
    
    // Subscribe to shipping method changes
    this.checkoutForm.get('shippingMethod')?.valueChanges.subscribe(value => {
      this.selectedShippingMethod.set(value);
      // Reset Packeta point when changing shipping method
      if (value !== 'packeta_box') {
        this.selectedPacketaPoint.set(null);
      }
      // Reset payment method to GoPay if not pickup
      if (value !== 'pickup') {
        this.selectedPaymentMethod.set('gopay');
      }
      this.saveCheckoutData();
    });

    // Subscribe to form changes to auto-save
    this.checkoutForm.valueChanges.subscribe(() => {
      this.saveCheckoutData();
    });
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
    
    this.saveCheckoutData();
  }

  openPacketaWidget() {
    // @ts-ignore - Packeta widget is loaded via external script
    if (typeof Packeta !== 'undefined') {
      // Load API key from backend
      this.settingsService.getPacketaApiKey().subscribe({
        next: (response) => {
          const apiKey = response.api_key || '9dbc4fa2f90c9113';
          // @ts-ignore
          Packeta.Widget.pick(apiKey, (point: any) => {
            if (point) {
              this.selectedPacketaPoint.set({
                id: point.id,
                name: point.name,
                address: `${point.street}, ${point.city}, ${point.zip}`
              });
              this.saveCheckoutData();
            }
          }, {
            country: 'sk',
            language: this.currentLang() === 'sk' ? 'sk' : 'en'
          });
        },
        error: (err) => {
          console.error('Failed to load Packeta API key:', err);
          // Fallback to default test key
          const apiKey = '9dbc4fa2f90c9113';
          // @ts-ignore
          Packeta.Widget.pick(apiKey, (point: any) => {
            if (point) {
              this.selectedPacketaPoint.set({
                id: point.id,
                name: point.name,
                address: `${point.street}, ${point.city}, ${point.zip}`
              });
              this.saveCheckoutData();
            }
          }, {
            country: 'sk',
            language: this.currentLang() === 'sk' ? 'sk' : 'en'
          });
        }
      });
    } else {
      console.error('Packeta widget not loaded');
    }
  }

  total(): number {
    const subtotal = this.cartService.subtotal();
    const shipping = subtotal >= this.freeShippingThreshold() ? 0 : this.selectedShippingCost();
    const discount = this.discountValidation()?.valid ? this.discountValidation()!.discount_amount : 0;
    // Discount applies only to subtotal, then add shipping
    return Math.max(0, (subtotal - discount) + shipping);
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    // If already absolute URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    // If relative path, prepend base URL
    return `${environment.apiBaseUrl}${imagePath}`;
  }

  nextStep() {
    // Validate current step before proceeding
    if (this.currentStep() === 1) {
      // Validate shipping method and Packeta point if needed
      if (this.selectedShippingMethod() === 'packeta_box' && !this.selectedPacketaPoint()) {
        this.error.set(this.currentLang() === 'sk' 
          ? 'Prosím vyberte výdajné miesto Packeta' 
          : 'Please select a Packeta pickup point');
        return;
      }
      this.error.set('');
      this.currentStep.set(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (this.currentStep() === 2) {
      // Validate contact and address fields
      const requiredFields = ['email', 'fullName', 'phone', 'address', 'city', 'postalCode', 'country'];
      let isValid = true;
      
      requiredFields.forEach(field => {
        const control = this.checkoutForm.get(field);
        if (!control?.value) {
          control?.markAsTouched();
          isValid = false;
        }
      });

      if (!isValid) {
        this.error.set(this.currentLang() === 'sk' 
          ? 'Prosím vyplňte všetky povinné polia' 
          : 'Please fill in all required fields');
        return;
      }

      if (this.checkoutForm.invalid) {
        Object.keys(this.checkoutForm.controls).forEach(key => {
          this.checkoutForm.get(key)?.markAsTouched();
        });
        return;
      }

      this.error.set('');
      this.currentStep.set(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (this.currentStep() === 3) {
      // Step 3: Payment method (always GoPay for now)
      this.error.set('');
      this.currentStep.set(4);
      this.saveCheckoutData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
      this.saveCheckoutData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(step: number) {
    // Allow going back to any previous step or current step
    // Don't allow skipping forward
    if (step <= this.currentStep() && step >= 1) {
      this.currentStep.set(step);
      this.error.set('');
      this.saveCheckoutData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  saveCheckoutData() {
    const checkoutData = {
      formValues: this.checkoutForm.value,
      currentStep: this.currentStep(),
      isCompanyPurchase: this.isCompanyPurchase(),
      selectedShippingMethod: this.selectedShippingMethod(),
      selectedPacketaPoint: this.selectedPacketaPoint(),
      selectedPaymentMethod: this.selectedPaymentMethod(),
      discountCode: this.discountCode(),
      discountValidation: this.discountValidation()
    };
    // Use sessionStorage - data is cleared when tab/browser is closed
    // This prevents data leaking between different users on same device
    sessionStorage.setItem('checkout_data', JSON.stringify(checkoutData));
  }

  loadCheckoutData() {
    const saved = sessionStorage.getItem('checkout_data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        
        // Restore form values
        if (data.formValues) {
          this.checkoutForm.patchValue(data.formValues, { emitEvent: false });
        }
        
        // Restore state
        if (data.currentStep) this.currentStep.set(data.currentStep);
        
        // Restore company purchase and update validators
        if (data.isCompanyPurchase !== undefined) {
          this.isCompanyPurchase.set(data.isCompanyPurchase);
          const billingFields = ['billingCompany', 'billingIco'];
          if (data.isCompanyPurchase) {
            billingFields.forEach(field => {
              this.checkoutForm.get(field)?.setValidators([Validators.required]);
              this.checkoutForm.get(field)?.updateValueAndValidity();
            });
          }
        }
        
        if (data.selectedShippingMethod) this.selectedShippingMethod.set(data.selectedShippingMethod);
        if (data.selectedPacketaPoint) this.selectedPacketaPoint.set(data.selectedPacketaPoint);
        if (data.selectedPaymentMethod) this.selectedPaymentMethod.set(data.selectedPaymentMethod);
        if (data.discountCode) this.discountCode.set(data.discountCode);
        if (data.discountValidation) this.discountValidation.set(data.discountValidation);
      } catch (e) {
        console.error('Failed to load checkout data:', e);
      }
    }
  }

  clearCheckoutData() {
    sessionStorage.removeItem('checkout_data');
  }

  getShippingMethodName(): string {
    const method = this.selectedShippingMethod();
    const names: Record<string, string> = {
      'pickup': this.currentLang() === 'sk' ? 'Osobný odber' : 'Personal Pickup',
      'dpd_courier': this.currentLang() === 'sk' ? 'DPD Kuriér' : 'DPD Courier',
      'packeta_box': this.currentLang() === 'sk' ? 'Packeta Z-Box' : 'Packeta Z-Box',
      'packeta_courier': this.currentLang() === 'sk' ? 'Packeta Kuriér' : 'Packeta Courier'
    };
    return names[method] || method;
  }

  validateDiscountCode() {
    const code = this.discountCode().trim();
    if (!code) {
      this.discountError.set(this.translocoService.translate('checkout.enter_discount_code'));
      return;
    }

    this.validatingDiscount.set(true);
    this.discountError.set('');
    
    // Discount applies only to subtotal, not shipping
    const orderTotal = this.cartService.subtotal();

    this.loyaltyService.validateDiscountCode({
      code: code,
      order_total: orderTotal
    }).subscribe({
      next: (response) => {
        this.validatingDiscount.set(false);
        if (response.valid) {
          this.discountValidation.set(response);
          this.discountError.set('');
          this.saveCheckoutData();
        } else {
          this.discountValidation.set(null);
          // Use error_code for translation, fallback to message
          if (response.error_code) {
            const translationKey = `checkout.discount_errors.${response.error_code}`;
            if (response.error_code === 'MIN_ORDER_VALUE' && response.min_value) {
              this.discountError.set(
                this.translocoService.translate(translationKey, { value: response.min_value })
              );
            } else {
              this.discountError.set(this.translocoService.translate(translationKey));
            }
          } else {
            this.discountError.set(response.message);
          }
        }
      },
      error: (err) => {
        this.validatingDiscount.set(false);
        this.discountValidation.set(null);
        const errorCode = err.error?.error_code;
        if (errorCode) {
          const translationKey = `checkout.discount_errors.${errorCode}`;
          this.discountError.set(this.translocoService.translate(translationKey));
        } else {
          this.discountError.set(
            this.translocoService.translate('checkout.discount_errors.UNKNOWN')
          );
        }
      }
    });
  }

  removeDiscountCode() {
    this.discountCode.set('');
    this.discountValidation.set(null);
    this.discountError.set('');
    this.saveCheckoutData();
  }

  onSubmit() {
    // This should only be called from step 4 (review)
    if (this.currentStep() !== 4) {
      return;
    }

    if (this.checkoutForm.invalid || this.submitting()) {
      Object.keys(this.checkoutForm.controls).forEach(key => {
        this.checkoutForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Validate Packeta point selection
    if (this.checkoutForm.value.shippingMethod === 'packeta_box' && !this.selectedPacketaPoint()) {
      this.error.set(this.currentLang() === 'sk' 
        ? 'Prosím vyberte výdajné miesto Packeta' 
        : 'Please select a Packeta pickup point');
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
      ...(formValue.shippingMethod === 'packeta_box' && this.selectedPacketaPoint() && {
        packeta_point_id: this.selectedPacketaPoint()!.id,
        packeta_point_name: this.selectedPacketaPoint()!.name,
        packeta_point_address: this.selectedPacketaPoint()!.address
      }),
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
      })),
      ...(this.discountValidation()?.valid && this.discountCode() && {
        discount_code_str: this.discountCode()
      })
    };

    this.orderService.createOrder(orderData).subscribe({
      next: (order) => {
        // Clear saved checkout data after successful order creation
        this.clearCheckoutData();
        
        // Check payment method
        if (this.selectedPaymentMethod() === 'cash_on_pickup') {
          // Cash on pickup - no GoPay payment needed
          this.cartService.clearCart();
          this.router.navigate([this.currentLang(), 'order-confirmation'], {
            queryParams: { 
              order_id: order.id, 
              payment_method: 'cash_on_pickup',
              status: 'pending'
            }
          });
        } else {
          // GoPay payment - create payment and redirect
          this.paymentService.createPayment({ order_id: order.id }).subscribe({
            next: (paymentResponse) => {
              if (paymentResponse.success && paymentResponse.payment_url) {
                // Clear cart and redirect to GoPay
                this.cartService.clearCart();
                // Redirect to GoPay payment page
                window.location.href = paymentResponse.payment_url;
              } else {
                this.error.set('Failed to initialize payment. Please try again.');
                this.submitting.set(false);
              }
            },
            error: (err) => {
              console.error('Payment creation error:', err);
              this.error.set(err.error?.error || 'Failed to initialize payment. Please try again.');
              this.submitting.set(false);
            }
          });
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to place order. Please try again.');
        this.submitting.set(false);
      }
    });
  }
}
