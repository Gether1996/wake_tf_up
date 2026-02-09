import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Event, PaginatedResponse } from './api.models';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  constructor(private api: ApiService) {}

  getEvents(params?: { page?: number; page_size?: number }): Observable<PaginatedResponse<Event>> {
    return this.api.get<PaginatedResponse<Event>>('events/', params);
  }

  getEvent(slug: string): Observable<Event> {
    return this.api.get<Event>(`events/${slug}/`);
  }
}
