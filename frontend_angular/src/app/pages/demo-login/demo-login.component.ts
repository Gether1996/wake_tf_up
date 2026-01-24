import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-demo-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background px-4">
      <div class="max-w-md w-full">
        <div class="bg-muted rounded-lg shadow-lg p-8">
          <!-- Logo/Title -->
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold mb-2">Wake TF Up</h1>
            <p class="text-muted-foreground">Demo Access - Admin Only</p>
          </div>

          <!-- Error Message -->
          @if (error()) {
            <div class="bg-danger/10 border border-danger text-danger rounded-lg p-4 mb-6">
              {{ error() }}
            </div>
          }

          <!-- Login Form -->
          <form (ngSubmit)="login()" class="space-y-6">
            <!-- Email -->
            <div>
              <label class="block text-sm font-medium mb-2">
                Email
              </label>
              <input 
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                placeholder="admin@example.com"
                class="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                [disabled]="loading()">
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium mb-2">
                Password
              </label>
              <div class="relative">
                <input 
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  class="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent pr-12"
                  [disabled]="loading()">
                <button
                  type="button"
                  (click)="togglePassword()"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  [disabled]="loading()">
                  @if (showPassword()) {
                    👁️
                  } @else {
                    👁️‍🗨️
                  }
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <app-button 
              [variant]="'primary'" 
              [fullWidth]="true"
              [size]="'lg'"
              [disabled]="loading() || !email || !password"
              type="submit">
              @if (loading()) {
                Authenticating...
              } @else {
                Access Demo
              }
            </app-button>
          </form>

          <!-- Footer -->
          <div class="mt-6 text-center text-sm text-muted-foreground">
            <p>This is a temporary access control for demo purposes.</p>
            <p class="mt-1">Only administrators are allowed.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
    }
  `]
})
export class DemoLoginComponent {
  private api = inject(ApiService);
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  login() {
    if (!this.email || !this.password) {
      this.error.set('Please enter email and password');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.api.post('accounts/demo/login/', {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response: any) => {
        // Store tokens
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
        localStorage.setItem('demo_access', 'true');
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Redirect to home
        this.router.navigate(['/en']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.error?.error || 'Authentication failed. Please check your credentials.'
        );
        this.password = '';
      }
    });
  }
}
