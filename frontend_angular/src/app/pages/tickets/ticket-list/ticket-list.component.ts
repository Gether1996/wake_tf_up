import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CatalogService } from '../../../core/api/catalog.service';
import { CartService } from '../../../core/api/cart.service';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Ticket } from '../../../core/api/api.models';
import { CapitalizeFirstPipe } from '../../../shared/pipes/capitalize-first.pipe';

@Component({
  selector: 'app-ticket-list',
  imports: [CommonModule, RouterModule, TranslocoModule, CapitalizeFirstPipe],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-12">
          <h1 class="text-4xl md:text-5xl font-bold mb-4">{{ 'ticket.title' | transloco }}</h1>
          <p class="text-xl text-muted-foreground">{{ 'ticket.subtitle' | transloco }}</p>
        </div>

        @if (loading()) {
          <div class="space-y-6">
            @for (i of [1,2,3]; track i) {
              <div class="animate-pulse border border-border p-6">
                <div class="h-6 bg-muted rounded w-3/4 mb-4"></div>
                <div class="h-4 bg-muted rounded mb-2"></div>
                <div class="h-4 bg-muted rounded w-5/6"></div>
              </div>
            }
          </div>
        } @else if (tickets().length === 0) {
          <div class="text-center py-16 border border-border">
            <svg class="w-24 h-24 mx-auto mb-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h2 class="text-2xl font-bold mb-4">{{ 'ticket.no_tickets' | transloco }}</h2>
            <p class="text-muted-foreground">{{ 'ticket.no_tickets_description' | transloco }}</p>
          </div>
        } @else {
          <div class="space-y-6">
            @for (ticket of tickets(); track ticket.id) {
              <article class="border border-border hover:border-foreground transition-all group">
                <div class="flex gap-4 p-4 md:p-6">
                  <!-- Image -->
                  <a [routerLink]="[ticket.slug]" class="flex-shrink-0">
                    <div class="w-24 h-32 md:w-32 md:h-40 bg-muted overflow-hidden">
                      @if (ticket.primary_image) {
                        <img [src]="ticket.primary_image" [alt]="ticket.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                      } @else {
                        <div class="w-full h-full flex items-center justify-center text-muted-foreground">
                          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </div>
                      }
                    </div>
                  </a>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-4 mb-3">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-3 mb-1">
                          <a [routerLink]="[ticket.slug]" class="flex-1">
                            <h2 class="text-xl md:text-2xl font-bold group-hover:text-accent transition-colors truncate">
                              {{ ticket.name }}
                            </h2>
                          </a>
                          @if (authService.isSuperuser()) {
                            <span
                              [class]="'inline-flex items-center px-3 py-1 text-xs font-semibold border whitespace-nowrap ' +
                                (ticket.is_published
                                  ? 'bg-green-50 dark:bg-green-950 border-green-500 text-green-700 dark:text-green-400'
                                  : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-500 text-yellow-700 dark:text-yellow-400')">
                              {{ (ticket.is_published ? 'ticket.published' : 'ticket.draft') | transloco }}
                            </span>
                          }
                        </div>
                      </div>

                      <!-- Price -->
                      <div class="text-right flex-shrink-0">
                        @if (ticket.discount_price) {
                          <p class="text-xl font-bold">{{ ticket.discount_price | currency: 'EUR' }}</p>
                          <p class="text-sm text-muted-foreground line-through">{{ ticket.price | currency: 'EUR' }}</p>
                        } @else {
                          <p class="text-xl font-bold">{{ ticket.price | currency: 'EUR' }}</p>
                        }
                      </div>
                    </div>

                <!-- Meta -->
                <div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  @if (ticket.event_date) {
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <time>{{ ticket.event_date | date: 'mediumDate' : '' : currentLang() | capitalizeFirst }}</time>
                    </div>
                    <span>•</span>
                  }
                  @if (ticket.event_location) {
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{{ ticket.event_location }}</span>
                    </div>
                  }
                  @if (ticket.total_quantity > 0 && ticket.sold_quantity !== undefined) {
                    <span>•</span>
                    <span>{{ ticket.total_quantity - ticket.sold_quantity }} {{ 'ticket.available' | transloco }}</span>
                  }
                </div>

                @if (ticket.description) {
                  <p class="text-muted-foreground mb-4 leading-relaxed line-clamp-2">
                    {{ ticket.description }}
                  </p>
                }

                <div class="flex items-center justify-between gap-4">
                  <a
                    [routerLink]="[ticket.slug]"
                    class="inline-flex items-center gap-2 text-foreground hover:text-accent transition-colors font-medium">
                    {{ 'ticket.details' | transloco }}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>

                  @if (ticket.total_quantity > 0 && ticket.sold_quantity !== undefined && ticket.sold_quantity >= ticket.total_quantity) {
                    <span class="text-sm font-medium text-muted-foreground border border-border px-4 py-2">
                      {{ 'ticket.sold_out' | transloco }}
                    </span>
                  } @else {
                    <button
                      (click)="addToCart(ticket)"
                      class="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {{ 'ticket.add_to_cart' | transloco }}
                    </button>
                  }
                </div>
                  </div> <!-- end content -->
                </div> <!-- end flex row -->
              </article>
            }
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
export class TicketListComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private cartService = inject(CartService);
  private notificationService = inject(NotificationService);
  private translocoService = inject(TranslocoService);
  authService = inject(AuthService);
  private languageService = inject(LanguageService);
  currentLang = this.languageService.currentLang;

  tickets = signal<Ticket[]>([]);
  loading = signal(false);

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.loading.set(true);
    this.catalogService.getTickets().subscribe({
      next: (tickets) => {
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('Failed to load tickets. Please try again.');
        this.loading.set(false);
      }
    });
  }

  addToCart(ticket: Ticket) {
    this.cartService.addTicketToCart(ticket, 1);
    this.notificationService.success(this.translocoService.translate('ticket.added_to_cart'));
  }
}
