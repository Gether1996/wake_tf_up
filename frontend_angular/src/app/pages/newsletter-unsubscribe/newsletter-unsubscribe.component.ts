import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-newsletter-unsubscribe',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background px-4">
      <div class="max-w-md w-full">
        <div class="bg-muted rounded-lg shadow-lg p-8">
          <!-- Success State -->
          @if (unsubscribed()) {
            <div class="text-center">
              <div class="mb-4">
                <svg class="w-16 h-16 mx-auto text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              
              <h1 class="text-2xl font-bold mb-2">Odhlásený zo newsletteru</h1>
              <p class="text-muted-foreground mb-6">
                Bol si úspešne odhlásený zo newsletteru. Už ti nebudeme posielať noviny a zľavy.
              </p>
              
              <a [routerLink]="['/en']" class="block">
                <button class="w-full bg-accent text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                  Späť na domovskú stránku
                </button>
              </a>
            </div>
          }
          
          <!-- Loading State -->
          @if (!unsubscribed() && !error()) {
            <div class="text-center">
              <div class="mb-4">
                <div class="inline-block">
                  <div class="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div>
                </div>
              </div>
              <p class="text-muted-foreground">Odhlasovanie...</p>
            </div>
          }
          
          <!-- Error State -->
          @if (error()) {
            <div class="text-center">
              <div class="mb-4">
                <svg class="w-16 h-16 mx-auto text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              
              <h1 class="text-2xl font-bold mb-2 text-danger">Chyba pri odhlasovaní</h1>
              <p class="text-muted-foreground mb-4">
                {{ error() }}
              </p>
              
              <a [routerLink]="['/en']" class="block">
                <button class="w-full bg-accent text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                  Späť na domovskú stránku
                </button>
              </a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class NewsletterUnsubscribeComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  
  unsubscribed = signal(false);
  error = signal('');

  ngOnInit() {
    // Get email from query parameter
    this.route.queryParams.subscribe(params => {
      const email = params['email'];
      
      if (!email) {
        this.error.set('Email nie je zadaný.');
        return;
      }
      
      // Call unsubscribe API
      this.api.get(`newsletter/unsubscribe/?email=${email}`).subscribe({
        next: (response: any) => {
          this.unsubscribed.set(true);
        },
        error: (err) => {
          console.error('Unsubscribe error:', err);
          this.error.set(err.error?.error || err.error?.message || 'Nie je možné ťa odhlásiť z newsletteru. Skús to neskôr.');
        }
      });
    });
  }
}
