import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { EventsService } from '../../../core/api/events.service';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Event } from '../../../core/api/api.models';

@Component({
  selector: 'app-event-list',
  imports: [CommonModule, RouterModule, TranslocoModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-12">
          <h1 class="text-4xl md:text-5xl font-bold mb-4">{{ 'events.title' | transloco }}</h1>
          <p class="text-xl text-muted-foreground">{{ 'events.subtitle' | transloco }}</p>
        </div>

        @if (loading()) {
          <div class="space-y-8">
            @for (i of [1,2,3]; track i) {
              <div class="animate-pulse border border-border p-6">
                <div class="h-6 bg-muted rounded w-3/4 mb-4"></div>
                <div class="h-4 bg-muted rounded mb-2"></div>
                <div class="h-4 bg-muted rounded w-5/6"></div>
              </div>
            }
          </div>
        } @else if (events().length === 0) {
          <div class="text-center py-16 border border-border">
            <svg class="w-24 h-24 mx-auto mb-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 class="text-2xl font-bold mb-4">{{ 'events.no_events' | transloco }}</h2>
            <p class="text-muted-foreground">{{ 'events.no_events_description' | transloco }}</p>
          </div>
        } @else {
          <!-- Events -->
          <div class="space-y-8">
            @for (event of events(); track event.id) {
              <article class="border border-border p-6 hover:border-foreground transition-all group">
                <div class="flex items-center gap-3 mb-3">
                  <a [routerLink]="[event.slug]" class="flex-1">
                    <h2 class="text-2xl font-bold group-hover:text-accent transition-colors">
                      {{ event.title }}
                    </h2>
                  </a>
                  @if (authService.isSuperuser()) {
                    <span 
                      [class]="'inline-flex items-center px-3 py-1 text-xs font-semibold border ' + 
                        (event.is_published 
                          ? 'bg-green-50 dark:bg-green-950 border-green-500 text-green-700 dark:text-green-400' 
                          : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-500 text-yellow-700 dark:text-yellow-400')">
                      {{ (event.is_published ? 'events.published' : 'events.draft') | transloco }}
                    </span>
                  }
                </div>
                
                <div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <time [attr.datetime]="event.datetime">
                      {{ event.datetime | date: 'medium' }}
                    </time>
                  </div>
                  <span>•</span>
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{{ event.place }}</span>
                  </div>
                  @if (event.author) {
                    <span>•</span>
                    <span>{{ event.author }}</span>
                  }
                </div>

                @if (event.excerpt) {
                  <p class="text-muted-foreground mb-4 leading-relaxed">
                    {{ event.excerpt }}
                  </p>
                }

                <a 
                  [routerLink]="[event.slug]"
                  class="inline-flex items-center gap-2 text-foreground hover:text-accent transition-colors font-medium">
                  {{ 'events.read_more' | transloco }}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </article>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex justify-center gap-2 mt-12">
              <button
                (click)="goToPage(currentPage() - 1)"
                [disabled]="currentPage() === 1"
                class="px-4 py-2 border border-border hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                ←
              </button>
              
              @for (page of visiblePages(); track page) {
                @if (page === '...') {
                  <span class="px-4 py-2">...</span>
                } @else {
                  <button
                    (click)="goToPage(page)"
                    [class]="'px-4 py-2 border transition-all ' + (currentPage() === page ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground')">
                    {{ page }}
                  </button>
                }
              }

              <button
                (click)="goToPage(currentPage() + 1)"
                [disabled]="currentPage() === totalPages()"
                class="px-4 py-2 border border-border hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                →
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class EventListComponent implements OnInit {
  private eventsService = inject(EventsService);
  private languageService = inject(LanguageService);
  private notificationService = inject(NotificationService);
  authService = inject(AuthService);

  events = signal<Event[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  pageSize = 10;

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.loading.set(true);
    this.eventsService.getEvents({ page: this.currentPage(), page_size: this.pageSize }).subscribe({
      next: (response) => {
        this.events.set(response.results);
        this.totalPages.set(Math.ceil(response.count / this.pageSize));
        this.loading.set(false);
      },
      error: (err) => {
        this.notificationService.error('Failed to load events. Please try again.');
        this.loading.set(false);
      }
    });
  }

  goToPage(page: number | string) {
    if (typeof page === 'string') return;
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  visiblePages(): (number | string)[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 3; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  }
}
