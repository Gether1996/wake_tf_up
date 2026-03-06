import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonComponent } from '../../shared/button/button.component';
import { NewsletterService } from '../../core/api/newsletter.service';
import { SettingsService } from '../../core/api/settings.service';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-between bg-background text-foreground overflow-hidden relative py-8">
      <!-- Animated background dots -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="dot" [style.left.%]="15" [style.top.%]="20" style="animation-delay: 0s;"></div>
        <div class="dot" [style.left.%]="85" [style.top.%]="15" style="animation-delay: 0.3s;"></div>
        <div class="dot" [style.left.%]="10" [style.top.%]="75" style="animation-delay: 0.6s;"></div>
        <div class="dot" [style.left.%]="90" [style.top.%]="80" style="animation-delay: 0.9s;"></div>
        <div class="dot" [style.left.%]="50" [style.top.%]="10" style="animation-delay: 1.2s;"></div>
        <div class="dot" [style.left.%]="30" [style.top.%]="50" style="animation-delay: 1.5s;"></div>
        <div class="dot" [style.left.%]="70" [style.top.%]="60" style="animation-delay: 1.8s;"></div>
      </div>

      <!-- Main content -->
      <div class="relative z-10 text-center px-4 max-w-4xl mx-auto flex-1 flex flex-col items-center justify-center">
        <!-- Brand text -->
        <h1 class="text-5xl md:text-7xl lg:text-8xl font-heading font-bold mb-8 tracking-tight">
          IT IS TIME TO WAKE TF UP
        </h1>

        <!-- Coming Soon Text -->
        <h2 class="text-3xl md:text-5xl font-heading mb-6 tracking-tight">
          <span class="text-gradient">COMING SOON</span>
        </h2>

        <!-- Subtitle -->
        <p class="text-xl md:text-2xl mb-12 text-muted-foreground font-mono uppercase tracking-wider">
          <span class="type-writer">{{ displayedText() }}</span>
          <span class="cursor-blink">_</span>
        </p>

        <!-- Animated loading bars -->
        <div class="max-w-md mx-auto mb-12 space-y-3 w-full">
          <div class="progress-bar">
            <div class="progress-fill" style="animation-delay: 0s; animation-duration: 2s;"></div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="animation-delay: 0.3s; animation-duration: 2.3s;"></div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="animation-delay: 0.6s; animation-duration: 2.6s;"></div>
          </div>
        </div>

        <!-- Social Media Links -->
        <div class="flex justify-center gap-6 items-center">
          @if (instagramUrl()) {
            <a 
              [href]="instagramUrl()" 
              target="_blank"
              rel="noopener noreferrer"
              class="social-link"
              title="Follow us on Instagram">
              <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          }
          
          @if (tiktokUrl()) {
            <a 
              [href]="tiktokUrl()" 
              target="_blank"
              rel="noopener noreferrer"
              class="social-link"
              title="Follow us on TikTok">
              <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </a>
          }
        </div>
      </div>

      <!-- Newsletter Section -->
      <div class="relative z-10 w-full max-w-md mx-auto px-4 pb-8">
        <div class="bg-muted/50 backdrop-blur-sm border border-border p-6 rounded-lg">
          <h3 class="text-sm uppercase tracking-wide mb-2 font-heading text-center">
            {{ 'footer.newsletter' | transloco }}
          </h3>
          <p class="text-xs text-muted-foreground mb-4 text-center font-mono">
            {{ 'newsletter.description' | transloco }}
          </p>
          
          @if (subscribed()) {
            <div class="p-3 bg-success/10 border border-success text-success text-sm font-mono text-center">
              {{ 'newsletter.success' | transloco }}
            </div>
          } @else {
            <form (ngSubmit)="subscribe()" class="space-y-2">
              <input 
                type="email" 
                [(ngModel)]="email"
                name="email"
                [placeholder]="'newsletter.email_placeholder' | transloco"
                required
                class="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground font-mono text-sm">
              
              @if (error()) {
                <p class="text-xs text-danger font-mono">{{ error() }}</p>
              }
              
              <app-button 
                type="submit"
                [variant]="'primary'"
                [size]="'sm'"
                [fullWidth]="true"
                [loading]="loading()"
                [disabled]="!email">
                {{ 'newsletter.subscribe' | transloco }}
              </app-button>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Text gradient animation */
    .text-gradient {
      background: linear-gradient(90deg, 
        rgb(var(--foreground)), 
        rgb(var(--accent)), 
        rgb(var(--foreground))
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s linear infinite;
    }

    @keyframes shimmer {
      0% { background-position: 0% center; }
      100% { background-position: 200% center; }
    }

    /* Cursor blink */
    .cursor-blink {
      animation: blink 1s step-end infinite;
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    /* Progress bars */
    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgb(var(--muted));
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, 
        rgb(var(--foreground)), 
        rgb(var(--accent))
      );
      animation: fillProgress 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    @keyframes fillProgress {
      0% {
        width: 0%;
        opacity: 1;
      }
      50% {
        width: 100%;
        opacity: 1;
      }
      100% {
        width: 100%;
        opacity: 0.3;
      }
    }

    /* Animated dots */
    .dot {
      position: absolute;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: radial-gradient(circle, 
        rgba(var(--accent), 0.3) 0%, 
        rgba(var(--accent), 0) 70%
      );
      animation: float 6s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes float {
      0%, 100% {
        transform: translate(0, 0) scale(1);
        opacity: 0.3;
      }
      50% {
        transform: translate(-30px, -30px) scale(1.2);
        opacity: 0.6;
      }
    }

    /* Social media links */
    .social-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgb(var(--muted));
      color: rgb(var(--foreground));
      border: 2px solid rgb(var(--border));
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .social-link:hover {
      background: rgb(var(--foreground));
      color: rgb(var(--background));
      border-color: rgb(var(--foreground));
      transform: translateY(-5px) scale(1.1);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .social-link:active {
      transform: translateY(-3px) scale(1.05);
    }

    /* Custom font for headings */
    .font-heading {
      font-family: 'Shlop', 'Inter', system-ui, sans-serif;
    }
  `]
})
export class ComingSoonComponent implements OnInit, OnDestroy {
  private newsletterService = inject(NewsletterService);
  private settingsService = inject(SettingsService);
  
  // Social media links from settings
  instagramUrl = computed(() => this.settingsService.settings()?.instagram_url || '');
  tiktokUrl = computed(() => this.settingsService.settings()?.tiktok_url || '');
  
  // Newsletter
  email = '';
  subscribed = signal(false);
  loading = signal(false);
  error = signal('');
  
  typeWriterTexts = [
    'We\'re Building Something Epic',
    'Worth The Wait',
    'Coming Very Soon',
    'Stay Tuned For Magic'
  ];
  currentTextIndex = 0;
  displayedText = signal('');
  
  private typeWriterTimeout?: number;

  ngOnInit() {
    // Start typewriter effect
    this.typeWriter();
  }

  ngOnDestroy() {
    if (this.typeWriterTimeout) {
      clearTimeout(this.typeWriterTimeout);
    }
  }

  typeWriter() {
    const text = this.typeWriterTexts[this.currentTextIndex];
    let charIndex = 0;
    
    const type = () => {
      if (charIndex < text.length) {
        this.displayedText.update(current => current + text.charAt(charIndex));
        charIndex++;
        this.typeWriterTimeout = window.setTimeout(type, 100);
      } else {
        // Wait 2 seconds before erasing
        this.typeWriterTimeout = window.setTimeout(() => {
          this.eraseText();
        }, 2000);
      }
    };
    
    type();
  }

  eraseText() {
    const erase = () => {
      if (this.displayedText().length > 0) {
        this.displayedText.update(current => current.slice(0, -1));
        this.typeWriterTimeout = window.setTimeout(erase, 50);
      } else {
        // Move to next text
        this.currentTextIndex = (this.currentTextIndex + 1) % this.typeWriterTexts.length;
        this.typeWriterTimeout = window.setTimeout(() => {
          this.typeWriter();
        }, 500);
      }
    };
    
    erase();
  }

  subscribe() {
    if (!this.email) return;
    
    this.loading.set(true);
    this.error.set('');
    
    this.newsletterService.subscribe(this.email).subscribe({
      next: () => {
        this.subscribed.set(true);
        this.loading.set(false);
        this.email = '';
      },
      error: (err) => {
        this.error.set(err.error?.message || 'An error occurred. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
