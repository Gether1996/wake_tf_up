import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 uppercase tracking-wider">
          WAKE TF UP
        </h2>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          @if (loading()) {
            <!-- Loading State -->
            <div class="text-center">
              <svg class="animate-spin h-12 w-12 mx-auto text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h3 class="mt-4 text-lg font-medium text-gray-900 uppercase tracking-wide">
                {{ 'auth.reset_password.validating' | transloco }}
              </h3>
              <p class="mt-2 text-sm text-gray-600">
                {{ 'auth.reset_password.please_wait' | transloco }}
              </p>
            </div>
          } @else if (success()) {
            <!-- Success State -->
            <div class="text-center">
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 class="mt-4 text-lg font-medium text-gray-900 uppercase tracking-wide">
                {{ 'auth.reset_password.success_title' | transloco }}
              </h3>
              <p class="mt-2 text-sm text-gray-600">
                {{ 'auth.reset_password.success_message' | transloco }}
              </p>
              <div class="mt-6">
                <a [routerLink]="['/' + currentLang() + '/auth/login']"
                   class="w-full flex justify-center py-3 px-4 border border-black text-sm font-bold uppercase tracking-widest text-black bg-white hover:bg-black hover:text-white transition-colors">
                  {{ 'auth.reset_password.go_to_login' | transloco }}
                </a>
              </div>
            </div>
          } @else if (error()) {
            <!-- Error State -->
            <div class="text-center">
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h3 class="mt-4 text-lg font-medium text-gray-900 uppercase tracking-wide">
                {{ 'auth.reset_password.error_title' | transloco }}
              </h3>
              <p class="mt-2 text-sm text-gray-600">
                {{ errorMessage() }}
              </p>
              <div class="mt-6 space-y-3">
                <a [routerLink]="['/' + currentLang() + '/auth/login']"
                   class="w-full flex justify-center py-3 px-4 border border-black text-sm font-bold uppercase tracking-widest text-black bg-white hover:bg-black hover:text-white transition-colors">
                  {{ 'auth.reset_password.go_to_login' | transloco }}
                </a>
                <a [routerLink]="['/' + currentLang() + '/auth/register']"
                   class="w-full flex justify-center py-3 px-4 text-sm font-medium text-gray-600 hover:text-gray-900">
                  {{ 'auth.reset_password.go_to_register' | transloco }}
                </a>
              </div>
            </div>
          } @else {
            <!-- Reset Password Form -->
            <h3 class="text-xl font-bold text-gray-900 uppercase tracking-wide text-center mb-6">
              {{ 'auth.reset_password.title' | transloco }}
            </h3>
            <p class="text-sm text-gray-600 text-center mb-6">
              {{ 'auth.reset_password.subtitle' | transloco }}
            </p>

            <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
              <!-- Password Field -->
              <div class="mb-4">
                <label for="password" class="block text-sm font-medium text-gray-700 uppercase tracking-wide mb-1">
                  {{ 'auth.reset_password.password' | transloco }}
                </label>
                <input
                  type="password"
                  id="password"
                  formControlName="password"
                  class="appearance-none block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
                  [class.border-red-300]="resetForm.get('password')?.invalid && resetForm.get('password')?.touched"
                />
                @if (resetForm.get('password')?.invalid && resetForm.get('password')?.touched) {
                  <p class="mt-1 text-sm text-red-600">
                    {{ 'auth.reset_password.password_min_length' | transloco }}
                  </p>
                }
              </div>

              <!-- Confirm Password Field -->
              <div class="mb-6">
                <label for="confirmPassword" class="block text-sm font-medium text-gray-700 uppercase tracking-wide mb-1">
                  {{ 'auth.reset_password.confirm_password' | transloco }}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  formControlName="confirmPassword"
                  class="appearance-none block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
                  [class.border-red-300]="resetForm.errors?.['passwordMismatch'] && resetForm.get('confirmPassword')?.touched"
                />
                @if (resetForm.errors?.['passwordMismatch'] && resetForm.get('confirmPassword')?.touched) {
                  <p class="mt-1 text-sm text-red-600">
                    {{ 'auth.reset_password.passwords_not_match' | transloco }}
                  </p>
                }
              </div>

              <!-- Error Message -->
              @if (formError()) {
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p class="text-sm text-red-600">{{ formError() }}</p>
                </div>
              }

              <!-- Submit Button -->
              <button
                type="submit"
                [disabled]="resetForm.invalid || submitting()"
                class="w-full flex justify-center py-3 px-4 border border-black text-sm font-bold uppercase tracking-widest text-white bg-black hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                @if (submitting()) {
                  <svg class="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                } @else {
                  {{ 'auth.reset_password.submit' | transloco }}
                }
              </button>
            </form>

            <!-- Back to Login -->
            <div class="mt-6 text-center">
              <a [routerLink]="['/' + currentLang() + '/auth/login']" class="text-sm font-medium text-gray-600 hover:text-gray-900">
                {{ 'auth.reset_password.back_to_login' | transloco }}
              </a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  loading = signal(true);
  success = signal(false);
  error = signal(false);
  errorMessage = signal('');
  formError = signal('');
  submitting = signal(false);
  private token = '';
  currentLang = computed(() => this.translocoService.getActiveLang());

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private translocoService: TranslocoService
  ) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Get token from query params
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.error.set(true);
        this.errorMessage.set('Invalid or missing reset token.');
        this.loading.set(false);
      } else {
        // Token exists, show form
        this.loading.set(false);
      }
    });
  }

  passwordMatchValidator(group: FormGroup): { passwordMismatch: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token) {
      return;
    }

    this.submitting.set(true);
    this.formError.set('');

    const password = this.resetForm.get('password')?.value;

    this.authService.resetPassword(this.token, password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        const errorMessage = err.error?.error || err.error?.detail || 'An error occurred. Please try again.';
        this.formError.set(errorMessage);
      }
    });
  }
}
