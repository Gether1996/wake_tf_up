import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface MainSettings {
  free_shipping_threshold: number;
  standard_shipping_cost: number;
  tax_rate: number;
  site_name: string;
  contact_email: string;
  instagram_url: string;
  facebook_url: string;
  twitter_url: string;
  max_cart_quantity: number;
  maintenance_mode: boolean;
  maintenance_message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/settings`;
  
  // Signal to store settings
  settings = signal<MainSettings | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.loadSettings();
  }

  /**
   * Load settings from API
   */
  loadSettings() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<MainSettings>(this.apiUrl).subscribe({
      next: (settings: MainSettings) => {
        this.settings.set(settings);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load settings:', err);
        this.error.set('Failed to load application settings');
        this.loading.set(false);
        
        // Set default values on error
        this.settings.set({
          free_shipping_threshold: 50,
          standard_shipping_cost: 5.99,
          tax_rate: 20,
          site_name: 'Wake TF Up',
          contact_email: 'info@waketfup.com',
          instagram_url: '',
          facebook_url: '',
          twitter_url: '',
          max_cart_quantity: 10,
          maintenance_mode: false,
          maintenance_message: ''
        });
      }
    });
  }

  /**
   * Get shipping settings only
   */
  getShippingSettings() {
    return this.http.get<{
      free_shipping_threshold: number;
      standard_shipping_cost: number;
    }>(`${this.apiUrl}/shipping/`);
  }

  /**
   * Get cart settings only
   */
  getCartSettings() {
    return this.http.get<{
      max_cart_quantity: number;
      free_shipping_threshold: number;
      standard_shipping_cost: number;
    }>(`${this.apiUrl}/cart/`);
  }

  /**
   * Refresh settings from API
   */
  refresh() {
    this.loadSettings();
  }
}
