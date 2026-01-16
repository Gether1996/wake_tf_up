import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { User, LoginRequest, RegisterRequest, TokenResponse } from '../api/api.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  
  private currentUser = signal<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Load user on init if token exists (only in browser)
    if (isPlatformBrowser(this.platformId) && this.hasToken()) {
      this.loadCurrentUser();
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

  register(data: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/auth/register/`, data)
      .pipe(
        tap(() => {
          // After registration, auto-login
          this.login({ email: data.email, password: data.password }).subscribe();
        })
      );
  }

  logout(): void {
    this.clearTokens();
    this.currentUser.set(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<TokenResponse> {
    const refresh = this.getRefreshToken();
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/refresh/`, { refresh })
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

  private loadCurrentUser(): void {
    this.http.get<User>(`${environment.apiUrl}/auth/profile/`)
      .subscribe({
        next: (user) => {
          this.currentUser.set(user);
          this.isAuthenticatedSubject.next(true);
        },
        error: () => {
          this.logout();
        }
      });
  }
}
