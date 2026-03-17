import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslocoModule } from '@jsverse/transloco';
import { EventsService } from '../../../core/api/events.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Event } from '../../../core/api/api.models';
import { ButtonComponent } from '../../../shared/button/button.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-event-detail',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      @if (loading()) {
        <div class="max-w-3xl mx-auto animate-pulse">
          <div class="h-12 bg-muted rounded w-3/4 mb-8"></div>
          <div class="space-y-4">
            <div class="h-4 bg-muted rounded"></div>
            <div class="h-4 bg-muted rounded"></div>
            <div class="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      } @else if (error()) {
        <div class="max-w-3xl mx-auto text-center py-16">
          <p class="text-danger mb-4">{{ error() }}</p>
          <app-button [routerLink]="eventsLink()">
            {{ 'events.back' | transloco }}
          </app-button>
        </div>
      } @else if (event()) {
        <article class="max-w-3xl mx-auto">
          <!-- Back Button -->
          <a 
            [routerLink]="eventsLink()"
            class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            {{ 'events.back' | transloco }}
          </a>

          <!-- Title -->
          <div class="flex items-center gap-4 mb-6">
            <h1 class="text-4xl md:text-5xl font-bold flex-1">{{ event()!.title }}</h1>
            @if (authService.isSuperuser()) {
              <span 
                [class]="'inline-flex items-center px-3 py-1 text-sm font-semibold border whitespace-nowrap ' + 
                  (event()!.is_published 
                    ? 'bg-green-50 dark:bg-green-950 border-green-500 text-green-700 dark:text-green-400' 
                    : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-500 text-yellow-700 dark:text-yellow-400')">
                {{ (event()!.is_published ? 'events.published' : 'events.draft') | transloco }}
              </span>
            }
          </div>

          <!-- Event Details Card -->
          <div class="border border-accent bg-accent/5 p-6 mb-8">
            <div class="grid md:grid-cols-2 gap-4">
              <div class="flex items-start gap-3">
                <svg class="w-6 h-6 text-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p class="text-sm text-muted-foreground mb-1">{{ 'events.date_time' | transloco }}</p>
                  <time [attr.datetime]="event()!.datetime" class="font-semibold">
                    {{ event()!.datetime | date: 'full' : '' : currentLang() }}
                  </time>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <svg class="w-6 h-6 text-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p class="text-sm text-muted-foreground mb-1">{{ 'events.location' | transloco }}</p>
                  <p class="font-semibold">{{ event()!.place }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Meta -->
          <div class="flex items-center gap-4 text-muted-foreground mb-8 pb-8 border-b border-border">
            <time [attr.datetime]="event()!.created_at">
              {{ event()!.created_at | date: 'longDate' : '' : currentLang() }}
            </time>
            @if (event()!.author) {
              <span>•</span>
              <span>{{ event()!.author }}</span>
            }
          </div>

          <!-- Content -->
          <div 
            #contentDiv
            class="prose prose-lg max-w-none
                   prose-headings:font-bold prose-headings:tracking-tight
                   prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
                   prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
                   prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
                   prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                   prose-strong:text-foreground prose-strong:font-semibold
                   prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6
                   prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6
                   prose-li:text-foreground prose-li:mb-2
                   prose-img:rounded-none prose-img:border prose-img:border-border
                   prose-blockquote:border-l-4 prose-blockquote:border-accent 
                   prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-foreground
                   prose-code:text-accent prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
            [innerHTML]="sanitizedContent()">
          </div>

          <!-- Share Section -->
          <div class="mt-12 pt-8 border-t border-border">
            <p class="text-sm text-muted-foreground mb-4">{{ 'events.share' | transloco }}</p>
            <div class="flex gap-3">
              <button 
                (click)="shareOn('twitter')"
                class="px-4 py-2 border border-border hover:border-foreground transition-all">
                Twitter
              </button>
              <button 
                (click)="shareOn('facebook')"
                class="px-4 py-2 border border-border hover:border-foreground transition-all">
                Facebook
              </button>
              <button 
                (click)="copyLink()"
                class="px-4 py-2 border border-border hover:border-foreground transition-all">
                {{ copied() ? 'events.copied' : 'events.copy_link' | transloco }}
              </button>
            </div>
          </div>

          <!-- Navigation -->
          <div class="mt-12 pt-8 border-t border-border">
            <app-button [routerLink]="eventsLink()" [variant]="'ghost'">
              ← {{ 'events.all_events' | transloco }}
            </app-button>
          </div>
        </article>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class EventDetailComponent implements OnInit, AfterViewChecked {
  private eventsService = inject(EventsService);
  private route = inject(ActivatedRoute);
  private languageService = inject(LanguageService);
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);
  authService = inject(AuthService);

  @ViewChild('contentDiv') contentDiv?: ElementRef;
  private scriptsDone = false;

  currentLang = this.languageService.currentLang;
  eventsLink = computed(() => `/${this.currentLang()}/events`);

  event = signal<Event | null>(null);
  loading = signal(false);
  error = signal('');
  copied = signal(false);
  
  sanitizedContent = computed(() => {
    let content = this.event()?.content_html || '';
    
    // Transform relative media URLs to absolute URLs
    if (content && environment.apiBaseUrl) {
      // Replace src="/media/ with src="{apiBaseUrl}/media/
      content = content.replace(/src="\/media\//g, `src="${environment.apiBaseUrl}/media/`);
      // Replace src='/media/ with src='{apiBaseUrl}/media/
      content = content.replace(/src='\/media\//g, `src='${environment.apiBaseUrl}/media/`);
    }
    
    return this.sanitizer.bypassSecurityTrustHtml(content);
  });

  ngOnInit() {
    this.route.params.subscribe(params => {
      const slug = params['slug'];
      if (slug) {
        this.loadEvent(slug);
      }
    });
  }

  ngAfterViewChecked() {
    if (this.event() && this.contentDiv && !this.scriptsDone && isPlatformBrowser(this.platformId)) {
      this.executeScripts(this.contentDiv.nativeElement);
      this.scriptsDone = true;
    }
  }

  private executeScripts(container: HTMLElement) {
    const scripts = container.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }

  loadEvent(slug: string) {
    this.loading.set(true);
    this.error.set('');
    this.scriptsDone = false;

    this.eventsService.getEvent(slug).subscribe({
      next: (event) => {
        this.event.set(event);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Event not found');
        this.loading.set(false);
      }
    });
  }

  shareOn(platform: string) {
    const url = window.location.href;
    const title = this.event()?.title || '';
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }

  copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
