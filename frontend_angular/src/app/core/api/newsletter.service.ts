import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface NewsletterSubscribeRequest {
  email: string;
}

export interface NewsletterResponse {
  success: boolean;
  message: string;
}

export interface PopupTrackRequest {
  session_id: string;
  action: 'subscribed' | 'dismissed';
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsletterService {
  constructor(private api: ApiService) {}

  subscribe(email: string): Observable<NewsletterResponse> {
    return this.api.post<NewsletterResponse>('newsletter/subscribe/', { email });
  }
  
  trackPopupInteraction(data: PopupTrackRequest): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('newsletter/popup-track/', data);
  }
}
