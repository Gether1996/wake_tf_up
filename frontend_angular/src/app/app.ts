import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { NotificationContainerComponent } from './shared/notification-container/notification-container.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { CookieConsentComponent } from './shared/cookie-consent/cookie-consent.component';
import { NewsletterPopupComponent } from './shared/newsletter-popup/newsletter-popup.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, NotificationContainerComponent, ConfirmDialogComponent, CookieConsentComponent, NewsletterPopupComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private themeService = inject(ThemeService);
  
  constructor() {
    // Initialize theme
    this.themeService.initTheme();
  }
}
