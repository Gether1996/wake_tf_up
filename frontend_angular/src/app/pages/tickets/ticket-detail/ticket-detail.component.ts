import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CatalogService } from '../../../core/api/catalog.service';
import { CartService } from '../../../core/api/cart.service';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Ticket } from '../../../core/api/api.models';
import { ButtonComponent } from '../../../shared/button/button.component';
import { CapitalizeFirstPipe } from '../../../shared/pipes/capitalize-first.pipe';

@Component({
  selector: 'app-ticket-detail',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent, CapitalizeFirstPipe],
  template: `
    <div class="container mx-auto px-4 py-8">
      @if (loading()) {
        <div class="max-w-3xl mx-auto animate-pulse">
          <div class="h-12 bg-muted rounded w-3/4 mb-8"></div>
          <div class="space-y-4">
            <div class="h-4 bg-muted rounded"></div>
            <div class="h-4 bg-muted rounded"></div>
            <div class="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      } @else if (error()) {
        <div class="max-w-3xl mx-auto text-center py-16">
          <p class="text-danger mb-4">{{ error() }}</p>
          <app-button [routerLink]="ticketsLink()">
            {{ 'ticket.back' | transloco }}
          </app-button>
        </div>
      } @else if (ticket()) {
        <div class="max-w-3xl mx-auto">
          <!-- Back Button -->
          <a
            [routerLink]="ticketsLink()"
            class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            {{ 'ticket.back' | transloco }}
          </a>

          <!-- Title -->
          <div class="flex items-center gap-4 mb-6">
            <h1 class="text-4xl md:text-5xl font-bold flex-1">{{ ticket()!.name }}</h1>
            @if (authService.isSuperuser()) {
              <span
                [class]="'inline-flex items-center px-3 py-1 text-sm font-semibold border whitespace-nowrap ' +
                  (ticket()!.is_published
                    ? 'bg-green-50 dark:bg-green-950 border-green-500 text-green-700 dark:text-green-400'
                    : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-500 text-yellow-700 dark:text-yellow-400')">
                {{ (ticket()!.is_published ? 'ticket.published' : 'ticket.draft') | transloco }}
              </span>
            }
          </div>

          <!-- Image Gallery -->
          @if (ticket()!.images && ticket()!.images!.length > 0) {
            <div class="mb-8">
              <!-- Main image -->
              <div class="w-full aspect-[4/3] bg-muted overflow-hidden mb-2">
                <img
                  [src]="activeImage()"
                  [alt]="ticket()!.name"
                  class="w-full h-full object-cover">
              </div>
              <!-- Thumbnails -->
              @if (ticket()!.images!.length > 1) {
                <div class="flex gap-2 overflow-x-auto">
                  @for (img of ticket()!.images!; track img.id) {
                    <button
                      (click)="activeImageIndex.set($index)"
                      [class]="'flex-shrink-0 w-20 h-20 overflow-hidden border-2 transition-all ' +
                        (activeImageIndex() === $index ? 'border-foreground' : 'border-border hover:border-foreground/50')">
                      <img [src]="img.image" [alt]="ticket()!.name" class="w-full h-full object-cover">
                    </button>
                  }
                </div>
              }
            </div>
          }

          <!-- Event Details Card -->
          @if (ticket()!.event_date || ticket()!.event_location) {
            <div class="border border-accent bg-accent/5 p-6 mb-8">
              <div class="grid md:grid-cols-2 gap-4">
                @if (ticket()!.event_date) {
                  <div class="flex items-start gap-3">
                    <svg class="w-6 h-6 text-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p class="text-sm text-muted-foreground mb-1">{{ 'ticket.event_date' | transloco }}</p>
                      <time class="font-semibold">{{ ticket()!.event_date | date: 'fullDate' : '' : currentLang() | capitalizeFirst }}</time>
                    </div>
                  </div>
                }
                @if (ticket()!.event_location) {
                  <div class="flex items-start gap-3">
                    <svg class="w-6 h-6 text-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p class="text-sm text-muted-foreground mb-1">{{ 'ticket.event_location' | transloco }}</p>
                      <p class="font-semibold">{{ ticket()!.event_location }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Price + Buy Section -->
          <div class="border border-border p-6 mb-8">
            <div class="flex items-center justify-between gap-6">
              <div>
                @if (ticket()!.discount_price) {
                  <p class="text-3xl font-bold">{{ ticket()!.discount_price | currency: 'EUR' }}</p>
                  <p class="text-lg text-muted-foreground line-through">{{ ticket()!.price | currency: 'EUR' }}</p>
                } @else {
                  <p class="text-3xl font-bold">{{ ticket()!.price | currency: 'EUR' }}</p>
                }
                @if (ticket()!.total_quantity > 0 && ticket()!.sold_quantity !== undefined) {
                  <p class="text-sm text-muted-foreground mt-1">
                    {{ ticket()!.total_quantity - ticket()!.sold_quantity! }} {{ 'ticket.available' | transloco }}
                  </p>
                }
              </div>

              @if (ticket()!.total_quantity > 0 && ticket()!.sold_quantity !== undefined && ticket()!.sold_quantity! >= ticket()!.total_quantity) {
                <span class="text-lg font-medium text-muted-foreground border border-border px-6 py-3">
                  {{ 'ticket.sold_out' | transloco }}
                </span>
              } @else {
                <div class="flex items-center gap-3">
                  <!-- Quantity -->
                  <div class="flex items-center border border-border">
                    <button
                      (click)="decreaseQty()"
                      [disabled]="quantity() <= 1"
                      class="px-3 py-2 hover:bg-muted transition-colors disabled:opacity-50">-</button>
                    <span class="px-4 py-2 font-mono min-w-[3rem] text-center">{{ quantity() }}</span>
                    <button
                      (click)="increaseQty()"
                      class="px-3 py-2 hover:bg-muted transition-colors">+</button>
                  </div>

                  <app-button
                    [variant]="'primary'"
                    (click)="addToCart()">
                    {{ 'ticket.add_to_cart' | transloco }}
                  </app-button>
                </div>
              }
            </div>
          </div>

          <!-- Description -->
          @if (ticket()!.description) {
            <div class="prose prose-lg max-w-none
                       prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
                       prose-headings:font-bold prose-headings:tracking-tight
                       prose-strong:text-foreground">
              <p>{{ ticket()!.description }}</p>
            </div>
          }
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
export class TicketDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private catalogService = inject(CatalogService);
  private cartService = inject(CartService);
  private notificationService = inject(NotificationService);
  private translocoService = inject(TranslocoService);
  private languageService = inject(LanguageService);
  authService = inject(AuthService);
  currentLang = this.languageService.currentLang;

  ticket = signal<Ticket | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  quantity = signal(1);
  activeImageIndex = signal(0);

  activeImage = computed(() => {
    const t = this.ticket();
    if (!t?.images?.length) return null;
    return t.images[this.activeImageIndex()] ? t.images[this.activeImageIndex()].image : t.images[0].image;
  });

  ticketsLink = computed(() => `/${this.languageService.currentLang()}/tickets`);

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loadTicket(slug);
    }
  }

  loadTicket(slug: string) {
    this.loading.set(true);
    this.catalogService.getTicket(slug).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.activeImageIndex.set(0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('ticket.not_found');
        this.loading.set(false);
      }
    });
  }

  decreaseQty() {
    if (this.quantity() > 1) this.quantity.update(q => q - 1);
  }

  increaseQty() {
    this.quantity.update(q => q + 1);
  }

  addToCart() {
    const t = this.ticket();
    if (!t) return;
    this.cartService.addTicketToCart(t, this.quantity());
    this.notificationService.success(this.translocoService.translate('ticket.added_to_cart'));
  }
}
