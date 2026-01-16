import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-cookie-consent',
  imports: [CommonModule, RouterModule, FormsModule, TranslocoModule, ButtonComponent],
  template: `
    @if (showBanner()) {
      <div class="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-foreground shadow-lg animate-slide-up">
        <div class="container mx-auto px-4 py-6">
          <div class="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <!-- Cookie Icon & Text -->
            <div class="flex-1">
              <div class="flex items-start gap-3">
                <div class="text-3xl flex-shrink-0">🍪</div>
                <div>
                  <h3 class="font-mono font-bold text-lg mb-2">{{ 'cookies.title' | transloco }}</h3>
                  <p class="text-sm text-muted-foreground">
                    {{ 'cookies.description' | transloco }}
                    <a [routerLink]="privacyLink()" class="text-accent hover:underline ml-1">
                      {{ 'cookies.learn_more' | transloco }}
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <app-button
                [variant]="'secondary'"
                [size]="'sm'"
                (clicked)="rejectAll()"
                class="w-full sm:w-auto">
                {{ 'cookies.reject' | transloco }}
              </app-button>
              
              <app-button
                [variant]="'outline'"
                [size]="'sm'"
                (clicked)="showSettings.set(true)"
                class="w-full sm:w-auto">
                {{ 'cookies.settings' | transloco }}
              </app-button>
              
              <app-button
                [variant]="'primary'"
                [size]="'sm'"
                (clicked)="acceptAll()"
                class="w-full sm:w-auto">
                {{ 'cookies.accept_all' | transloco }}
              </app-button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Settings Modal -->
    @if (showSettings()) {
      <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" (click)="closeSettings($event)">
        <div class="bg-background border-2 border-foreground max-w-2xl w-full max-h-[80vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="p-6">
            <div class="flex justify-between items-start mb-6">
              <h2 class="text-2xl font-bold font-mono">{{ 'cookies.settings_title' | transloco }}</h2>
              <button 
                (click)="showSettings.set(false)"
                class="text-muted-foreground hover:text-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p class="text-sm text-muted-foreground mb-6">
              {{ 'cookies.settings_description' | transloco }}
            </p>

            <!-- Essential Cookies -->
            <div class="border border-border p-4 mb-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-mono font-bold">{{ 'cookies.essential_title' | transloco }}</h3>
                <div class="px-3 py-1 bg-muted text-xs font-mono">
                  {{ 'cookies.always_active' | transloco }}
                </div>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ 'cookies.essential_description' | transloco }}
              </p>
            </div>

            <!-- Analytics Cookies -->
            <div class="border border-border p-4 mb-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-mono font-bold">{{ 'cookies.analytics_title' | transloco }}</h3>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="analyticsEnabled"
                    class="sr-only peer">
                  <div class="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ 'cookies.analytics_description' | transloco }}
              </p>
            </div>

            <!-- Marketing Cookies -->
            <div class="border border-border p-4 mb-6">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-mono font-bold">{{ 'cookies.marketing_title' | transloco }}</h3>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="marketingEnabled"
                    class="sr-only peer">
                  <div class="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ 'cookies.marketing_description' | transloco }}
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <app-button
                [variant]="'secondary'"
                [fullWidth]="true"
                (clicked)="savePreferences()">
                {{ 'cookies.save_preferences' | transloco }}
              </app-button>
              <app-button
                [variant]="'primary'"
                [fullWidth]="true"
                (clicked)="acceptAll()">
                {{ 'cookies.accept_all' | transloco }}
              </app-button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slide-up {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    .animate-slide-up {
      animation: slide-up 0.3s ease-out;
    }

    :host {
      display: contents;
    }
  `]
})
export class CookieConsentComponent {
  showBanner = signal(false);
  showSettings = signal(false);
  analyticsEnabled = false;
  marketingEnabled = false;

  private readonly CONSENT_KEY = 'cookie_consent';
  private readonly CONSENT_VERSION = '1.0';

  constructor() {
    // Check if user has already given consent
    effect(() => {
      if (typeof window !== 'undefined') {
        const consent = this.getConsent();
        if (!consent) {
          // Show banner after a short delay
          setTimeout(() => this.showBanner.set(true), 1000);
        } else {
          // Load saved preferences
          this.analyticsEnabled = consent.analytics || false;
          this.marketingEnabled = consent.marketing || false;
        }
      }
    });
  }

  privacyLink = () => {
    if (typeof window !== 'undefined') {
      const lang = window.location.pathname.split('/')[1] || 'en';
      return `/${lang}/privacy`;
    }
    return '/en/privacy';
  };

  acceptAll() {
    this.analyticsEnabled = true;
    this.marketingEnabled = true;
    this.saveConsent(true, true);
    this.showBanner.set(false);
    this.showSettings.set(false);
  }

  rejectAll() {
    this.analyticsEnabled = false;
    this.marketingEnabled = false;
    this.saveConsent(false, false);
    this.showBanner.set(false);
    this.showSettings.set(false);
  }

  savePreferences() {
    this.saveConsent(this.analyticsEnabled, this.marketingEnabled);
    this.showBanner.set(false);
    this.showSettings.set(false);
  }

  closeSettings(event: Event) {
    this.showSettings.set(false);
  }

  private saveConsent(analytics: boolean, marketing: boolean) {
    if (typeof window !== 'undefined') {
      const consent = {
        version: this.CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        essential: true, // Always true
        analytics,
        marketing
      };
      localStorage.setItem(this.CONSENT_KEY, JSON.stringify(consent));
    }
  }

  private getConsent(): any {
    if (typeof window !== 'undefined') {
      const consentStr = localStorage.getItem(this.CONSENT_KEY);
      if (consentStr) {
        try {
          const consent = JSON.parse(consentStr);
          // Check if consent version matches
          if (consent.version === this.CONSENT_VERSION) {
            return consent;
          }
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }
}
