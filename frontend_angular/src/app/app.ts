import { Component, inject, signal, DestroyRef } from '@angular/core';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent, NotificationContainerComponent, ConfirmDialogComponent, CookieConsentComponent, NewsletterPopupComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  
  showLayout = signal(true);
  
  constructor() {
    // Initialize theme
    this.themeService.initTheme();
    
    // Monitor route changes - hide layout only on coming-soon page
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event: NavigationEnd) => {
      this.showLayout.set(!event.urlAfterRedirects.includes('coming-soon'));
    });
  }
}
