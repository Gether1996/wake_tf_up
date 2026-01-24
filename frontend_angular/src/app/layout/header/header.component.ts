import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/api/cart.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule, TranslocoModule],
  template: `
    <header class="sticky top-0 z-50 bg-background border-b border-border">
      <div class="container mx-auto px-4">
        <!-- Top Bar -->
        <div class="flex items-center justify-between py-4">
          <!-- Logo -->
          <a [routerLink]="homeLink()" class="text-xl font-mono font-bold tracking-tighter hover:text-accent transition-colors">
            WAKE_TF_UP
          </a>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex items-center gap-6">
            <a [routerLink]="shopLink()" routerLinkActive="text-accent" class="font-mono text-sm uppercase tracking-wide hover:text-accent transition-colors">
              {{ 'nav.shop' | transloco }}
            </a>
            <a [routerLink]="blogLink()" routerLinkActive="text-accent" class="font-mono text-sm uppercase tracking-wide hover:text-accent transition-colors">
              {{ 'nav.blog' | transloco }}
            </a>
            <a [routerLink]="aboutLink()" routerLinkActive="text-accent" class="font-mono text-sm uppercase tracking-wide hover:text-accent transition-colors">
              {{ 'nav.about' | transloco }}
            </a>
          </nav>

          <!-- Actions -->
          <div class="flex items-center gap-4">
            <!-- Language Toggle -->
            <button 
              (click)="toggleLanguage()" 
              class="text-sm font-mono hover:text-accent transition-colors"
              [attr.aria-label]="'nav.change_language' | transloco">
              {{ currentLang() === 'en' ? 'SK' : 'EN' }}
            </button>

            <!-- Theme Toggle -->
            <button 
              (click)="toggleTheme()" 
              class="hover:text-accent transition-colors"
              [attr.aria-label]="'nav.toggle_theme' | transloco">
              @if (isDark()) {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
              }
            </button>

            <!-- Demo Logout (Temporary) -->
            @if (hasDemoAccess()) {
              <button 
                (click)="demoLogout()" 
                class="hover:text-danger transition-colors"
                title="Exit Demo Access">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
              </button>
            }

            <!-- Cart -->
            <a [routerLink]="cartLink()" class="relative hover:text-accent transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
              </svg>
              @if (cartItemCount() > 0) {
                <span class="absolute -top-2 -right-2 bg-accent text-background text-xs font-mono w-5 h-5 flex items-center justify-center rounded-full">
                  {{ cartItemCount() }}
                </span>
              }
            </a>

            <!-- User Menu -->
            @if (isAuthenticated()) {
              <div class="relative">
                <button (click)="toggleUserMenu()" class="hover:text-accent transition-colors">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </button>
                
                @if (userMenuOpen) {
                  <div class="absolute right-0 mt-2 w-48 bg-background border border-border shadow-lg">
                    <a [routerLink]="profileLink()" (click)="closeUserMenu()" class="block px-4 py-2 hover:bg-muted font-mono text-sm">
                      {{ 'nav.profile' | transloco }}
                    </a>
                    <a [routerLink]="ordersLink()" (click)="closeUserMenu()" class="block px-4 py-2 hover:bg-muted font-mono text-sm">
                      {{ 'nav.orders' | transloco }}
                    </a>
                    <button (click)="logout()" class="w-full text-left px-4 py-2 hover:bg-muted font-mono text-sm text-danger">
                      {{ 'auth._logout' | transloco }}
                    </button>
                  </div>
                }
              </div>
            } @else {
              <a [routerLink]="loginLink()" class="font-mono text-sm hover:text-accent transition-colors">
                {{ 'auth._login' | transloco }}
              </a>
            }

            <!-- Mobile Menu Toggle -->
            <button (click)="toggleMobileMenu()" class="md:hidden hover:text-accent transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile Navigation -->
        @if (mobileMenuOpen) {
          <nav class="md:hidden border-t border-border py-4 space-y-2">
            <a [routerLink]="shopLink()" (click)="closeMobileMenu()" class="block font-mono text-sm uppercase tracking-wide hover:text-accent transition-colors py-2">
              {{ 'nav.shop' | transloco }}
            </a>
            <a [routerLink]="blogLink()" (click)="closeMobileMenu()" class="block font-mono text-sm uppercase tracking-wide hover:text-accent transition-colors py-2">
              {{ 'nav.blog' | transloco }}
            </a>
            <a [routerLink]="aboutLink()" (click)="closeMobileMenu()" class="block font-mono text-sm uppercase tracking-wide hover:text-accent transition-colors py-2">
              {{ 'nav.about' | transloco }}
            </a>
          </nav>
        }
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private themeService = inject(ThemeService);
  private languageService = inject(LanguageService);
  private router = inject(Router);

  isAuthenticated = this.authService.isAuthenticated;
  cartItemCount = this.cartService.itemCount;
  isDark = this.themeService.isDark;
  currentLang = this.languageService.currentLang;
  
  // Demo access check
  hasDemoAccess = signal(false);

  constructor() {
    // Check demo access on init
    this.checkDemoAccess();
  }

  checkDemoAccess() {
    const demoAccess = localStorage.getItem('demo_access');
    this.hasDemoAccess.set(demoAccess === 'true');
  }

  // Computed localized paths
  lang = computed(() => `/${this.currentLang()}`);
  homeLink = computed(() => `/${this.currentLang()}`);
  shopLink = computed(() => `/${this.currentLang()}/shop`);
  blogLink = computed(() => `/${this.currentLang()}/blog`);
  aboutLink = computed(() => `/${this.currentLang()}/about`);
  cartLink = computed(() => `/${this.currentLang()}/cart`);
  profileLink = computed(() => `/${this.currentLang()}/profile`);
  ordersLink = computed(() => `/${this.currentLang()}/orders`);
  loginLink = computed(() => `/${this.currentLang()}/auth/login`);
  registerLink = computed(() => `/${this.currentLang()}/auth/register`);

  mobileMenuOpen = false;
  userMenuOpen = false;

  toggleLanguage() {
    this.languageService.toggleLanguage();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu() {
    this.userMenuOpen = false;
  }

  logout() {
    this.authService.logout();
    this.closeUserMenu();
  }

  demoLogout() {
    // Clear demo access
    localStorage.removeItem('demo_access');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Redirect to demo login
    this.router.navigate(['/demo-login']);
  }
}
