import { Injectable, signal, computed } from '@angular/core';

export interface CookieConsent {
  version: string;
  timestamp: string;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {
  private readonly CONSENT_KEY = 'cookie_consent';
  private readonly CONSENT_VERSION = '1.0';

  // Signal to track consent state
  private consentState = signal<CookieConsent | null>(null);

  // Public computed signal to check if user has given analytics consent
  analyticsConsent = computed(() => {
    const consent = this.consentState();
    return consent?.analytics ?? false;
  });

  // Public computed signal to check if user has given marketing consent
  marketingConsent = computed(() => {
    const consent = this.consentState();
    return consent?.marketing ?? false;
  });

  // Public computed signal to check if user has given any consent
  hasConsented = computed(() => {
    return this.consentState() !== null;
  });

  constructor() {
    this.loadConsent();
  }

  /**
   * Save consent preference to localStorage
   */
  saveConsent(analytics: boolean, marketing: boolean): void {
    const consent: CookieConsent = {
      version: this.CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      essential: true, // Always true
      analytics,
      marketing
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.CONSENT_KEY, JSON.stringify(consent));
    }
    
    this.consentState.set(consent);
  }

  /**
   * Reject all optional cookies
   */
  rejectAll(): void {
    this.saveConsent(false, false);
  }

  /**
   * Accept all cookies
   */
  acceptAll(): void {
    this.saveConsent(true, true);
  }

  /**
   * Get current consent state
   */
  getConsent(): CookieConsent | null {
    return this.consentState();
  }

  /**
   * Check if analytics tracking is allowed
   */
  isAnalyticsAllowed(): boolean {
    return this.analyticsConsent();
  }

  /**
   * Check if marketing cookies are allowed
   */
  isMarketingAllowed(): boolean {
    return this.marketingConsent();
  }

  /**
   * Load consent from localStorage
   */
  private loadConsent(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const consentStr = localStorage.getItem(this.CONSENT_KEY);
      if (consentStr) {
        const consent = JSON.parse(consentStr) as CookieConsent;
        
        // Check if consent version matches
        if (consent.version === this.CONSENT_VERSION) {
          this.consentState.set(consent);
        } else {
          // Clear outdated consent
          localStorage.removeItem(this.CONSENT_KEY);
        }
      }
    } catch (e) {
      console.error('Error parsing cookie consent:', e);
    }
  }
}
