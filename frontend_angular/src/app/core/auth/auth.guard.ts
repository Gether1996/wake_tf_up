import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LanguageService } from '../services/language.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const hasUser = authService.isAuthenticated();
  const hasToken = !!authService.getAccessToken();

  if (hasUser || hasToken) return true;

  const languageService = inject(LanguageService);
  const lang = languageService.currentLang();

  router.navigate(['/', lang, 'auth', 'login'], { queryParams: { returnUrl: state.url } });
  return false;
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