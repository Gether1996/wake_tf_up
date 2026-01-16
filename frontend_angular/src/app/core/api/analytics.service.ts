import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ProductEvent {
  product: number | string; // ID or slug
  event_type: 'view' | 'click';
  session_id?: string;
}

export interface AnalyticsResponse {
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private platformId = inject(PLATFORM_ID);
  private sessionId: string;

  constructor(private api: ApiService) {
    this.sessionId = this.getOrCreateSessionId();
  }

  trackProductView(productId: number | string): Observable<AnalyticsResponse> {
    return this.trackEvent({
      product: productId,
      event_type: 'view',
      session_id: this.sessionId
    });
  }

  trackProductClick(productId: number | string): Observable<AnalyticsResponse> {
    return this.trackEvent({
      product: productId,
      event_type: 'click',
      session_id: this.sessionId
    });
  }

  private trackEvent(event: ProductEvent): Observable<AnalyticsResponse> {
    return this.api.post<AnalyticsResponse>('analytics/events/', event);
  }

  private getOrCreateSessionId(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    const stored = localStorage.getItem('analytics_session_id');
    if (stored) {
      return stored;
    }

    // Generate simple session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('analytics_session_id', sessionId);
    return sessionId;
  }
}
