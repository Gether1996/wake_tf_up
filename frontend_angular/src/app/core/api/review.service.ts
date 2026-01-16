import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Review } from './api.models';

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
    return this.api.post<Review>('reviews/', review);
  }

  getProductReviews(productId: number): Observable<Review[]> {
    return this.api.get<Review[]>(`reviews/?product=${productId}`);
  }
}
