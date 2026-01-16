import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Order, PaginatedResponse } from './api.models';
import { CartService } from './cart.service';

export interface CreateOrderRequest {
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
  shipping_method: 'pickup' | 'dpd_courier' | 'packeta_box' | 'packeta_courier';
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  phone: string;
  packeta_point_id?: string;
  packeta_point_name?: string;
  packeta_point_address?: string;
  is_company_purchase?: boolean;
  billing_company?: string;
  billing_ico?: string;
  billing_dic?: string;
  billing_ic_dph?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(
    private api: ApiService,
    private cartService: CartService
  ) {}

  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    return this.api.post<Order>('orders/create/', orderData);
  }

  getOrders(params?: { page?: number; page_size?: number }): Observable<PaginatedResponse<Order>> {
    return this.api.get<PaginatedResponse<Order>>('orders/', params);
  }

  getOrder(id: number): Observable<Order> {
    return this.api.get<Order>(`orders/${id}/`);
  }

  createOrderFromCart(shippingData: Omit<CreateOrderRequest, 'items'>): Observable<Order> {
    const items = this.cartService.items().map(item => ({
      product_id: item.product.id,
      quantity: item.quantity
    }));

    return this.createOrder({
      items,
      ...shippingData
    });
  }
}
