import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Review, FeaturedReview } from './api.models';

export interface CreateReviewRequest {
  product: number;
  rating: number;
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(private api: ApiService) {}

  createReview(review: CreateReviewRequest): Observable<Review> {
    return this.api.post<Review>('reviews/create/', review);
  }

  getProductReviews(productId: number): Observable<Review[]> {
    return this.api.get<Review[]>(`reviews/?product=${productId}`);
  }

  getFeaturedReviews(): Observable<FeaturedReview[]> {
    return this.api.get<FeaturedReview[]>('reviews/featured/');
  }
}
