import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // Clone request and add authorization header if token exists
  if (token && !req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 Unauthorized and not already trying to login/refresh
      if (error.status === 401 && 
          !req.url.includes('/auth/refresh') && 
          !req.url.includes('/auth/login') &&
          authService.getAccessToken()) {
        console.log('[Interceptor] 401 error, attempting token refresh');
        return authService.refreshToken().pipe(
          switchMap(() => {
            console.log('[Interceptor] Token refreshed, retrying request');
            // Retry original request with new token
            const newToken = authService.getAccessToken();
            const clonedReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`
              }
            });
            return next(clonedReq);
          }),
          catchError((refreshError) => {
            console.error('[Interceptor] Token refresh failed:', refreshError);
            // Don't call logout here - just return error
            // Let the component handle it
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
