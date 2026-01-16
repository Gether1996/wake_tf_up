import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { CartService } from '../../core/api/cart.service';
import { OrderService, CreateOrderRequest } from '../../core/api/order.service';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { SettingsService } from '../../core/api/settings.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslocoModule, ButtonComponent],
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
          <div [class]="'w-8 md:w-16 h-0.5 mx-1 ' + (currentStep() >= 3 ? 'bg-foreground' : 'bg-border')"></div>

          <!-- Step 4: Review -->
          <div 
            [class]="'flex items-center transition-opacity ' + (currentStep() >= 3 ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60')"
            (click)="goToStep(3)">
            <div [class]="'flex items-center justify-center w-10 h-10 rounded-full font-mono font-bold ' + (currentStep() === 3 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')">
              3
            </div>
            <div class="ml-2 text-xs hidden md:block">
              <div [class]="'font-mono uppercase font-bold ' + (currentStep() >= 3 ? '' : 'text-muted-foreground')">{{ 'checkout.step_review' | transloco }}</div>
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

              <!-- Step 1 Navigation -->
              <div class="flex justify-end">
                <app-button 
                  [type]="'button'"
                  (clicked)="nextStep()">
                  {{ 'checkout.next_step' | transloco }}
                </app-button>
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

              <!-- Step 2 Navigation -->
              <div class="flex gap-4 mt-6">
                <app-button 
                  [type]="'button'"
                  [variant]="'secondary'"
                  (clicked)="previousStep()">
                  {{ 'checkout.previous_step' | transloco }}
                </app-button>
                <app-button 
                  [type]="'button'"
                  (clicked)="nextStep()">
                  {{ 'checkout.next_step' | transloco }}
                </app-button>
              </div>
              }

              <!-- STEP 3: Review Order -->
              @if (currentStep() === 3) {
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
              </div>

              <!-- Step 3 Navigation -->
              <div class="flex gap-4">
                <app-button 
                  [type]="'button'"
                  [variant]="'secondary'"
                  (clicked)="previousStep()">
                  {{ 'checkout.previous_step' | transloco }}
                </app-button>
                <app-button 
                  [type]="'submit'"
                  [loading]="submitting()">
                  {{ 'checkout.place_order' | transloco }}
                </app-button>
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
              </div>

              <div class="flex justify-between text-lg font-bold">
                <span>{{ 'cart.total' | transloco }}</span>
                <span>{{ total() | currency: 'EUR' }}</span>
              </div>
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
  private settingsService = inject(SettingsService);

  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);

  submitting = signal(false);
  error = signal('');
  currentStep = signal(1); // 1=shipping, 2=contact, 3=review
  isCompanyPurchase = signal(false);
  selectedShippingMethod = signal<'pickup' | 'dpd_courier' | 'packeta_box' | 'packeta_courier'>('dpd_courier');
  selectedPacketaPoint = signal<{ id: string; name: string; address: string } | null>(null);
  
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
    
    // Subscribe to shipping method changes
    this.checkoutForm.get('shippingMethod')?.valueChanges.subscribe(value => {
      this.selectedShippingMethod.set(value);
      // Reset Packeta point when changing shipping method
      if (value !== 'packeta_box') {
        this.selectedPacketaPoint.set(null);
      }
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
    return subtotal + shipping;
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
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(step: number) {
    // Allow going back to any previous step or current step
    // Don't allow skipping forward
    if (step <= this.currentStep() && step >= 1) {
      this.currentStep.set(step);
      this.error.set('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  onSubmit() {
    // This should only be called from step 3 (review)
    if (this.currentStep() !== 3) {
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
      }))
    };

    this.orderService.createOrder(orderData).subscribe({
      next: (order) => {
        this.cartService.clearCart();
        this.router.navigate([`/${this.currentLang()}/orders`]);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to place order. Please try again.');
        this.submitting.set(false);
      }
    });
  }
}
