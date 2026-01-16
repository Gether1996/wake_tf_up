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

@Injectable({
  providedIn: 'root'
})
export class NewsletterService {
  constructor(private api: ApiService) {}

  subscribe(email: string): Observable<NewsletterResponse> {
    return this.api.post<NewsletterResponse>('newsletter/subscribe/', { email });
  }
}
