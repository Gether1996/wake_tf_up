import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Product, Category, Color, Ticket } from './api.models';
import { LanguageService } from '../services/language.service';

export interface ProductFilters {
  category?: string;
  color?: number;
  price_min?: number;
  price_max?: number;
  in_stock?: boolean;
  pre_order?: boolean;
  is_limited_drop?: string;
  is_recycled?: string;
  is_preorder?: string;
  ordering?: string;
  page?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private languageService = inject(LanguageService);
  
  constructor(private api: ApiService) {}

  getProducts(filters?: ProductFilters): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams();
    
    // Add language parameter
    params = params.set('lang', this.languageService.currentLang());
    
    if (filters) {
      if (filters.category) params = params.set('category', filters.category);
      if (filters.color) params = params.set('color', filters.color.toString());
      if (filters.price_min) params = params.set('price_min', filters.price_min.toString());
      if (filters.price_max) params = params.set('price_max', filters.price_max.toString());
      if (filters.in_stock !== undefined) params = params.set('in_stock', filters.in_stock.toString());
      if (filters.pre_order !== undefined) params = params.set('pre_order', filters.pre_order.toString());
      if (filters.is_limited_drop) params = params.set('is_limited_drop', filters.is_limited_drop);
      if (filters.is_recycled) params = params.set('is_recycled', filters.is_recycled);
      if (filters.is_preorder) params = params.set('is_preorder', filters.is_preorder);
      if (filters.ordering) params = params.set('ordering', filters.ordering);
      if (filters.page) params = params.set('page', filters.page.toString());
    }

    return this.api.get<PaginatedResponse<Product>>('products/', params);
  }

  getProduct(slug: string): Observable<Product> {
    const params = new HttpParams().set('lang', this.languageService.currentLang());
    return this.api.get<Product>(`products/${slug}/`, params);
  }

  getCategories(): Observable<Category[]> {
    const params = new HttpParams().set('lang', this.languageService.currentLang());
    return this.api.get<Category[]>('categories/', params);
  }

  getColors(): Observable<Color[]> {
    const params = new HttpParams().set('lang', this.languageService.currentLang());
    return this.api.get<Color[]>('colors/', params);
  }

  searchProducts(query: string): Observable<Product[]> {
    let params = new HttpParams()
      .set('search', query)
      .set('lang', this.languageService.currentLang());
    return this.api.get<Product[]>('products/', params);
  }

  getTickets(): Observable<Ticket[]> {
    const params = new HttpParams().set('lang', this.languageService.currentLang());
    return this.api.get<Ticket[]>('tickets/', params);
  }

  getTicket(slug: string): Observable<Ticket> {
    const params = new HttpParams().set('lang', this.languageService.currentLang());
    return this.api.get<Ticket>(`tickets/${slug}/`, params);
  }
}
