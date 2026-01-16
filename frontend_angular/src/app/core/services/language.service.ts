import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private translocoService = inject(TranslocoService);
  private router = inject(Router);
  
  // Use signal for reactive language state
  private _currentLang = signal<'en' | 'sk'>('en');
  readonly currentLang = this._currentLang.asReadonly();

  setLanguage(lang: 'en' | 'sk'): void {
    this._currentLang.set(lang);
    this.translocoService.setActiveLang(lang);
  }

  toggleLanguage(): void {
    const newLang = this._currentLang() === 'en' ? 'sk' : 'en';
    
    // Get current URL without language prefix
    const currentUrl = this.router.url;
    const urlParts = currentUrl.split('/').filter(p => p);
    
    // Remove current language from URL (first segment)
    if (urlParts.length > 0 && (urlParts[0] === 'en' || urlParts[0] === 'sk')) {
      urlParts.shift();
    }
    
    // Navigate to new language URL
    const newUrl = `/${newLang}${urlParts.length > 0 ? '/' + urlParts.join('/') : ''}`;
    this.router.navigateByUrl(newUrl);
  }
}
