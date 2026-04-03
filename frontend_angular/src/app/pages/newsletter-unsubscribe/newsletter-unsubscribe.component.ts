import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-newsletter-unsubscribe',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background px-4">
      <div class="max-w-md w-full">
        <div class="bg-muted rounded-lg shadow-lg p-8">
          <!-- Success State -->
          @if (unsubscribed()) {
            <div class="text-center">
              <div class="mb-4">
                <svg class="w-16 h-16 mx-auto text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              
              <h1 class="text-2xl font-bold mb-2">{{ 'newsletter_unsubscribe.title_success' | transloco }}</h1>
              <p class="text-muted-foreground mb-6">
                {{ 'newsletter_unsubscribe.description_success' | transloco }}
              </p>
              
              <a [routerLink]="['/', currentLang()]" class="block">
                <button class="w-full bg-foreground text-background py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                  {{ 'newsletter_unsubscribe.back_home' | transloco }}
                </button>
              </a>
            </div>
          }
          
          <!-- Loading State -->
          @if (!unsubscribed() && !error()) {
            <div class="text-center">
              <div class="mb-4">
                <div class="inline-block">
                  <div class="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div>
                </div>
              </div>
              <p class="text-muted-foreground">{{ 'newsletter_unsubscribe.unsubscribing' | transloco }}</p>
            </div>
          }
          
          <!-- Error State -->
          @if (error()) {
            <div class="text-center">
              <div class="mb-4">
                <svg class="w-16 h-16 mx-auto text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              
              <h1 class="text-2xl font-bold mb-2 text-danger">{{ 'newsletter_unsubscribe.title_error' | transloco }}</h1>
              <p class="text-muted-foreground mb-4">
                {{ error() | transloco }}
              </p>
              
              <a [routerLink]="['/', currentLang()]" class="block">
                <button class="w-full bg-foreground text-background py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                  {{ 'newsletter_unsubscribe.back_home' | transloco }}
                </button>
              </a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class NewsletterUnsubscribeComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private languageService = inject(LanguageService);
  
  unsubscribed = signal(false);
  error = signal('');
  currentLang = this.languageService.currentLang;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const email = params['email'];
      const token = params['token'];
      
      if (!email) {
        this.error.set('newsletter_unsubscribe.email_missing');
        return;
      }
      
      this.api.get('newsletter/unsubscribe/', { email, token }).subscribe({
        next: (response: any) => {
          this.unsubscribed.set(true);
        },
        error: (err) => {
          console.error('Unsubscribe error:', err);
          this.error.set(err.error?.error || err.error?.message || 'newsletter_unsubscribe.error_generic');
        }
      });
    });
  }
}
