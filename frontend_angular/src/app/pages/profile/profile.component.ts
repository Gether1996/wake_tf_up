import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/auth/auth.service';
import { OrderService } from '../../core/api/order.service';
import { LanguageService } from '../../core/services/language.service';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      @if (authService.user()) {
        <div class="max-w-4xl mx-auto">
          <!-- Header -->
          <div class="flex items-center justify-between mb-8">
            <h1 class="text-3xl md:text-4xl font-bold">{{ 'profile.title' | transloco }}</h1>
            <app-button [variant]="'ghost'" (clicked)="logout()">
              {{ 'nav.logout' | transloco }}
            </app-button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Sidebar -->
            <div class="md:col-span-1">
              <nav class="border border-border">
                <a 
                  [routerLink]="profileLink()"
                  routerLinkActive="bg-muted"
                  [routerLinkActiveOptions]="{ exact: true }"
                  class="block px-6 py-4 border-b border-border hover:bg-muted transition-colors">
                  {{ 'profile.account' | transloco }}
                </a>
                <a 
                  [routerLink]="ordersLink()"
                  routerLinkActive="bg-muted"
                  class="block px-6 py-4 hover:bg-muted transition-colors">
                  {{ 'profile.orders' | transloco }}
                </a>
              </nav>
            </div>

            <!-- Content -->
            <div class="md:col-span-2">
              <div class="border border-border p-6">
                <h2 class="text-2xl font-bold mb-6">{{ 'profile.account_info' | transloco }}</h2>

                <!-- User Info -->
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-mono uppercase text-muted-foreground mb-1">
                      {{ 'profile.name' | transloco }}
                    </label>
                    <p class="text-lg">{{ (authService.user()?.first_name || '') + ' ' + (authService.user()?.last_name || '') || 'N/A' }}</p>
                  </div>

                  <div>
                    <label class="block text-sm font-mono uppercase text-muted-foreground mb-1">
                      {{ 'profile.email' | transloco }}
                    </label>
                    <p class="text-lg">{{ authService.user()?.email }}</p>
                  </div>

                  <div class="pt-6 border-t border-border">
                    <h3 class="text-lg font-bold mb-4">{{ 'profile.preferences' | transloco }}</h3>
                    
                    <div class="space-y-4">
                      <!-- Theme (handled by ThemeService in header) -->
                      <div>
                        <label class="block text-sm font-mono uppercase text-muted-foreground mb-2">
                          {{ 'profile.theme' | transloco }}
                        </label>
                        <p class="text-muted-foreground text-sm">{{ 'profile.theme_hint' | transloco }}</p>
                      </div>

                      <!-- Language (handled by Transloco in header) -->
                      <div>
                        <label class="block text-sm font-mono uppercase text-muted-foreground mb-2">
                          {{ 'profile.language' | transloco }}
                        </label>
                        <p class="text-muted-foreground text-sm">{{ 'profile.language_hint' | transloco }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Recent Orders -->
              @if (recentOrders().length > 0) {
                <div class="border border-border p-6 mt-6">
                  <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold">{{ 'profile.recent_orders' | transloco }}</h2>
                    <a [routerLink]="ordersLink()" class="text-sm hover:text-accent">
                      {{ 'profile.view_all' | transloco }} →
                    </a>
                  </div>

                  <div class="space-y-4">
                    @for (order of recentOrders(); track order.id) {
                      <a 
                        [routerLink]="orderLink(order.id)"
                        class="block border border-border p-4 hover:border-foreground transition-all">
                        <div class="flex items-center justify-between mb-2">
                          <span class="font-mono text-sm">{{ 'profile.order_number' | transloco: { id: order.id } }}</span>
                          <span class="text-sm text-muted-foreground">{{ order.created_at | date: 'short' }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                          <span class="text-sm">{{ order.items?.length || 0 }} {{ 'profile.items' | transloco }}</span>
                          <span class="font-bold">{{ order.total | currency: 'EUR' }}</span>
                        </div>
                      </a>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      } @else {
        <div class="text-center py-16">
          <p class="text-muted-foreground mb-4">{{ 'profile.not_logged_in' | transloco }}</p>
          <app-button [routerLink]="loginLink()">
            {{ 'nav.login' | transloco }}
          </app-button>
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
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  profileLink = computed(() => `/${this.currentLang()}/profile`);
  ordersLink = computed(() => `/${this.currentLang()}/orders`);
  orderLink = (orderId: number) => `/${this.currentLang()}/orders/${orderId}`;
  loginLink = computed(() => `/${this.currentLang()}/auth/login`);

  recentOrders = signal<any[]>([]);

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.loadRecentOrders();
    }
  }

  loadRecentOrders() {
    this.orderService.getOrders({ page: 1, page_size: 3 }).subscribe({
      next: (response) => {
        this.recentOrders.set(response.results);
      },
      error: (err) => {
        console.error('Failed to load orders:', err);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
