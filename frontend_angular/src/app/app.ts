import { Component, inject, signal, effect } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
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
    
    // Show layout on all routes
    this.showLayout.set(true);
  }
}
