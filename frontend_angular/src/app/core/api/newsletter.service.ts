import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { LanguageService } from '../services/language.service';

export interface NewsletterSubscribeRequest {
  email: string;
  language?: 'sk' | 'en';
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
  private languageService = inject(LanguageService);
  
  constructor(private api: ApiService) {}

  subscribe(email: string, language?: 'sk' | 'en'): Observable<NewsletterResponse> {
    // Use provided language or get current language from service
    const lang = language || this.languageService.currentLang();
    return this.api.post<NewsletterResponse>('newsletter/subscribe/', { 
      email,
      language: lang
    });
  }
  
  trackPopupInteraction(data: PopupTrackRequest): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('newsletter/popup-track/', data);
  }
}
