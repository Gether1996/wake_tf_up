import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';


function isAuthRequest(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/token/refresh');
}

function isPublicAnonymousSafeRequest(url: string, method: string): boolean {
  if (method !== 'GET') {
    return false;
  }

  return [
    '/products/',
    '/categories/',
    '/colors/',
    '/tickets/',
    '/blog/',
    '/events/',
    '/settings/',
  ].some((segment) => url.includes(segment));
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Auth now lives in httpOnly cookies (see AuthService) rather than a
  // Bearer header, so the browser attaches it automatically — we just need
  // to make sure cookies are actually sent/received on API requests.
  const isApiRequest = req.url.includes('/api/');
  if (isApiRequest) {
    req = req.clone({ withCredentials: true });

    // Angular's built-in XSRF interceptor skips absolute URLs (dev mode's
    // environment.apiUrl is absolute, e.g. http://localhost:8000/...), so it
    // never attaches X-CSRFToken there. Attach it ourselves so CSRF-checked
    // mutating requests work in both dev (absolute URL) and prod (relative).
    if (UNSAFE_METHODS.has(req.method) && !req.headers.has('X-CSRFToken')) {
      const csrfToken = readCookie('csrftoken');
      if (csrfToken) {
        req = req.clone({ setHeaders: { 'X-CSRFToken': csrfToken } });
      }
    }
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isRefreshRequest = req.url.includes('/auth/token/refresh');
      if (
        error.status === 401 &&
        isApiRequest &&
        !isRefreshRequest &&
        !isAuthRequest(req.url)
      ) {
        return authService.refreshToken().pipe(
          switchMap(() => next(req)),
          catchError((refreshError) => {
            // Wait for the backend to actually drop the (invalid) cookies
            // before retrying — otherwise the retry would just send the
            // same stale cookie and 401 again.
            return authService.clearAuthState().pipe(
              switchMap(() => {
                if (isPublicAnonymousSafeRequest(req.url, req.method)) {
                  return next(req);
                }
                return throwError(() => refreshError);
              }),
            );
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
