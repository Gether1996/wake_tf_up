import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private readonly THEME_KEY = 'theme';
  private currentTheme = signal<Theme>(this.getInitialTheme());

  theme = this.currentTheme.asReadonly();
  isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    this.applyTheme(this.currentTheme());
  }

  initTheme() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Re-apply theme in case it wasn't applied during SSR
    this.applyTheme(this.currentTheme());
  }

  toggleTheme() {
    const newTheme: Theme = this.isDark() ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.THEME_KEY, theme);
    }
  }

  private getInitialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light';
    }
    
    const stored = localStorage.getItem(this.THEME_KEY) as Theme;
    if (stored && (stored === 'light' || stored === 'dark')) {
      return stored;
    }
    
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }
}
