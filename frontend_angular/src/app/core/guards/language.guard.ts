import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { LanguageService } from '../services/language.service';

export const languageGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const languageService = inject(LanguageService);
  const router = inject(Router);
  
  const lang = route.paramMap.get('lang');
  
  // Validate language parameter
  if (lang !== 'en' && lang !== 'sk') {
    // Invalid language, redirect to English
    const currentPath = router.url.split('/').slice(2).join('/') || '';
    router.navigate(['/en', currentPath]);
    return false;
  }
  
  // Set the language from URL
  languageService.setLanguage(lang as 'en' | 'sk');
  
  return true;
};
