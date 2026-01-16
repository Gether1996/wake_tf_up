import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { NewsletterService } from '../../core/api/newsletter.service';
import { LanguageService } from '../../core/services/language.service';
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
            <h2 class="text-xl font-mono font-bold tracking-tighter mb-4">WAKE_TF_UP</h2>
            <p class="text-sm text-muted-foreground mb-4">
              {{ 'footer.tagline' | transloco }}
            </p>
            <p class="text-xs text-muted-foreground font-mono">
              {{ 'footer.mission' | transloco }}
            </p>
          </div>

          <!-- Shop -->
          <div>
            <h3 class="font-mono text-sm uppercase tracking-wide mb-4">{{ 'footer.shop' | transloco }}</h3>
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
                <a [routerLink]="shopLink()" [queryParams]="{is_preorder: 'true'}" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.preorders' | transloco }}
                </a>
              </li>
            </ul>
          </div>

          <!-- About -->
          <div>
            <h3 class="font-mono text-sm uppercase tracking-wide mb-4">{{ 'footer.about' | transloco }}</h3>
            <ul class="space-y-2">
              <li>
                <a [routerLink]="aboutLink()" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.about' | transloco }}
                </a>
              </li>
              <li>
                <a [routerLink]="blogLink()" class="text-sm hover:text-accent transition-colors">
                  {{ 'nav.blog' | transloco }}
                </a>
              </li>
              <li>
                <a href="/sustainability" class="text-sm hover:text-accent transition-colors">
                  {{ 'footer.sustainability' | transloco }}
                </a>
              </li>
              <li>
                <a href="/contact" class="text-sm hover:text-accent transition-colors">
                  {{ 'footer.contact' | transloco }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Newsletter -->
          <div>
            <h3 class="font-mono text-sm uppercase tracking-wide mb-4">{{ 'footer.newsletter' | transloco }}</h3>
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
        <div class="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-sm text-muted-foreground font-mono">
            © 2026 WAKE_TF_UP. {{ 'footer.rights' | transloco }}
          </p>
          
          <div class="flex gap-6">
            <a href="/privacy" class="text-sm text-muted-foreground hover:text-accent transition-colors font-mono">
              {{ 'footer.privacy' | transloco }}
            </a>
            <a href="/terms" class="text-sm text-muted-foreground hover:text-accent transition-colors font-mono">
              {{ 'footer.terms' | transloco }}
            </a>
          </div>

          <!-- Social Links -->
          <div class="flex gap-4">
            <a href="https://instagram.com" target="_blank" rel="noopener" class="hover:text-accent transition-colors">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener" class="hover:text-accent transition-colors">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
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

  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);
  aboutLink = computed(() => `/${this.currentLang()}/about`);
  blogLink = computed(() => `/${this.currentLang()}/blog`);

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
}
