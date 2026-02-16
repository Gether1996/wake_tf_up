import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-downloads',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoModule],
  template: `
    <div class="container mx-auto px-4 py-12 max-w-4xl">
      <h1 class="text-4xl font-bold mb-8">{{ 'downloads.title' | transloco }}</h1>
      
      <div class="prose prose-lg max-w-none space-y-6">
        <p class="text-muted-foreground text-lg">
          {{ 'downloads.description' | transloco }}
        </p>

        <!-- Documents List -->
        <section class="mt-12">
          <h2 class="text-2xl font-bold mb-6">{{ 'downloads.documents_title' | transloco }}</h2>
          
          <div class="space-y-4">
            @for (doc of downloadDocuments; track doc.file) {
              <a 
                [href]="doc.file" 
                download 
                class="flex items-center gap-4 p-4 border-2 border-border hover:border-foreground transition-all bg-background hover:bg-muted group">
                
                <!-- Download Icon -->
                <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-muted group-hover:bg-foreground group-hover:text-background transition-colors">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <!-- Document Info -->
                <div class="flex-1">
                  <h3 class="font-bold text-foreground font-mono mb-1">
                    {{ doc.name | transloco }}
                  </h3>
                  <p class="text-sm text-muted-foreground font-mono">
                    {{ doc.description | transloco }}
                  </p>
                </div>

                <!-- File Type Badge -->
                <div class="flex-shrink-0">
                  <span class="px-3 py-1 bg-accent text-accent-foreground text-xs font-mono font-bold uppercase">
                    DOCX
                  </span>
                </div>
              </a>
            }
          </div>
        </section>

        <!-- Additional Info & Certificate -->
        <section class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <!-- Info (spans 2 columns on desktop) -->
          <div class="md:col-span-2 p-6 bg-muted border-l-4 border-accent">
            <h3 class="font-bold text-lg mb-2">{{ 'downloads.info_title' | transloco }}</h3>
            <p class="text-sm text-muted-foreground">{{ 'downloads.info_content' | transloco }}</p>
          </div>
          
          <!-- Certificate (1 column on desktop) -->
          <div class="flex justify-center items-center">
            <img 
              [src]="certLogo()" 
              alt="Certificate" 
              class="h-24 md:h-32 w-auto object-contain">
          </div>
        </section>

        <!-- Contact Section -->
        <section class="mt-8">
          <h3 class="text-xl font-bold mb-4">{{ 'downloads.contact_title' | transloco }}</h3>
          <p class="text-muted-foreground">
            {{ 'downloads.contact_content' | transloco }}
          </p>
          <a 
            [routerLink]="contactLink()" 
            (click)="scrollToTop()"
            class="inline-block mt-4 px-6 py-3 bg-foreground text-background hover:bg-accent hover:text-accent-foreground transition-all font-mono font-bold uppercase">
            {{ 'downloads.contact_button' | transloco }}
          </a>
        </section>
      </div>

      <div class="mt-12 pt-8 border-t border-border flex justify-between">
        <a [routerLink]="cookiesLink()" class="text-accent hover:underline">
          ← {{ 'footer.cookies' | transloco }}
        </a>
        <a [routerLink]="homeLink()" class="text-accent hover:underline">
          {{ 'downloads.back_home' | transloco }} →
        </a>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DownloadsComponent {
  private themeService = inject(ThemeService);
  private languageService = inject(LanguageService);

  currentLang = this.languageService.currentLang;
  homeLink = computed(() => `/${this.currentLang()}`);
  contactLink = computed(() => `/${this.currentLang()}/contact`);
  cookiesLink = computed(() => `/${this.currentLang()}/cookies`);

  // Theme-aware certificate logo
  isDark = this.themeService.isDark;
  certLogo = computed(() => this.isDark() ? '/cert_black.png' : '/cert_white.png');

  // Download documents sorted by name
  downloadDocuments = [
    { 
      file: '/1.Všeobecné_obchodné_podmienky_v2026.docx', 
      name: 'footer.doc1',
      description: 'downloads.doc1_desc'
    },
    { 
      file: '/2.Reklamačný_poriadok_v2026.docx', 
      name: 'footer.doc2',
      description: 'downloads.doc2_desc'
    },
    { 
      file: '/3.Zasady_spracuvania_a_ochrany_Osobných_údajov_a_poučenie_o_cookies_v2026.docx', 
      name: 'footer.doc3',
      description: 'downloads.doc3_desc'
    },
    { 
      file: '/4.Formulár_na_odstúpenie_od_zmluvy_v2026.docx', 
      name: 'footer.doc4',
      description: 'downloads.doc4_desc'
    },
    { 
      file: '/5.Reklamačný_formulár_v2026.docx', 
      name: 'footer.doc5',
      description: 'downloads.doc5_desc'
    },
    { 
      file: '/6.Protokol_o_prijatí_reklamácie_v2026.docx', 
      name: 'footer.doc6',
      description: 'downloads.doc6_desc'
    },
    { 
      file: '/7.Protokol_o_vybavení_reklamácie_v2026.docx', 
      name: 'footer.doc7',
      description: 'downloads.doc7_desc'
    }
  ];

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
