import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, filter, take, map, of, BehaviorSubject } from 'rxjs';
import { User, LoginRequest, RegisterRequest, AuthActionResponse } from '../api/api.models';
import { environment } from '../../../environments/environment';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private profileRetryTimeout: ReturnType<typeof setTimeout> | null = null;

  private currentUser = signal<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  // Flips to true once the first profile check (success or definitive
  // 401/403) has resolved — lets guards wait out the async cookie-based
  // auth check on page reload instead of reading a synchronous token.
  private authReadySubject = new BehaviorSubject<boolean>(false);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isSeller = computed(() => this.currentUser()?.user_role === 'seller');
  readonly canAccessAdminPanel = computed(() => {
    const user = this.currentUser();
    return user?.is_staff === true || user?.is_superuser === true;
  });
  readonly isSuperuser = computed(() => this.currentUser()?.is_superuser === true);

  constructor(
    private http: HttpClient,
    private router: Router,
    private translocoService: TranslocoService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      // Auth now lives in an httpOnly cookie, invisible to JS, so we can't
      // check "is there a token" synchronously like before — just prime the
      // CSRF cookie and ask the backend whether we're logged in.
      this.http.get(`${environment.apiUrl}/auth/csrf/`).subscribe({ error: () => {} });
      setTimeout(() => this.loadCurrentUser(), 0);
    }
  }

  login(credentials: LoginRequest): Observable<AuthActionResponse> {
    return this.http.post<AuthActionResponse>(`${environment.apiUrl}/auth/login/`, credentials)
      .pipe(
        tap(() => {
          this.isAuthenticatedSubject.next(true);
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
    this.clearAuthState().subscribe(() => {
      // Clear cart and checkout data for security (prevent data leaking to next user)
      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.removeItem('checkout_data');
        localStorage.removeItem('cart'); // Clear cart directly to avoid circular dependency
      }

      const lang = this.translocoService.getActiveLang();
      this.router.navigate([`/${lang}/auth/login`]);
    });
  }

  /**
   * Clears local auth state and asks the backend to drop the httpOnly
   * cookies (JS can't clear them itself). Returns an Observable so callers
   * (e.g. the auth interceptor) can wait for the cookies to actually be
   * cleared before retrying a request — otherwise a stale cookie would just
   * cause the same 401 again.
   */
  clearAuthState(): Observable<unknown> {
    this.clearProfileRetry();
    this.currentUser.set(null);
    this.isAuthenticatedSubject.next(false);

    if (!isPlatformBrowser(this.platformId)) {
      return of(null);
    }
    return this.http.post(`${environment.apiUrl}/auth/logout/`, {}).pipe(
      catchError(() => of(null))
    );
  }

  refreshToken(): Observable<AuthActionResponse> {
    return this.http.post<AuthActionResponse>(`${environment.apiUrl}/auth/token/refresh/`, {});
  }

  private scheduleProfileRetry(): void {
    if (this.profileRetryTimeout) {
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
          this.authReadySubject.next(true);
          this.clearProfileRetry();
        },
        error: (err) => {
          if (err.status === 401 || err.status === 403) {
            this.currentUser.set(null);
            this.isAuthenticatedSubject.next(false);
            this.authReadySubject.next(true);
          } else {
            // Transient error (network/server) — we don't know the real auth
            // state yet, so retry rather than assuming logged-out.
            this.scheduleProfileRetry();
          }
        }
      });
  }

  /**
   * Resolves once the initial (or a since-triggered) auth check has
   * settled. Route guards use this instead of reading state synchronously,
   * since a cookie-based session can't be checked without a round trip.
   */
  waitUntilAuthChecked(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(this.isAuthenticated());
    }
    return this.authReadySubject.pipe(
      filter((ready) => ready),
      take(1),
      map(() => this.isAuthenticated())
    );
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
