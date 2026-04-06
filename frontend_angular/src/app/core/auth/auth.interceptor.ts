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


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();
  const hadAuthHeader = !!token && !isAuthRequest(req.url);

  if (hadAuthHeader) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isRefreshRequest = req.url.includes('/auth/token/refresh');
      if (
        error.status === 401 &&
        !isRefreshRequest &&
        !req.url.includes('/auth/login') &&
        authService.getAccessToken()
      ) {
        return authService.refreshToken().pipe(
          switchMap(() => {
            const newToken = authService.getAccessToken();
            const clonedReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            });
            return next(clonedReq);
          }),
          catchError((refreshError) => {
            authService.clearAuthState();

            if (hadAuthHeader && isPublicAnonymousSafeRequest(req.url, req.method)) {
              const anonymousReq = req.clone({
                headers: req.headers.delete('Authorization'),
              });
              return next(anonymousReq);
            }

            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
