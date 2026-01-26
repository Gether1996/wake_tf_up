import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslocoModule } from '@jsverse/transloco';
import { BlogService } from '../../../core/api/blog.service';
import { LanguageService } from '../../../core/services/language.service';
import { BlogPost } from '../../../core/api/api.models';
import { ButtonComponent } from '../../../shared/button/button.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-blog-detail',
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
          <app-button [routerLink]="blogLink()">
            {{ 'blog.back' | transloco }}
          </app-button>
        </div>
      } @else if (post()) {
        <article class="max-w-3xl mx-auto">
          <!-- Back Button -->
          <a 
            [routerLink]="blogLink()"
            class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            {{ 'blog.back' | transloco }}
          </a>

          <!-- Title -->
          <h1 class="text-4xl md:text-5xl font-bold mb-6">{{ post()!.title }}</h1>

          <!-- Meta -->
          <div class="flex items-center gap-4 text-muted-foreground mb-8 pb-8 border-b border-border">
            <time [attr.datetime]="post()!.created_at">
              {{ post()!.created_at | date: 'longDate' }}
            </time>
            @if (post()!.author) {
              <span>•</span>
              <span>{{ post()!.author }}</span>
            }
          </div>

          <!-- Content -->
          <div 
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
            <p class="text-sm text-muted-foreground mb-4">{{ 'blog.share' | transloco }}</p>
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
                {{ copied() ? 'blog.copied' : 'blog.copy_link' | transloco }}
              </button>
            </div>
          </div>

          <!-- Navigation -->
          <div class="mt-12 pt-8 border-t border-border">
            <app-button [routerLink]="blogLink()" [variant]="'ghost'">
              ← {{ 'blog.all_posts' | transloco }}
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
export class BlogDetailComponent implements OnInit {
  private blogService = inject(BlogService);
  private route = inject(ActivatedRoute);
  private languageService = inject(LanguageService);
  private sanitizer = inject(DomSanitizer);

  currentLang = this.languageService.currentLang;
  blogLink = computed(() => `/${this.currentLang()}/blog`);

  post = signal<BlogPost | null>(null);
  loading = signal(false);
  error = signal('');
  copied = signal(false);
  
  sanitizedContent = computed(() => {
    let content = this.post()?.content_html || '';
    
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
        this.loadPost(slug);
      }
    });
  }

  loadPost(slug: string) {
    this.loading.set(true);
    this.error.set('');

    this.blogService.getPost(slug).subscribe({
      next: (post) => {
        this.post.set(post);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Post not found');
        this.loading.set(false);
      }
    });
  }

  shareOn(platform: string) {
    const url = window.location.href;
    const title = this.post()?.title || '';
    
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
