import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SettingsService } from '../../core/api/settings.service';
import { LanguageService } from '../../core/services/language.service';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, RouterModule, TranslocoModule, FormsModule, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-12 max-w-5xl">
      <!-- Hero Section -->
      <div class="text-center mb-16">
        <h1 class="text-4xl md:text-5xl font-bold mb-6">{{ 'contact.title' | transloco }}</h1>
        <p class="text-xl text-muted-foreground">
          {{ 'contact.subtitle' | transloco }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
        <!-- Contact Information -->
        <div>
          <h2 class="text-2xl font-bold mb-8">{{ 'contact.info_title' | transloco }}</h2>
          
          <div class="space-y-6">
            <!-- Company Name -->
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 flex items-center justify-center border border-border flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 class="font-bold mb-1">{{ 'contact.company' | transloco }}</h3>
                <p class="text-muted-foreground">{{ ownerName() }}</p>
              </div>
            </div>

            <!-- Address -->
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 flex items-center justify-center border border-border flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 class="font-bold mb-1">{{ 'contact.address' | transloco }}</h3>
                <p class="text-muted-foreground">{{ address() }}</p>
                <p class="text-muted-foreground">{{ country() }}</p>
              </div>
            </div>

            <!-- Email -->
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 flex items-center justify-center border border-border flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 class="font-bold mb-1">{{ 'contact.email' | transloco }}</h3>
                <a [href]="'mailto:' + contactEmail()" class="text-accent hover:underline">{{ contactEmail() }}</a>
              </div>
            </div>

            <!-- Phone -->
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 flex items-center justify-center border border-border flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 class="font-bold mb-1">{{ 'contact.phone' | transloco }}</h3>
                <a [href]="'tel:' + phone()" class="text-accent hover:underline">{{ phone() }}</a>
              </div>
            </div>

            <!-- Company Details -->
            <div class="pt-4 border-t border-border">
              <p class="text-sm text-muted-foreground font-mono">
                <strong>{{ 'footer.company_id' | transloco: { id: companyId() } }}</strong>
              </p>
              <p class="text-sm text-muted-foreground font-mono">
                <strong>{{ 'footer.company_tax_id' | transloco: { taxId: taxId() } }}</strong>
              </p>
            </div>
          </div>
        </div>

        <!-- Contact Form -->
        <div>
          <h2 class="text-2xl font-bold mb-8">{{ 'contact.form_title' | transloco }}</h2>
          
          @if (submitted()) {
            <div class="p-6 bg-success/10 border border-success text-success">
              <div class="flex items-center gap-3 mb-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <p class="font-bold">{{ 'contact.success_title' | transloco }}</p>
              </div>
              <p class="text-sm">{{ 'contact.success_message' | transloco }}</p>
            </div>
          } @else {
            <form (ngSubmit)="submitForm()" class="space-y-6">
              <!-- Name -->
              <div>
                <label for="name" class="block text-sm font-medium mb-2">
                  {{ 'contact.form.name' | transloco }} *
                </label>
                <input 
                  type="text" 
                  id="name"
                  [(ngModel)]="formData.name"
                  name="name"
                  required
                  class="w-full px-4 py-3 bg-background border border-border focus:outline-none focus:border-foreground font-mono text-sm"
                  [placeholder]="'contact.form.name_placeholder' | transloco">
              </div>

              <!-- Email -->
              <div>
                <label for="email" class="block text-sm font-medium mb-2">
                  {{ 'contact.form.email' | transloco }} *
                </label>
                <input 
                  type="email" 
                  id="email"
                  [(ngModel)]="formData.email"
                  name="email"
                  required
                  class="w-full px-4 py-3 bg-background border border-border focus:outline-none focus:border-foreground font-mono text-sm"
                  [placeholder]="'contact.form.email_placeholder' | transloco">
              </div>

              <!-- Message -->
              <div>
                <label for="message" class="block text-sm font-medium mb-2">
                  {{ 'contact.form.message' | transloco }} *
                </label>
                <textarea 
                  id="message"
                  [(ngModel)]="formData.message"
                  name="message"
                  rows="6"
                  required
                  class="w-full px-4 py-3 bg-background border border-border focus:outline-none focus:border-foreground font-mono text-sm resize-none"
                  [placeholder]="'contact.form.message_placeholder' | transloco"></textarea>
                <p class="text-xs text-muted-foreground mt-1 font-mono">
                  {{ formData.message.length }} / 5000
                </p>
              </div>

              @if (error()) {
                <div class="p-3 bg-danger/10 border border-danger text-danger text-sm font-mono">
                  {{ error() }}
                </div>
              }

              <app-button 
                type="submit"
                [variant]="'primary'"
                [size]="'lg'"
                [fullWidth]="true"
                [loading]="loading()"
                [disabled]="!formData.name || !formData.email || !formData.message || loading()">
                {{ 'contact.form.submit' | transloco }}
              </app-button>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ContactComponent {
  private http = inject(HttpClient);
  private settingsService = inject(SettingsService);
  private languageService = inject(LanguageService);

  // Company info from settings
  contactEmail = this.settingsService.contactEmail;
  phone = this.settingsService.phone;
  address = this.settingsService.address;
  country = this.settingsService.country;
  ownerName = this.settingsService.ownerName;
  companyId = this.settingsService.companyId;
  taxId = this.settingsService.taxId;

  // Form state
  formData = {
    name: '',
    email: '',
    message: ''
  };
  
  loading = signal(false);
  error = signal('');
  submitted = signal(false);

  submitForm() {
    if (!this.formData.name || !this.formData.email || !this.formData.message) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.http.post(`${environment.apiUrl}/contact/`, {
      name: this.formData.name,
      email: this.formData.email,
      message: this.formData.message
    }).subscribe({
      next: () => {
        this.submitted.set(true);
        this.loading.set(false);
        this.formData = { name: '', email: '', message: '' };
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to send message. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
