import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { NewsletterService } from '../../core/api/newsletter.service';
import { LanguageService } from '../../core/services/language.service';
import { SettingsService } from '../../core/api/settings.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent, FormsModule],
  template: `
    <footer class="bg-muted border-t border-border mt-16">
      <div class="container mx-auto px-4 py-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <!-- Brand -->
          <div>
            <h2 class="text-xl font-bold tracking-tighter mb-4" style="font-family: 'Shlop', sans-serif;">WAKE_TF_UP</h2>
            <p class="text-sm text-muted-foreground mb-4">
              {{ 'footer.tagline' | transloco }}
            </p>
            <p class="text-xs text-muted-foreground font-mono">
              {{ 'footer.mission' | transloco }}
            </p>
          </div>

          <!-- Shop -->
          <div>
            <h3 class="text-sm uppercase tracking-wide mb-4" style="font-family: 'Shlop', sans-serif;">{{ 'footer.shop' | transloco }}</h3>
            <ul class="space-y-2">
              <li>
                <a [routerLink]="shopLink()" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.all_products' | transloco }}
                </a>
              </li>
              <li>
                <a [routerLink]="shopLink()" [queryParams]="{is_limited_drop: 'true'}" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.limited_drops' | transloco }}
                </a>
              </li>
              <li>
                <a [routerLink]="shopLink()" [queryParams]="{is_recycled: 'true'}" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.recycled' | transloco }}
                </a>
              </li>
              <li>
                <a [routerLink]="shopLink()" [queryParams]="{pre_order: 'true'}" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.preorders' | transloco }}
                </a>
              </li>
            </ul>
          </div>

          <!-- About -->
          <div>
            <h3 class="text-sm uppercase tracking-wide mb-4" style="font-family: 'Shlop', sans-serif;">{{ 'footer.about' | transloco }}</h3>
            <ul class="space-y-2">
              <li>
                <a [routerLink]="aboutLink()" (click)="scrollToTop()" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.about' | transloco }}
                </a>
              </li>
              <li>
                <a [routerLink]="blogLink()" (click)="scrollToTop()" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.blog' | transloco }}
                </a>
              </li>
              <li>
                <a [routerLink]="eventsLink()" (click)="scrollToTop()" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.events' | transloco }}
                </a>
              </li>
              <li>
                <a [routerLink]="contactLink()" (click)="scrollToTop()" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.contact' | transloco }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Newsletter -->
          <div>
            <h3 class="text-sm uppercase tracking-wide mb-4" style="font-family: 'Shlop', sans-serif;">{{ 'footer.newsletter' | transloco }}</h3>
            <p class="text-sm text-muted-foreground mb-4">
              {{ 'newsletter.description' | transloco }}
            </p>
            
            @if (subscribed()) {
              <div class="p-3 bg-success/10 border border-success text-success text-sm font-mono">
                {{ 'newsletter.success' | transloco }}
              </div>
            } @else {
              <form (ngSubmit)="subscribe()" class="space-y-2">
                <input 
                  type="email" 
                  [(ngModel)]="email"
                  name="email"
                  [placeholder]="'newsletter.email_placeholder' | transloco"
                  required
                  class="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground font-mono text-sm">
                
                @if (error()) {
                  <p class="text-xs text-danger font-mono">{{ error() }}</p>
                }
                
                <app-button 
                  type="submit"
                  [variant]="'primary'"
                  [size]="'sm'"
                  [fullWidth]="true"
                  [loading]="loading()"
                  [disabled]="!email">
                  {{ 'newsletter.subscribe' | transloco }}
                </app-button>
              </form>
            }
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="border-t border-border mt-8 pt-8">
          <!-- Company Info (Required by Slovak Law) -->
          <div class="mb-6 text-sm text-muted-foreground font-mono space-y-1">
            <p class="font-semibold text-foreground">{{ ownerName() }}</p>
            <p>{{ 'footer.company_address' | transloco: { address: address(), country: country() } }}</p>
            <p>{{ 'footer.company_id' | transloco: { id: companyId() } }} | {{ 'footer.company_tax_id' | transloco: { taxId: taxId() } }}</p>
            <p>{{ 'footer.company_email' | transloco: { email: contactEmail() } }}</p>
          </div>

          <!-- Payment Methods -->
          <div class="flex flex-wrap gap-6 mb-8 pb-8 border-b border-border">
            <img src="/1.png" alt="Payment method 1" class="h-6 max-w-12 object-contain">
            <img src="/2.png" alt="Payment method 2" class="h-6 max-w-12 object-contain">
            <img src="/3.png" alt="Payment method 3" class="h-6 max-w-12 object-contain">
            <img src="/4.png" alt="Payment method 4" class="h-6 max-w-12 object-contain">
            <img src="/5.png" alt="Payment method 5" class="h-6 max-w-12 object-contain">
            <img src="/6.png" alt="Payment method 6" class="h-6 max-w-12 object-contain">
            <img src="/7.png" alt="Payment method 7" class="h-6 max-w-12 object-contain">
            <img src="/8.png" alt="Payment method 8" class="h-6 max-w-12 object-contain">
            <img src="/9.png" alt="Payment method 9" class="h-6 max-w-12 object-contain">
          </div>

          <!-- Copyright and Links -->
          <div class="flex flex-col md:flex-row justify-between items-center gap-4">
            <p class="text-sm text-muted-foreground font-mono">
              © 2026 WAKE_TF_UP. {{ 'footer.rights' | transloco }}
            </p>
            
            <div class="flex gap-6">
              <a [routerLink]="privacyLink()" (click)="scrollToTop()" class="text-sm text-muted-foreground hover:text-accent transition-colors font-mono">
                {{ 'footer.privacy' | transloco }}
              </a>
              <a [routerLink]="termsLink()" (click)="scrollToTop()" class="text-sm text-muted-foreground hover:text-accent transition-colors font-mono">
                {{ 'footer.terms' | transloco }}
              </a>
              <a [routerLink]="cookiesLink()" (click)="scrollToTop()" class="text-sm text-muted-foreground hover:text-accent transition-colors font-mono">
                {{ 'footer.cookies' | transloco }}
              </a>
            </div>

            <!-- Social Links -->
            <div class="flex gap-4">
              @if (instagramUrl()) {
                <a [href]="instagramUrl()" target="_blank" rel="noopener" class="hover:text-accent transition-colors" [attr.aria-label]="'Instagram'">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              }
              @if (facebookUrl()) {
                <a [href]="facebookUrl()" target="_blank" rel="noopener" class="hover:text-accent transition-colors" [attr.aria-label]="'Facebook'">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              }
              @if (twitterUrl()) {
                <a [href]="twitterUrl()" target="_blank" rel="noopener" class="hover:text-accent transition-colors" [attr.aria-label]="'Twitter'">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              }
              @if (tiktokUrl()) {
                <a [href]="tiktokUrl()" target="_blank" rel="noopener" class="hover:text-accent transition-colors" [attr.aria-label]="'TikTok'">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </a>
              }
            </div>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class FooterComponent {
  private newsletterService = inject(NewsletterService);
  private languageService = inject(LanguageService);
  private settingsService = inject(SettingsService);

  contactEmail = this.settingsService.contactEmail;
  phone = this.settingsService.phone;
  address = this.settingsService.address;
  country = this.settingsService.country;
  ownerName = this.settingsService.ownerName;
  companyId = this.settingsService.companyId;
  taxId = this.settingsService.taxId;

  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);
  aboutLink = computed(() => `/${this.currentLang()}/about`);
  blogLink = computed(() => `/${this.currentLang()}/blog`);
  eventsLink = computed(() => `/${this.currentLang()}/events`);
  contactLink = computed(() => `/${this.currentLang()}/contact`);
  privacyLink = computed(() => `/${this.currentLang()}/privacy`);
  termsLink = computed(() => `/${this.currentLang()}/terms`);
  cookiesLink = computed(() => `/${this.currentLang()}/cookies`);

  // Social media links from settings
  instagramUrl = computed(() => this.settingsService.settings()?.instagram_url || '');
  twitterUrl = computed(() => this.settingsService.settings()?.twitter_url || '');
  facebookUrl = computed(() => this.settingsService.settings()?.facebook_url || '');
  tiktokUrl = computed(() => this.settingsService.settings()?.tiktok_url || '');

  email = '';
  loading = signal(false);
  error = signal('');
  subscribed = signal(false);

  async subscribe() {
    if (!this.email) return;

    this.loading.set(true);
    this.error.set('');

    this.newsletterService.subscribe(this.email).subscribe({
      next: () => {
        this.subscribed.set(true);
        this.email = '';
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Subscription failed');
        this.loading.set(false);
      }
    });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
