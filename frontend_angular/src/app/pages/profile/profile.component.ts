import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/auth/auth.service';
import { OrderService } from '../../core/api/order.service';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslocoModule, ButtonComponent],
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

                  <div>
                    <label class="block text-sm font-mono uppercase text-muted-foreground mb-1">
                      {{ 'profile.phone' | transloco }}
                    </label>
                    <p class="text-lg">{{ authService.user()?.phone || 'N/A' }}</p>
                  </div>

                  <!-- Address Information -->
                  <div class="pt-6 border-t border-border">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-lg font-bold">{{ 'profile.shipping_address' | transloco }}</h3>
                      <app-button 
                        [variant]="'ghost'" 
                        [size]="'sm'"
                        (clicked)="toggleEditMode()">
                        {{ editMode() ? ('profile.cancel' | transloco) : ('profile.edit' | transloco) }}
                      </app-button>
                    </div>

                    @if (!editMode()) {
                      <div class="space-y-3">
                        @if (authService.user()?.street || authService.user()?.city) {
                          <div>
                            <label class="block text-sm font-mono uppercase text-muted-foreground mb-1">
                              {{ 'checkout.address' | transloco }}
                            </label>
                            <p>{{ authService.user()?.street || 'N/A' }}</p>
                          </div>
                          <div class="grid grid-cols-2 gap-4">
                            <div>
                              <label class="block text-sm font-mono uppercase text-muted-foreground mb-1">
                                {{ 'checkout.city' | transloco }}
                              </label>
                              <p>{{ authService.user()?.city || 'N/A' }}</p>
                            </div>
                            <div>
                              <label class="block text-sm font-mono uppercase text-muted-foreground mb-1">
                                {{ 'checkout.postalCode' | transloco }}
                              </label>
                              <p>{{ authService.user()?.postal_code || 'N/A' }}</p>
                            </div>
                          </div>
                          <div>
                            <label class="block text-sm font-mono uppercase text-muted-foreground mb-1">
                              {{ 'checkout.country' | transloco }}
                            </label>
                            <p>{{ authService.user()?.country || 'N/A' }}</p>
                          </div>
                        } @else {
                          <p class="text-muted-foreground text-sm">{{ 'profile.no_address' | transloco }}</p>
                        }
                      </div>
                    } @else {
                      <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="space-y-4">
                        <div>
                          <label class="block text-sm font-mono uppercase mb-2">
                            {{ 'profile.first_name' | transloco }}
                          </label>
                          <input
                            type="text"
                            formControlName="first_name"
                            class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none">
                        </div>
                        <div>
                          <label class="block text-sm font-mono uppercase mb-2">
                            {{ 'profile.last_name' | transloco }}
                          </label>
                          <input
                            type="text"
                            formControlName="last_name"
                            class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none">
                        </div>
                        <div>
                          <label class="block text-sm font-mono uppercase mb-2">
                            {{ 'profile.phone' | transloco }}
                          </label>
                          <input
                            type="text"
                            formControlName="phone"
                            class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none">
                        </div>
                        <div>
                          <label class="block text-sm font-mono uppercase mb-2">
                            {{ 'checkout.address' | transloco }}
                          </label>
                          <input
                            type="text"
                            formControlName="street"
                            class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                          <div>
                            <label class="block text-sm font-mono uppercase mb-2">
                              {{ 'checkout.city' | transloco }}
                            </label>
                            <input
                              type="text"
                              formControlName="city"
                              class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none">
                          </div>
                          <div>
                            <label class="block text-sm font-mono uppercase mb-2">
                              {{ 'checkout.postalCode' | transloco }}
                            </label>
                            <input
                              type="text"
                              formControlName="postal_code"
                              class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none">
                          </div>
                        </div>
                        <div>
                          <label class="block text-sm font-mono uppercase mb-2">
                            {{ 'checkout.country' | transloco }}
                          </label>
                          <select
                            formControlName="country"
                            class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none">
                            <option value="SK">Slovakia</option>
                            <option value="CZ">Czech Republic</option>
                            <option value="AT">Austria</option>
                            <option value="PL">Poland</option>
                            <option value="HU">Hungary</option>
                          </select>
                        </div>
                        <div class="flex gap-3 pt-2">
                          <app-button 
                            type="submit"
                            [disabled]="saving() || profileForm.invalid">
                            {{ saving() ? ('common.saving' | transloco) : ('common.save' | transloco) }}
                          </app-button>
                          <app-button 
                            type="button"
                            [variant]="'ghost'"
                            (clicked)="toggleEditMode()">
                            {{ 'profile.cancel' | transloco }}
                          </app-button>
                        </div>
                      </form>
                    }
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
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  
  currentLang = this.languageService.currentLang;
  profileLink = computed(() => `/${this.currentLang()}/profile`);
  ordersLink = computed(() => `/${this.currentLang()}/orders`);
  orderLink = (orderId: number) => `/${this.currentLang()}/orders/${orderId}`;
  loginLink = computed(() => `/${this.currentLang()}/auth/login`);

  recentOrders = signal<any[]>([]);
  editMode = signal(false);
  saving = signal(false);
  
  profileForm: FormGroup = this.fb.group({
    first_name: [''],
    last_name: [''],
    phone: [''],
    street: [''],
    city: [''],
    postal_code: [''],
    country: ['SK']
  });

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.loadRecentOrders();
      this.loadUserData();
    }
  }

  loadUserData() {
    const user = this.authService.user();
    if (user) {
      this.profileForm.patchValue({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        street: user.street || '',
        city: user.city || '',
        postal_code: user.postal_code || '',
        country: user.country || 'SK'
      });
    }
  }

  toggleEditMode() {
    this.editMode.set(!this.editMode());
    if (!this.editMode()) {
      // Reset form when canceling
      this.loadUserData();
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      return;
    }

    this.saving.set(true);
    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.notificationService.success(
          this.currentLang() === 'sk' 
            ? 'Profil bol úspešne aktualizovaný' 
            : 'Profile updated successfully'
        );
        this.editMode.set(false);
        this.saving.set(false);
      },
      error: (err) => {
        this.notificationService.error(
          this.currentLang() === 'sk' 
            ? 'Nepodarilo sa aktualizovať profil' 
            : 'Failed to update profile'
        );
        this.saving.set(false);
      }
    });
  }

  loadRecentOrders() {
    this.orderService.getOrders({ page: 1, page_size: 3 }).subscribe({
      next: (response) => {
        this.recentOrders.set(response.results);
      },
      error: (err) => {
        this.notificationService.error('Failed to load recent orders.');
      }
    });
  }

  logout() {
    this.authService.logout();
    // AuthService.logout() already handles navigation with language prefix
  }
}
