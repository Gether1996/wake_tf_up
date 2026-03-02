import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { NotificationContainerComponent } from './shared/notification-container/notification-container.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { CookieConsentComponent } from './shared/cookie-consent/cookie-consent.component';
import { NewsletterPopupComponent } from './shared/newsletter-popup/newsletter-popup.component';
import { ThemeService } from './core/services/theme.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent, NotificationContainerComponent, ConfirmDialogComponent, CookieConsentComponent, NewsletterPopupComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private themeService = inject(ThemeService);
  private router = inject(Router);
  
  showLayout = signal(false); // Default to false for Coming Soon
  
  constructor() {
    // Initialize theme
    this.themeService.initTheme();
    
    // Hide layout - everything goes to Coming Soon now
    this.showLayout.set(false);
    
    // Monitor route changes (in case we need it later)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Always hide layout since all routes go to Coming Soon
      this.showLayout.set(false);
    });
  }
}
