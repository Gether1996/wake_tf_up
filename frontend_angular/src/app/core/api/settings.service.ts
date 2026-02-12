import { Injectable, signal, inject, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../services/notification.service';
import { interval, Subscription, takeUntil, Subject } from 'rxjs';

export interface MainSettings {
  free_shipping_threshold: number;
  standard_shipping_cost: number; // Legacy
  pickup_cost: number;
  dpd_courier_cost: number;
  packeta_box_cost: number;
  packeta_courier_cost: number;
  tax_rate: number;
  site_name: string;
  owner_name: string;
  company_id: string;
  tax_id: string;
  contact_email: string;
  orders_email: string;
  phone: string;
  address: string;
  country: string;
  instagram_url: string;
  facebook_url: string;
  twitter_url: string;
  tiktok_url: string;
  max_cart_quantity: number;
  maintenance_mode: boolean;
  maintenance_message: string;
  newsletter_popup_delay: number;
  newsletter_popup_enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService implements OnDestroy {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private apiUrl = `${environment.apiUrl}/settings`;
  private destroy$ = new Subject<void>();
  private refreshSubscription: Subscription | null = null;
  
  // Signal to store settings
  settings = signal<MainSettings | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  contactEmail = computed(() => this.settings()?.contact_email || environment.defaultContactEmail);
  phone = computed(() => this.settings()?.phone || '+421 917 207 760');
  address = computed(() => this.settings()?.address || 'Jedľová 319/33, 010 04 Žilina');
  country = computed(() => this.settings()?.country || 'Slovakia');
  ownerName = computed(() => this.settings()?.owner_name || 'Patrik Bielčik');
  companyId = computed(() => this.settings()?.company_id || '56698585');
  taxId = computed(() => this.settings()?.tax_id || '1127876057');

  constructor() {
    this.loadSettings();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  /**
   * Start auto-refresh of settings every 5 minutes
   */
  private startAutoRefresh() {
    // Auto-refresh settings every 5 minutes (300000 ms)
    this.refreshSubscription = interval(5 * 60 * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadSettings();
      });
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
          owner_name: 'Patrik Bielčik',
          company_id: '56698585',
          tax_id: '1127876057',
          contact_email: environment.defaultContactEmail,
          orders_email: 'orders@wake-tf-up.eu',
          phone: '+421 917 207 760',
          address: 'Jedľová 319/33, 010 04 Žilina',
          country: 'Slovakia',
          instagram_url: '',
          facebook_url: '',
          twitter_url: '',
          tiktok_url: '',
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

  /**
   * Update settings - admin only
   */
  updateSettings(updates: Partial<MainSettings>) {
    return this.http.put<MainSettings>(`${this.apiUrl}/`, updates);
  }

  /**
   * Update settings and reload local state immediately
   */
  updateAndRefresh(updates: Partial<MainSettings>) {
    return this.http.put<MainSettings>(`${this.apiUrl}/`, updates).pipe(
      // Automatically reload settings after update
      // The subscriber should call refresh() or the auto-refresh will pick it up
    );
  }
}
