import { Injectable, inject } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { ApiService } from './api.service';
import { CookieConsentService } from '../services/cookie-consent.service';

export interface ProductEvent {
  product: number | string; // ID or slug
  event_type: 'view' | 'click';
}

export interface AnalyticsResponse {
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private cookieConsent = inject(CookieConsentService);

  constructor(private api: ApiService) {}

  trackProductView(productId: number | string): Observable<AnalyticsResponse> {
    // Only track if user has given analytics consent
    if (!this.cookieConsent.isAnalyticsAllowed()) {
      return EMPTY;
    }

    return this.trackEvent({
      product: productId,
      event_type: 'view'
    });
  }

  trackProductClick(productId: number | string): Observable<AnalyticsResponse> {
    // Only track if user has given analytics consent
    if (!this.cookieConsent.isAnalyticsAllowed()) {
      return EMPTY;
    }

    return this.trackEvent({
      product: productId,
      event_type: 'click'
    });
  }

  private trackEvent(event: ProductEvent): Observable<AnalyticsResponse> {
    return this.api.post<AnalyticsResponse>('analytics/events/', event);
  }
}
