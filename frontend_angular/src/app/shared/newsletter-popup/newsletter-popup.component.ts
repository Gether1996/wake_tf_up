import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { NewsletterService } from '../../core/api/newsletter.service';
import { SettingsService } from '../../core/api/settings.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-newsletter-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslocoModule],
  templateUrl: './newsletter-popup.component.html',
  styleUrls: ['./newsletter-popup.component.css']
})
export class NewsletterPopupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private newsletterService = inject(NewsletterService);
  private settingsService = inject(SettingsService);
  private notificationService = inject(NotificationService);
  private translocoService = inject(TranslocoService);
  
  isVisible = signal(false);
  isSubmitting = signal(false);
  
  subscribeForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });
  
  private sessionId: string = '';
  private readonly STORAGE_KEY = 'newsletterPopupShown';
  private readonly SESSION_ID_KEY = 'newsletterSessionId';

  ngOnInit() {
    this.sessionId = this.getOrCreateSessionId();
    this.checkAndShowPopup();
  }

  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem(this.SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem(this.SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkAndShowPopup() {
    const settings = this.settingsService.settings();
    
    // Check if settings are loaded
    if (!settings) {
      return;
    }
    
    // Check if popup is enabled (default to true if not set)
    if (settings.newsletter_popup_enabled === false) {
      return;
    }

    // Check if popup was already shown in this session
    const popupShown = sessionStorage.getItem(this.STORAGE_KEY);
    if (popupShown) {
      return;
    }

    // Check if user permanently dismissed it (stored in localStorage)
    const permanentlyDismissed = localStorage.getItem(this.STORAGE_KEY);
    if (permanentlyDismissed) {
      return;
    }

    // Get delay from settings (in minutes)
    const delayMinutes = settings.newsletter_popup_delay || 5;
    const delayMs = delayMinutes * 60 * 1000;

    // Show popup after delay
    setTimeout(() => {
      this.isVisible.set(true);
      sessionStorage.setItem(this.STORAGE_KEY, 'true');
    }, delayMs);
  }

  onSubmit() {
    if (this.subscribeForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    const email = this.subscribeForm.value.email!;

    // Subscribe to newsletter
    this.newsletterService.subscribe(email).subscribe({
      next: (response) => {
        // Track subscription
        this.newsletterService.trackPopupInteraction({
          session_id: this.sessionId,
          action: 'subscribed',
          email: email
        }).subscribe();

        this.notificationService.success(
          this.translocoService.translate('newsletter_popup.subscribed_success')
        );
        this.close(true);
      },
      error: (error) => {
        this.notificationService.error(
          this.translocoService.translate('newsletter_popup.subscription_error')
        );
        this.isSubmitting.set(false);
      }
    });
  }

  close(permanent: boolean = false) {
    // Track dismissal
    if (!permanent) {
      this.newsletterService.trackPopupInteraction({
        session_id: this.sessionId,
        action: 'dismissed'
      }).subscribe();
    }

    this.isVisible.set(false);
    
    // Store permanently dismissed status
    if (permanent) {
      localStorage.setItem(this.STORAGE_KEY, 'true');
    }
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('popup-backdrop')) {
      this.close(false);
    }
  }
}
