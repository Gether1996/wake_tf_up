import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../services/notification.service';

export interface MainSettings {
  free_shipping_threshold: number;
  standard_shipping_cost: number; // Legacy
  pickup_cost: number;
  dpd_courier_cost: number;
  packeta_box_cost: number;
  packeta_courier_cost: number;
  tax_rate: number;
  site_name: string;
  contact_email: string;
  instagram_url: string;
  facebook_url: string;
  twitter_url: string;
  max_cart_quantity: number;
  maintenance_mode: boolean;
  maintenance_message: string;
  newsletter_popup_delay: number;
  newsletter_popup_enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
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
        this.notificationService.error('Failed to load application settings. Using default values.');
        this.error.set('Failed to load application settings');
        this.loading.set(false);
        
        // Set default values on error
        this.settings.set({
          free_shipping_threshold: 50,
          standard_shipping_cost: 5.99,
          pickup_cost: 0,
          dpd_courier_cost: 5.99,
          packeta_box_cost: 3.99,
          packeta_courier_cost: 4.99,
          tax_rate: 20,
          site_name: 'Wake TF Up',
          contact_email: 'info@waketfup.com',
          instagram_url: '',
          facebook_url: '',
          twitter_url: '',
          max_cart_quantity: 10,
          maintenance_mode: false,
          maintenance_message: '',
          newsletter_popup_delay: 5,
          newsletter_popup_enabled: true
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

  /**
   * Get Packeta API key from backend
   */
  getPacketaApiKey() {
    return this.http.get<{ api_key: string }>(`${this.apiUrl}/packeta_key/`);
  }
}
