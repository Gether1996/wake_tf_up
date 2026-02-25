import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DiscountCode {
  id: number;
  code: string;
  discount_percentage: number;
  minimum_order_value: number;
  is_free_shipping: boolean;
  code_type: string;
  is_active: boolean;
  is_used: boolean;
  usage_count: number;
  max_uses: number;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

export interface ValidateDiscountCodeRequest {
  code: string;
  order_total: number;
}

export interface ValidateDiscountCodeResponse {
  valid: boolean;
  discount_amount: number;
  message: string;
  error_code?: string | null;
  code_id?: number;
  is_free_shipping?: boolean;
  final_total?: number;
  min_value?: number;
  discount_percentage?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LoyaltyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/loyalty`;

  /**
   * Get all active discount codes for the authenticated user
   */
  getMyDiscountCodes(): Observable<DiscountCode[]> {
    return this.http.get<DiscountCode[]>(`${this.apiUrl}/my-codes/`);
  }

  /**
   * Validate a discount code
   */
  validateDiscountCode(request: ValidateDiscountCodeRequest): Observable<ValidateDiscountCodeResponse> {
    return this.http.post<ValidateDiscountCodeResponse>(`${this.apiUrl}/validate-code/`, request);
  }

  /**
   * Generate loyalty code for authenticated user
   */
  generateLoyaltyCode(): Observable<{ message: string; code: DiscountCode }> {
    return this.http.post<{ message: string; code: DiscountCode }>(`${this.apiUrl}/generate-loyalty-code/`, {});
  }
}
