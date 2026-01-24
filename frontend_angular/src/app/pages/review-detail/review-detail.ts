import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ReviewService } from '../../core/api/review.service';
import { LanguageService } from '../../core/services/language.service';
import { FeaturedReview } from '../../core/api/api.models';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-review-detail',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent],
  templateUrl: './review-detail.html',
  styleUrl: './review-detail.css',
})
export class ReviewDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private reviewService = inject(ReviewService);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  review = signal<FeaturedReview | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit() {
    const reviewId = this.route.snapshot.paramMap.get('id');
    if (reviewId) {
      this.loadReview(+reviewId);
    }
  }

  loadReview(id: number) {
    this.loading.set(true);
    this.error.set('');

    // Get all featured reviews and find the specific one
    this.reviewService.getFeaturedReviews().subscribe({
      next: (reviews) => {
        const foundReview = reviews.find(r => r.id === id);
        if (foundReview) {
          this.review.set(foundReview);
        } else {
          this.error.set('Review not found');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load review');
        this.loading.set(false);
      }
    });
  }

  getStars(rating: number): string[] {
    return Array(rating).fill('⭐');
  }
}
