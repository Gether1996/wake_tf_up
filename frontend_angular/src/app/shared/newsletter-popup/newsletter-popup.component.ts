import { Component, signal, inject, effect } from '@angular/core';
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
export class NewsletterPopupComponent {
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
  
  private readonly STORAGE_KEY = 'newsletterPopupShown';
  private popupTimerStarted = false;

  constructor() {
    // Watch for settings changes and show popup when ready
    effect(() => {
      const settings = this.settingsService.settings();
      if (settings && !this.popupTimerStarted) {
        this.checkAndShowPopup();
        this.popupTimerStarted = true;
      }
    });
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

    // Get delay from settings (in seconds)
    const delaySeconds = settings.newsletter_popup_delay || 300;
    const delayMs = delaySeconds * 1000;

    // Show popup after delay
    setTimeout(() => {
      this.isVisible.set(true);
      sessionStorage.setItem(this.STORAGE_KEY, 'true');
      
      // Track that popup was shown
      this.newsletterService.trackPopupInteraction({
        action: 'shown'
      }).subscribe();
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
        // Track subscription (email not needed, already in subscriber table)
        this.newsletterService.trackPopupInteraction({
          action: 'subscribed'
        }).subscribe();

        this.notificationService.success(
          this.translocoService.translate('newsletter_popup.subscribed_success')
        );
        this.close(true, false); // permanent=true, trackDismiss=false
      },
      error: (error) => {
        this.notificationService.error(
          this.translocoService.translate('newsletter_popup.subscription_error')
        );
        this.isSubmitting.set(false);
      }
    });
  }

  close(permanent: boolean = false, trackDismiss: boolean = true) {
    this.isVisible.set(false);
    
    // Track dismissal only if user didn't subscribe
    if (trackDismiss) {
      this.newsletterService.trackPopupInteraction({
        action: 'dismissed'
      }).subscribe();
    }
    
    // Store permanently dismissed status
    if (permanent) {
      localStorage.setItem(this.STORAGE_KEY, 'true');
    }
  }
}
