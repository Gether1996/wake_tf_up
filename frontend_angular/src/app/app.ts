import { Component, inject, signal, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { NotificationContainerComponent } from './shared/notification-container/notification-container.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { CookieConsentComponent } from './shared/cookie-consent/cookie-consent.component';
import { NewsletterPopupComponent } from './shared/newsletter-popup/newsletter-popup.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent, NotificationContainerComponent, ConfirmDialogComponent, CookieConsentComponent, NewsletterPopupComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private themeService = inject(ThemeService);
  private router = inject(Router);
  
  showLayout = signal(true);
  
  constructor() {
    // Initialize theme
    this.themeService.initTheme();
    
    // Check current route on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.showLayout.set(!event.url.includes('/demo-login'));
    });
    
    // Check initial route
    this.showLayout.set(!this.router.url.includes('/demo-login'));
  }
}
