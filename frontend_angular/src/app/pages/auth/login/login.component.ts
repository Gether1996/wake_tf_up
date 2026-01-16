import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ButtonComponent } from '../../../shared/button/button.component';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-2">{{ 'auth.login.title' | transloco }}</h1>
          <p class="text-muted-foreground">{{ 'auth.login.subtitle' | transloco }}</p>
        </div>

        <div class="border border-border p-8">
          <!-- Verification Success Message -->
          @if (showVerifiedMessage()) {
            <div class="bg-green-500/10 border border-green-500 text-green-700 dark:text-green-400 px-4 py-3 mb-6 text-sm">
              {{ 'auth.login.email_verified' | transloco }}
            </div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <!-- Email -->
            <div class="mb-4">
              <label class="block text-sm font-mono uppercase mb-2" for="email">
                {{ 'auth.login.email' | transloco }}
              </label>
              <input
                type="email"
                id="email"
                formControlName="email"
                class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                [class.border-danger]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                placeholder="your@email.com">
              @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <p class="text-sm text-danger mt-1">{{ 'auth.login.email_invalid' | transloco }}</p>
              }
            </div>

            <!-- Password -->
            <div class="mb-6">
              <label class="block text-sm font-mono uppercase mb-2" for="password">
                {{ 'auth.login.password' | transloco }}
              </label>
              <input
                type="password"
                id="password"
                formControlName="password"
                class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                [class.border-danger]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                placeholder="••••••••">
            </div>

            <!-- Forgot Password Link -->
            <div class="text-right mb-4">
              <button
                type="button"
                (click)="showForgotPassword.set(!showForgotPassword())"
                class="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {{ 'auth.login.forgot_password' | transloco }}
              </button>
            </div>

            <!-- Forgot Password Form -->
            @if (showForgotPassword()) {
              <div class="mb-4 p-4 border border-border bg-gray-50 dark:bg-gray-800">
                <p class="text-sm text-muted-foreground mb-3">
                  {{ 'auth.login.forgot_password_description' | transloco }}
                </p>
                @if (resetEmailSent()) {
                  <div class="text-green-600 dark:text-green-400 text-sm">
                    {{ 'auth.login.reset_email_sent' | transloco }}
                  </div>
                } @else {
                  <div class="flex gap-2">
                    <input
                      type="email"
                      [(ngModel)]="resetEmail"
                      [ngModelOptions]="{standalone: true}"
                      placeholder="{{ 'auth.login.email' | transloco }}"
                      class="flex-1 px-3 py-2 border border-border bg-background text-sm focus:border-foreground focus:outline-none">
                    <button
                      type="button"
                      (click)="sendResetEmail()"
                      [disabled]="!resetEmail || sendingResetEmail()"
                      class="px-4 py-2 text-sm bg-foreground text-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      @if (sendingResetEmail()) {
                        {{ 'common.loading' | transloco }}
                      } @else {
                        {{ 'common.send' | transloco }}
                      }
                    </button>
                  </div>
                  @if (resetEmailError()) {
                    <p class="text-sm text-danger mt-2">{{ resetEmailError() }}</p>
                  }
                }
              </div>
            }

            <!-- Error Message -->
            @if (error()) {
              <div class="bg-danger/10 border border-danger text-danger px-4 py-3 mb-4 text-sm">
                {{ error() }}
                
                <!-- Resend Verification Email -->
                @if (showEmailNotVerified()) {
                  <div class="mt-4 pt-4 border-t border-danger/20">
                    @if (resendSuccess()) {
                      <div class="text-green-600 dark:text-green-400 text-sm">
                        {{ 'auth.login.resend_success' | transloco }}
                      </div>
                    } @else {
                      <p class="text-sm mb-2">{{ 'auth.login.no_email' | transloco }}</p>
                      <button
                        type="button"
                        (click)="resendVerificationEmail()"
                        [disabled]="resendingEmail()"
                        class="px-4 py-2 text-sm border border-danger hover:bg-danger hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        @if (resendingEmail()) {
                          {{ 'common.loading' | transloco }}
                        } @else {
                          {{ 'auth.login.resend_button' | transloco }}
                        }
                      </button>
                    }
                  </div>
                }
              </div>
            }

            <!-- Submit Button -->
            <app-button 
              [variant]="'primary'"
              [size]="'lg'"
              [fullWidth]="true"
              [loading]="loading()"
              [disabled]="loginForm.invalid"
              type="submit">
              {{ 'auth.login.submit' | transloco }}
            </app-button>
          </form>

          <!-- Register Link -->
          <div class="mt-6 text-center text-sm">
            <span class="text-muted-foreground">{{ 'auth.login.noAccount' | transloco }}</span>
            <a [routerLink]="registerLink()" class="ml-2 text-foreground hover:text-accent font-medium">
              {{ 'auth.login.register' | transloco }}
            </a>
          </div>
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
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  registerLink = computed(() => `/${this.currentLang()}/auth/register`);

  loading = signal(false);
  error = signal('');
  showVerifiedMessage = signal(false);
  showEmailNotVerified = signal(false);
  unverifiedEmail = signal('');
  resendingEmail = signal(false);
  resendSuccess = signal(false);
  showForgotPassword = signal(false);
  resetEmail = '';
  sendingResetEmail = signal(false);
  resetEmailSent = signal(false);
  resetEmailError = signal('');

  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Check if user was redirected from email verification
    this.route.queryParamMap.subscribe(params => {
      if (params.get('verified') === 'true') {
        this.showVerifiedMessage.set(true);
      }
    });
  }

  onSubmit() {
    if (this.loginForm.invalid || this.loading()) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        const lang = this.languageService.currentLang();
        this.router.navigate([`/${lang}/profile`]);
      },
      error: (err) => {
        console.log('Login error:', err); // Debug
        
        // Check for specific error types
        const errorDetail = err.error?.detail;
        const errorMessage = err.error?.message;
        const nonFieldErrors = err.error?.non_field_errors;
        
        // Combine all possible error sources
        let errorText = '';
        
        if (errorDetail && typeof errorDetail === 'string') {
          errorText = errorDetail;
        } else if (Array.isArray(errorDetail) && errorDetail.length > 0) {
          errorText = errorDetail[0];
        } else if (Array.isArray(nonFieldErrors) && nonFieldErrors.length > 0) {
          errorText = nonFieldErrors[0];
        } else if (errorMessage) {
          errorText = errorMessage;
        } else {
          errorText = 'Invalid email or password';
        }
        
        // Check if it's an email verification error
        if (errorText.toLowerCase().includes('verify your email') || 
            errorText.toLowerCase().includes('verify') && errorText.toLowerCase().includes('email')) {
          this.error.set(errorText);
          this.showEmailNotVerified.set(true);
          this.unverifiedEmail.set(this.loginForm.get('email')?.value || '');
        } else {
          this.error.set(errorText);
          this.showEmailNotVerified.set(false);
        }
        
        this.loading.set(false);
      }
    });
  }

  resendVerificationEmail() {
    if (!this.unverifiedEmail() || this.resendingEmail()) return;

    this.resendingEmail.set(true);
    this.resendSuccess.set(false);

    this.authService.resendVerificationEmail(this.unverifiedEmail()).subscribe({
      next: () => {
        this.resendSuccess.set(true);
        this.resendingEmail.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to resend email');
        this.resendingEmail.set(false);
      }
    });
  }

  sendResetEmail() {
    if (!this.resetEmail || this.sendingResetEmail()) return;

    console.log('Sending password reset email to:', this.resetEmail);
    this.sendingResetEmail.set(true);
    this.resetEmailError.set('');

    this.authService.requestPasswordReset(this.resetEmail).subscribe({
      next: (response) => {
        console.log('Password reset email sent successfully:', response);
        this.resetEmailSent.set(true);
        this.sendingResetEmail.set(false);
      },
      error: (err) => {
        console.error('Failed to send password reset email:', err);
        this.resetEmailError.set(err.error?.error || 'Failed to send reset email');
        this.sendingResetEmail.set(false);
      }
    });
  }
}
