import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { User, LoginRequest, RegisterRequest, TokenResponse } from '../api/api.models';
import { environment } from '../../../environments/environment';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private profileRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  
  private currentUser = signal<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isSuperuser = computed(() => this.currentUser()?.is_superuser === true);

  constructor(
    private http: HttpClient,
    private router: Router,
    private translocoService: TranslocoService
  ) {
    // Delay loading user to avoid circular dependency
    if (isPlatformBrowser(this.platformId) && this.hasToken()) {
      // Use setTimeout to break circular dependency
      setTimeout(() => this.loadCurrentUser(), 0);
    }
  }

  login(credentials: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login/`, credentials)
      .pipe(
        tap(response => {
          this.storeTokens(response);
          this.loadCurrentUser();
        })
      );
  }

  register(data: RegisterRequest): Observable<any> {
    const language = this.translocoService.getActiveLang();
    return this.http.post<any>(`${environment.apiUrl}/auth/register/`, {
      ...data,
      language
    });
  }

  logout(): void {
    this.clearAuthState();
    
    // Clear cart and checkout data for security (prevent data leaking to next user)
    // Use lazy injection to avoid circular dependency
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('checkout_data');
      localStorage.removeItem('cart'); // Clear cart directly to avoid circular dependency
    }
    
    const lang = this.translocoService.getActiveLang();
    this.router.navigate([`/${lang}/auth/login`]);
  }

  clearAuthState(): void {
    this.clearProfileRetry();
    this.clearTokens();
    this.currentUser.set(null);
    this.isAuthenticatedSubject.next(false);
  }

  refreshToken(): Observable<TokenResponse> {
    const refresh = this.getRefreshToken();
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/token/refresh/`, { refresh })
      .pipe(
        tap(response => {
          this.storeTokens(response);
        })
      );
  }

  getAccessToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getRefreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private storeTokens(tokens: TokenResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.TOKEN_KEY, tokens.access);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh);
    }
    this.isAuthenticatedSubject.next(true);
  }

  private clearTokens(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  private hasToken(): boolean {
    return !!this.getAccessToken();
  }

  private scheduleProfileRetry(): void {
    if (!this.hasToken() || this.profileRetryTimeout) {
      return;
    }

    this.profileRetryTimeout = setTimeout(() => {
      this.profileRetryTimeout = null;
      this.loadCurrentUser();
    }, 5000);
  }

  private clearProfileRetry(): void {
    if (this.profileRetryTimeout) {
      clearTimeout(this.profileRetryTimeout);
      this.profileRetryTimeout = null;
    }
  }

  private loadCurrentUser(): void {
    this.http.get<User>(`${environment.apiUrl}/auth/profile/`)
      .subscribe({
        next: (user) => {
          this.currentUser.set(user);
          this.isAuthenticatedSubject.next(true);
          this.clearProfileRetry();
        },
        error: (err) => {
          if (err.status === 401 || err.status === 403) {
            this.clearTokens();
            this.currentUser.set(null);
            this.isAuthenticatedSubject.next(false);
          } else {
            // Keep tokens for transient errors and retry later
            this.isAuthenticatedSubject.next(this.hasToken());
            this.scheduleProfileRetry();
          }
        }
      });
  }

  updateProfile(data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/auth/profile/`, data)
      .pipe(
        tap(user => {
          this.currentUser.set(user);
        })
      );
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/auth/verify-email/`, {
      params: { token }
    });
  }

  resendVerificationEmail(email: string): Observable<any> {
    const language = this.translocoService.getActiveLang();
    return this.http.post<any>(`${environment.apiUrl}/auth/resend-verification/`, { email, language });
  }

  requestPasswordReset(email: string): Observable<any> {
    const language = this.translocoService.getActiveLang();
    return this.http.post<any>(`${environment.apiUrl}/auth/request-password-reset/`, { email, language });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/reset-password/`, { token, password });
  }
}
