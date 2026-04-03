import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreatePaymentRequest {
  order_id: number;
  access_token?: string;
}

export interface PaymentResponse {
  success: boolean;
  payment_url: string;
  transaction_id: string;
  transaction: PaymentTransaction;
}

export interface PaymentTransaction {
  id: number;
  order: number;
  amount: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  provider: string;
  provider_transaction_id: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  transaction: PaymentTransaction;
  order_status: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payments`;

  /**
   * Create a GoPay payment for an order
   */
  createPayment(request: CreatePaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/create/`, request);
  }

  /**
   * Check payment status by order ID
   */
  checkPaymentStatus(orderId: number, accessToken?: string): Observable<PaymentStatusResponse> {
    const params = accessToken
      ? new HttpParams().set('access_token', accessToken)
      : undefined;
    return this.http.get<PaymentStatusResponse>(`${this.apiUrl}/status/${orderId}/`, { params });
  }
}
