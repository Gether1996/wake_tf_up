import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ButtonComponent } from '../../../shared/button/button.component';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-2">{{ 'auth.login.title' | transloco }}</h1>
          <p class="text-muted-foreground">{{ 'auth.login.subtitle' | transloco }}</p>
        </div>

        <div class="border border-border p-8">
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
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  registerLink = computed(() => `/${this.currentLang()}/auth/register`);

  loading = signal(false);
  error = signal('');

  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
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
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Invalid email or password');
        this.loading.set(false);
      }
    });
  }
}
