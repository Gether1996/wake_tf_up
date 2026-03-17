import { Component, input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Ticket } from '../../core/api/api.models';
import { ButtonComponent } from '../button/button.component';
import { CartService } from '../../core/api/cart.service';
import { LanguageService } from '../../core/services/language.service';
import { SettingsService } from '../../core/api/settings.service';
import { CapitalizeFirstPipe } from '../pipes/capitalize-first.pipe';

@Component({
  selector: 'app-ticket-card',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent, CapitalizeFirstPipe],
  template: `
    <article class="group relative bg-background border border-border overflow-hidden transition-all hover:border-foreground flex flex-col h-full">
      <!-- Ticket Image -->
      <a [routerLink]="ticketLink()">
        <div class="aspect-square overflow-hidden bg-muted">
          @if (ticket().primary_image) {
            <img
              [src]="ticket().primary_image"
              [alt]="ticket().name"
              class="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy">
          } @else {
            <div class="w-full h-full flex items-center justify-center text-muted-foreground">
              <svg class="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
          }
        </div>
      </a>

      <!-- Ticket Info -->
      <div class="p-4 flex flex-col flex-1">
        <a [routerLink]="ticketLink()" class="block group-hover:text-accent transition-colors">
          <h3 class="font-sans font-medium text-base mb-1 line-clamp-2 min-h-[3rem]">{{ ticket().name }}</h3>
        </a>

        <p class="text-sm text-muted-foreground font-mono uppercase tracking-wide mb-2">
          {{ 'ticket.type_label' | transloco }}
        </p>

        <!-- Event meta -->
        @if (ticket().event_date || ticket().event_location) {
          <div class="space-y-1 mb-3 text-sm text-muted-foreground">
            @if (ticket().event_date) {
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <time>{{ ticket().event_date | date: 'mediumDate' : '' : currentLang() | capitalizeFirst }}</time>
              </div>
            }
            @if (ticket().event_location) {
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="truncate">{{ ticket().event_location }}</span>
              </div>
            }
          </div>
        }

        <!-- Price -->
        <div class="flex items-baseline gap-2 mb-3">
          @if (ticket().discount_price) {
            <span class="text-lg font-medium">{{ ticket().discount_price | currency: 'EUR' }}</span>
            <span class="text-sm text-muted-foreground line-through">{{ ticket().price | currency: 'EUR' }}</span>
          } @else {
            <div class="mb-3">
              <div class="text-lg font-medium flex items-baseline gap-2">
                <span>{{ ticket().price | currency: 'EUR' }}</span>
                <span class="text-xs text-muted-foreground font-normal">({{ 'product.price_with_vat' | transloco }})</span>
              </div>
              <div class="text-xs text-muted-foreground mt-1">
                <p>{{ 'product.price_without_vat' | transloco }}: {{ priceWithoutVat() | currency: 'EUR' }}</p>
              </div>
            </div>
          }
        </div>

        <!-- Stock / sold-out -->
        <div class="min-h-[1.5rem] mb-3">
          @if (isSoldOut()) {
            <p class="text-sm text-danger font-mono uppercase">{{ 'ticket.sold_out' | transloco }}</p>
          } @else if (isInCart()) {
            <p class="text-sm text-accent font-mono uppercase flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ 'cart.in_cart' | transloco }} ({{ cartQuantity() }}×)
            </p>
          }
        </div>

        <!-- Add to Cart -->
        <div class="mt-auto flex gap-2">
          @if (!isSoldOut()) {
            <app-button
              [variant]="addedToCart() ? 'secondary' : 'primary'"
              [size]="'sm'"
              [fullWidth]="true"
              [disabled]="addedToCart()"
              (clicked)="addToCart()">
              @if (addedToCart()) {
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ 'cart.added' | transloco }}
              } @else {
                {{ 'ticket.add_to_cart' | transloco }}
              }
            </app-button>
            @if (isInCart()) {
              <button
                (click)="removeFromCart($event)"
                class="px-3 text-sm text-danger hover:bg-danger/10 transition-colors border border-border rounded"
                [attr.aria-label]="'cart.remove' | transloco">
                ×
              </button>
            }
          }
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TicketCardComponent {
  ticket = input.required<Ticket>();
  private languageService = inject(LanguageService);
  private cartService = inject(CartService);
  private settingsService = inject(SettingsService);

  currentLang = this.languageService.currentLang;
  ticketLink = computed(() => `/${this.currentLang()}/tickets/${this.ticket().slug}`);

  addedToCart = signal(false);

  cartQuantity = computed(() => this.cartService.getTicketQuantity(this.ticket().id));
  isInCart = computed(() => this.cartQuantity() > 0);

  isSoldOut = computed(() => {
    const t = this.ticket();
    return t.total_quantity > 0 && t.sold_quantity !== undefined && t.sold_quantity >= t.total_quantity;
  });

  priceWithoutVat = computed(() => {
    const taxRate = this.settingsService.settings()?.tax_rate || 20;
    return parseFloat(this.ticket().price) / (1 + taxRate / 100);
  });

  addToCart() {
    this.cartService.addTicketToCart(this.ticket(), 1);
    this.addedToCart.set(true);
    setTimeout(() => this.addedToCart.set(false), 2000);
  }

  removeFromCart(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.removeTicketFromCart(this.ticket().id);
  }
}
