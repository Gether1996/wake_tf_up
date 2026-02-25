import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterModule, TranslocoModule],
  template: `
    <div class="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="border border-border p-8 text-center">
          @if (loading()) {
            <!-- Loading State -->
            <div class="mb-6">
              <svg class="animate-spin h-16 w-16 mx-auto text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 class="text-2xl font-bold mb-4">{{ 'auth.verify.verifying' | transloco }}</h2>
            <p class="text-muted-foreground">{{ 'auth.verify.please_wait' | transloco }}</p>
          } @else if (success()) {
            <!-- Success State -->
            <div class="mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mx-auto text-green-500">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold mb-4">{{ 'auth.verify.success_title' | transloco }}</h2>
            <p class="text-muted-foreground mb-8">{{ 'auth.verify.success_message' | transloco }}</p>
            <a 
              [routerLink]="loginLink()" 
              [queryParams]="{verified: 'true'}"
              style="font-family: 'Shlop', sans-serif;"
              class="inline-block px-6 py-3 border border-foreground hover:bg-foreground hover:text-background transition-colors uppercase text-sm">
              {{ 'auth.verify.go_to_login' | transloco }}
            </a>
          } @else if (error()) {
            <!-- Error State -->
            <div class="mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mx-auto text-danger">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold mb-4">{{ 'auth.verify.error_title' | transloco }}</h2>
            <p class="text-muted-foreground mb-8">{{ error() }}</p>
            <a 
              [routerLink]="registerLink()" 
              style="font-family: 'Shlop', sans-serif;"
              class="inline-block px-6 py-3 border border-foreground hover:bg-foreground hover:text-background transition-colors uppercase text-sm">
              {{ 'auth.verify.go_to_register' | transloco }}
            </a>
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
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  loginLink = computed(() => `/${this.currentLang()}/auth/login`);
  registerLink = computed(() => `/${this.currentLang()}/auth/register`);

  loading = signal(true);
  success = signal(false);
  error = signal('');

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    
    if (!token) {
      this.loading.set(false);
      this.error.set('Invalid verification link');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Verification failed. The link may be invalid or expired.');
      }
    });
  }
}
