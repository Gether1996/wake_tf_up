import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { BlogService } from '../../../core/api/blog.service';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BlogPost } from '../../../core/api/api.models';

@Component({
  selector: 'app-blog-list',
  imports: [CommonModule, RouterModule, TranslocoModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-12">
          <h1 class="text-4xl md:text-5xl font-bold mb-4">{{ 'blog.title' | transloco }}</h1>
          <p class="text-xl text-muted-foreground">{{ 'blog.subtitle' | transloco }}</p>
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
        } @else if (posts().length === 0) {
          <div class="text-center py-16 border border-border">
            <svg class="w-24 h-24 mx-auto mb-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 class="text-2xl font-bold mb-4">{{ 'blog.no_posts' | transloco }}</h2>
            <p class="text-muted-foreground">{{ 'blog.no_posts_description' | transloco }}</p>
          </div>
        } @else {
          <!-- Blog Posts -->
          <div class="space-y-8">
            @for (post of posts(); track post.id) {
              <article class="border border-border p-6 hover:border-foreground transition-all group">
                <a [routerLink]="[post.slug]">
                  <h2 class="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">
                    {{ post.title }}
                  </h2>
                </a>
                
                <div class="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <time [attr.datetime]="post.created_at">
                    {{ post.created_at | date: 'longDate' }}
                  </time>
                  @if (post.author) {
                    <span>•</span>
                    <span>{{ post.author }}</span>
                  }
                </div>

                @if (post.excerpt) {
                  <p class="text-muted-foreground mb-4 leading-relaxed">
                    {{ post.excerpt }}
                  </p>
                }

                <a 
                  [routerLink]="[post.slug]"
                  class="inline-flex items-center gap-2 text-foreground hover:text-accent transition-colors font-medium">
                  {{ 'blog.read_more' | transloco }}
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
export class BlogListComponent implements OnInit {
  private blogService = inject(BlogService);
  private languageService = inject(LanguageService);
  private notificationService = inject(NotificationService);

  posts = signal<BlogPost[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  pageSize = 10;

  ngOnInit() {
    this.loadPosts();
  }

  loadPosts() {
    this.loading.set(true);
    this.blogService.getPosts({ page: this.currentPage(), page_size: this.pageSize }).subscribe({
      next: (response) => {
        this.posts.set(response.results);
        this.totalPages.set(Math.ceil(response.count / this.pageSize));
        this.loading.set(false);
      },
      error: (err) => {
        this.notificationService.error('Failed to load blog posts. Please try again.');
        this.loading.set(false);
      }
    });
  }

  goToPage(page: number | string) {
    if (typeof page === 'string') return;
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadPosts();
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
