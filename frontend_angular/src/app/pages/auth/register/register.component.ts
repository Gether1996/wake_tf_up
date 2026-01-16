import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ButtonComponent } from '../../../shared/button/button.component';

@Component({
  selector: 'app-register',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-3xl">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-2">{{ 'auth.register.title' | transloco }}</h1>
          <p class="text-muted-foreground">{{ 'auth.register.subtitle' | transloco }}</p>
        </div>

        <!-- Success Message -->
        @if (success()) {
          <div class="border border-border p-8 text-center">
            <div class="mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mx-auto text-green-500">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold mb-4">{{ 'auth.register.success_title' | transloco }}</h2>
            <p class="text-muted-foreground mb-2">{{ 'auth.register.success_message' | transloco }}</p>
            <p class="font-mono text-sm mb-6">{{ registeredEmail() }}</p>
            <p class="text-sm text-muted-foreground mb-8">{{ 'auth.register.success_instructions' | transloco }}</p>
            <a 
              [routerLink]="loginLink()" 
              class="inline-block px-6 py-3 border border-foreground hover:bg-foreground hover:text-background transition-colors font-mono uppercase text-sm">
              {{ 'auth.register.go_to_login' | transloco }}
            </a>
          </div>
        } @else {
          <div class="border border-border p-8">
            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <!-- Required Section -->
            <div class="mb-8">
              <h2 class="text-sm font-mono uppercase mb-4 text-foreground">
                {{ 'auth.register.required_section' | transloco }}
              </h2>

              <!-- Email -->
              <div class="mb-4">
                <label class="block text-sm font-mono uppercase mb-2" for="email">
                  {{ 'auth.register.email' | transloco }}
                </label>
                <input
                  type="email"
                  id="email"
                  formControlName="email"
                  autocomplete="off"
                  class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                  [class.border-danger]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
                  placeholder="your@email.com">
                @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                  <p class="text-sm text-danger mt-1">{{ 'auth.register.email_invalid' | transloco }}</p>
                }
              </div>

              <!-- Password -->
              <div class="mb-4">
                <label class="block text-sm font-mono uppercase mb-2" for="password">
                  {{ 'auth.register.password' | transloco }}
                </label>
                <div class="relative">
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    id="password"
                    formControlName="password"
                    autocomplete="new-password"
                    class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors pr-12"
                    [class.border-danger]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
                    placeholder="••••••••">
                  <button
                    type="button"
                    (click)="showPassword.set(!showPassword())"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    [attr.aria-label]="showPassword() ? ('auth.register.hide_password' | transloco) : ('auth.register.show_password' | transloco)">
                    @if (showPassword()) {
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    }
                  </button>
                </div>
                @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                  <p class="text-sm text-danger mt-1">{{ 'auth.register.password_min' | transloco }}</p>
                }
              </div>

              <!-- Confirm Password -->
              <div class="mb-4">
                <label class="block text-sm font-mono uppercase mb-2" for="confirmPassword">
                  {{ 'auth.register.confirmPassword' | transloco }}
                </label>
                <div class="relative">
                  <input
                    [type]="showConfirmPassword() ? 'text' : 'password'"
                    id="confirmPassword"
                    formControlName="confirmPassword"
                    autocomplete="new-password"
                    class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors pr-12"
                    [class.border-danger]="passwordMismatch() && registerForm.get('confirmPassword')?.touched"
                    placeholder="••••••••">
                  <button
                    type="button"
                    (click)="showConfirmPassword.set(!showConfirmPassword())"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    [attr.aria-label]="showConfirmPassword() ? ('auth.register.hide_password' | transloco) : ('auth.register.show_password' | transloco)">
                    @if (showConfirmPassword()) {
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    }
                  </button>
                </div>
                @if (passwordMismatch() && registerForm.get('confirmPassword')?.touched) {
                  <p class="text-sm text-danger mt-1">{{ 'auth.register.password_mismatch' | transloco }}</p>
                }
              </div>
            </div>

            <!-- Optional Section -->
            <div class="mb-6 pb-6 border-t border-border pt-6">
              <h2 class="text-sm font-mono uppercase mb-4 text-muted-foreground">
                {{ 'auth.register.optional_section' | transloco }}
              </h2>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- First Name -->
                <div>
                  <label class="block text-sm font-mono uppercase mb-2 text-muted-foreground" for="first_name">
                    {{ 'auth.register.first_name' | transloco }}
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    formControlName="first_name"
                    class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                    placeholder="John">
                </div>

                <!-- Last Name -->
                <div>
                  <label class="block text-sm font-mono uppercase mb-2 text-muted-foreground" for="last_name">
                    {{ 'auth.register.last_name' | transloco }}
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    formControlName="last_name"
                    class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                    placeholder="Doe">
                </div>

                <!-- Phone -->
                <div>
                  <label class="block text-sm font-mono uppercase mb-2 text-muted-foreground" for="phone">
                    {{ 'auth.register.phone' | transloco }}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    formControlName="phone"
                    class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                    placeholder="+421 900 123 456">
                </div>

                <!-- Street -->
                <div>
                  <label class="block text-sm font-mono uppercase mb-2 text-muted-foreground" for="street">
                    {{ 'auth.register.street' | transloco }}
                  </label>
                  <input
                    type="text"
                    id="street"
                    formControlName="street"
                    class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                    placeholder="Main Street 123">
                </div>

                <!-- City -->
                <div>
                  <label class="block text-sm font-mono uppercase mb-2 text-muted-foreground" for="city">
                    {{ 'auth.register.city' | transloco }}
                  </label>
                  <input
                    type="text"
                    id="city"
                    formControlName="city"
                    class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                    placeholder="Bratislava">
                </div>

                <!-- Postal Code -->
                <div>
                  <label class="block text-sm font-mono uppercase mb-2 text-muted-foreground" for="postal_code">
                    {{ 'auth.register.postal_code' | transloco }}
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    formControlName="postal_code"
                    class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                    placeholder="81101">
                </div>

                <!-- Country -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-mono uppercase mb-2 text-muted-foreground" for="country">
                    {{ 'auth.register.country' | transloco }}
                  </label>
                  <input
                    type="text"
                    id="country"
                    formControlName="country"
                    class="w-full px-4 py-2 border border-border bg-background focus:border-foreground focus:outline-none transition-colors"
                    placeholder="Slovakia">
                </div>
              </div>
            </div>

            <!-- Error Message -->
            @if (error()) {
              <div class="bg-danger/10 border border-danger text-danger px-4 py-3 mb-4 text-sm">
                {{ error() }}
              </div>
            }

            <!-- Submit Button -->
            <app-button 
              [variant]="'primary'"
              [size]="'lg'"
              [fullWidth]="true"
              [loading]="loading()"
              [disabled]="registerForm.invalid || passwordMismatch()"
              type="submit">
              {{ 'auth.register.submit' | transloco }}
            </app-button>
          </form>

          <!-- Login Link -->
          <div class="mt-6 text-center text-sm">
            <span class="text-muted-foreground">{{ 'auth.register.hasAccount' | transloco }}</span>
            <a [routerLink]="loginLink()" class="ml-2 text-foreground hover:text-accent font-medium">
              {{ 'auth.register.login' | transloco }}
            </a>
          </div>
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  loginLink = computed(() => `/${this.currentLang()}/auth/login`);

  loading = signal(false);
  error = signal('');
  success = signal(false);
  registeredEmail = signal('');

  registerForm: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor() {
    this.registerForm = this.fb.group({
      // Required fields
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      // Optional fields
      first_name: [''],
      last_name: [''],
      phone: [''],
      street: [''],
      city: [''],
      postal_code: [''],
      country: ['']
    });
  }

  passwordMismatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    return password !== confirmPassword && !!confirmPassword;
  }

  onSubmit() {
    if (this.registerForm.invalid || this.loading() || this.passwordMismatch()) {
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const formValue = this.registerForm.value;
    
    const registerData = {
      email: formValue.email,
      password: formValue.password,
      password2: formValue.confirmPassword,
      ...(formValue.first_name && { first_name: formValue.first_name }),
      ...(formValue.last_name && { last_name: formValue.last_name }),
      ...(formValue.phone && { phone: formValue.phone }),
      ...(formValue.street && { street: formValue.street }),
      ...(formValue.city && { city: formValue.city }),
      ...(formValue.postal_code && { postal_code: formValue.postal_code }),
      ...(formValue.country && { country: formValue.country })
    };

    this.authService.register(registerData).subscribe({
      next: (response: any) => {
        this.success.set(true);
        this.registeredEmail.set(formValue.email);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
