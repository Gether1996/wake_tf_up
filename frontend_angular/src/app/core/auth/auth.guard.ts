import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import { LanguageService } from '../services/language.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const languageService = inject(LanguageService);

  const guestOrderAccessToken =
    route.routeConfig?.path === 'orders/:id'
      ? route.queryParamMap.get('access_token')
      : null;

  if (guestOrderAccessToken) return true;

  // Auth lives in an httpOnly cookie now, so there's no synchronous "do we
  // have a token" check anymore — wait for the async profile check (already
  // in flight from AuthService's constructor) to settle instead.
  return authService.waitUntilAuthChecked().pipe(
    map((isAuthenticated) => {
      if (isAuthenticated) return true;

      const lang = languageService.currentLang();
      router.navigate(['/', lang, 'auth', 'login'], { queryParams: { returnUrl: state.url } });
      return false;
    })
  );
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) return true;

  const languageService = inject(LanguageService);
  const lang = languageService.currentLang();

  router.navigate([`/${lang}`]);
  return false;
};
