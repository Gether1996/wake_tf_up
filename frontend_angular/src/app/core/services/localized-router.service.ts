import { Injectable, inject } from '@angular/core';
import { LanguageService } from './language.service';

@Injectable({
  providedIn: 'root'
})
export class LocalizedRouterService {
  private languageService = inject(LanguageService);

  getLocalizedPath(path: string): string {
    const lang = this.languageService.currentLang();
    return `/${lang}${path.startsWith('/') ? path : '/' + path}`;
  }
}
