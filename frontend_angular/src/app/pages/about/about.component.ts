import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { LanguageService } from '../../core/services/language.service';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-about',
  imports: [CommonModule, RouterModule, TranslocoModule, ButtonComponent],
  template: `
    <div class="container mx-auto px-4 py-12">
      <!-- Hero Section -->
      <div class="max-w-3xl mx-auto text-center mb-16">
        <h1 class="text-4xl md:text-5xl font-bold mb-6">{{ 'about.title' | transloco }}</h1>
        <p class="text-xl text-muted-foreground leading-relaxed">
          {{ 'brand.motto' | transloco }}
        </p>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
        <!-- Sustainability -->
        <div class="text-center">
          <div class="w-20 h-20 mx-auto mb-6 flex items-center justify-center border-2 border-foreground">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 class="text-xl font-bold mb-4">{{ 'about.sustainability.title' | transloco }}</h2>
          <p class="text-muted-foreground">{{ 'about.sustainability.body' | transloco }}</p>
        </div>

        <!-- Unique -->
        <div class="text-center">
          <div class="w-20 h-20 mx-auto mb-6 flex items-center justify-center border-2 border-foreground">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold mb-4">{{ 'about.unique.title' | transloco }}</h2>
          <p class="text-muted-foreground">{{ 'about.unique.body' | transloco }}</p>
        </div>

        <!-- Quality -->
        <div class="text-center">
          <div class="w-20 h-20 mx-auto mb-6 flex items-center justify-center border-2 border-foreground">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold mb-4">{{ 'about.quality.title' | transloco }}</h2>
          <p class="text-muted-foreground">{{ 'about.quality.body' | transloco }}</p>
        </div>
      </div>

      <!-- Story Section -->
      <div class="max-w-4xl mx-auto mb-16">
        <div class="border-t border-border pt-16">
          <h2 class="text-3xl font-bold mb-8 text-center">{{ 'about.story.title' | transloco }}</h2>
          <div class="space-y-6 text-lg text-muted-foreground">
            <p>{{ 'about.story.p1' | transloco }}</p>
            <p>{{ 'about.story.p2' | transloco }}</p>
            <p>{{ 'about.story.p3' | transloco }}</p>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="bg-muted py-16">
        <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div class="text-5xl font-bold mb-2">100%</div>
            <div class="text-muted-foreground font-mono uppercase text-sm">
              {{ 'about.stats.recycled' | transloco }}
            </div>
          </div>
          <div>
            <div class="text-5xl font-bold mb-2">1/1</div>
            <div class="text-muted-foreground font-mono uppercase text-sm">
              {{ 'about.stats.unique' | transloco }}
            </div>
          </div>
          <div>
            <div class="text-5xl font-bold mb-2">∞</div>
            <div class="text-muted-foreground font-mono uppercase text-sm">
              {{ 'about.stats.impact' | transloco }}
            </div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="max-w-2xl mx-auto text-center mt-16">
        <h2 class="text-3xl font-bold mb-6">{{ 'about.cta.title' | transloco }}</h2>
        <p class="text-lg text-muted-foreground mb-8">{{ 'about.cta.subtitle' | transloco }}</p>
        <app-button [variant]="'primary'" [size]="'lg'" [routerLink]="shopLink()">
          {{ 'about.cta.button' | transloco }}
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AboutComponent {
  private languageService = inject(LanguageService);
  
  currentLang = this.languageService.currentLang;
  shopLink = computed(() => `/${this.currentLang()}/shop`);
}
