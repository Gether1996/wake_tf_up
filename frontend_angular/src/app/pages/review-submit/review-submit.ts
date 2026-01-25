import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService } from '../../core/api/api.service';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-review-submit',
  imports: [CommonModule, RouterModule, FormsModule, TranslocoModule, ButtonComponent],
  templateUrl: './review-submit.html',
  styleUrl: './review-submit.css',
})
export class ReviewSubmit implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private languageService = inject(LanguageService);
  private notificationService = inject(NotificationService);
  private translocoService = inject(TranslocoService);

  currentLang = this.languageService.currentLang;
  
  token = signal<string>('');
  rating = signal<number>(5);
  reviewText = signal<string>('');
  reviewerName = signal<string>('');
  isAnonymous = signal<boolean>(false);
  
  submitting = signal(false);
  submitted = signal(false);
  error = signal('');

  ngOnInit() {
    const tokenParam = this.route.snapshot.queryParamMap.get('token');
    if (tokenParam) {
      this.token.set(tokenParam);
    } else {
      this.error.set(this.translocoService.translate('review_submit.invalid_link'));
    }
  }

  setRating(value: number) {
    this.rating.set(value);
  }

  toggleAnonymous() {
    this.isAnonymous.update(v => !v);
  }

  submitReview() {
    if (!this.token()) {
      this.error.set(this.translocoService.translate('review_submit.error_invalid_token'));
      return;
    }

    if (!this.reviewText().trim()) {
      this.error.set(this.translocoService.translate('review_submit.error_empty_review'));
      return;
    }

    if (!this.isAnonymous() && !this.reviewerName().trim()) {
      this.error.set(this.translocoService.translate('review_submit.error_name_required'));
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    const payload = {
      token: this.token(),
      rating: this.rating(),
      text: this.reviewText(),
      reviewer_name: this.isAnonymous() ? '' : this.reviewerName(),
      is_anonymous: this.isAnonymous()
    };

    this.api.post('reviews/submit-via-token/', payload).subscribe({
      next: () => {
        this.submitted.set(true);
        this.submitting.set(false);
        this.notificationService.show(
          this.translocoService.translate('review_submit.success_title'), 
          'success',
          3000
        );
        
        setTimeout(() => {
          this.router.navigate(['/', this.currentLang()]);
        }, 3000);
      },
      error: (err) => {
        this.error.set(
          err.error?.error || 
          this.translocoService.translate('review_submit.error_submit_failed')
        );
        this.submitting.set(false);
      }
    });
  }

  getStars(): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }
}
