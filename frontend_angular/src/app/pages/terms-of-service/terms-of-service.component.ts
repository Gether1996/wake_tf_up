import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { LanguageService } from '../../core/services/language.service';
import { SettingsService } from '../../core/api/settings.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-terms-of-service',
  imports: [CommonModule, RouterModule, TranslocoModule],
  template: `
    <div class="container mx-auto px-4 py-12 max-w-4xl">
      <h1 class="text-4xl font-bold mb-8">{{ 'terms.title' | transloco }}</h1>
      
      <div class="prose prose-lg max-w-none space-y-6">
        <p class="text-muted-foreground">
          <strong>{{ 'terms.effective_date' | transloco }}:</strong> {{ 'terms.date' | transloco }}
        </p>

        <!-- Section 1: Introduction -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section1.title' | transloco }}</h2>
          <p>{{ 'terms.section1.content' | transloco }}</p>
        </section>

        <!-- Section 2: Definitions -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section2.title' | transloco }}</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>{{ 'terms.section2.seller' | transloco: { owner: ownerName(), id: companyId(), taxId: taxId(), address: address(), country: country() } }}</strong></li>
            <li><strong>{{ 'terms.section2.buyer' | transloco }}</strong></li>
            <li><strong>{{ 'terms.section2.goods' | transloco }}</strong></li>
            <li><strong>{{ 'terms.section2.contract' | transloco }}</strong></li>
          </ul>
        </section>

        <!-- Section 3: Account Registration -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section3.title' | transloco }}</h2>
          <p>{{ 'terms.section3.content' | transloco }}</p>
        </section>

        <!-- Section 4: Orders and Contract Formation -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section4.title' | transloco }}</h2>
          <p>{{ 'terms.section4.intro' | transloco }}</p>
          <ol class="list-decimal pl-6 space-y-2 mt-4">
            <li>{{ 'terms.section4.step1' | transloco }}</li>
            <li>{{ 'terms.section4.step2' | transloco }}</li>
            <li>{{ 'terms.section4.step3' | transloco }}</li>
            <li>{{ 'terms.section4.step4' | transloco }}</li>
          </ol>
        </section>

        <!-- Section 5: Prices and Payment -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section5.title' | transloco }}</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li>{{ 'terms.section5.item1' | transloco }}</li>
            <li>{{ 'terms.section5.item2' | transloco }}</li>
            <li>{{ 'terms.section5.item3' | transloco }}</li>
            <li>{{ 'terms.section5.item4' | transloco }}</li>
          </ul>
        </section>

        <!-- Section 6: Delivery -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section6.title' | transloco }}</h2>
          <p>{{ 'terms.section6.content' | transloco }}</p>
        </section>

        <!-- Section 7: Right of Withdrawal (Slovak Law) -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section7.title' | transloco }}</h2>
          <p>{{ 'terms.section7.intro' | transloco }}</p>
          <ul class="list-disc pl-6 space-y-2 mt-4">
            <li>{{ 'terms.section7.period' | transloco }}</li>
            <li>{{ 'terms.section7.form' | transloco }}</li>
            <li>{{ 'terms.section7.return' | transloco }}</li>
            <li>{{ 'terms.section7.refund' | transloco }}</li>
          </ul>
          <p class="mt-4"><strong>{{ 'terms.section7.exceptions_title' | transloco }}:</strong></p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>{{ 'terms.section7.exception1' | transloco }}</li>
            <li>{{ 'terms.section7.exception2' | transloco }}</li>
            <li>{{ 'terms.section7.exception3' | transloco }}</li>
          </ul>
        </section>

        <!-- Section 8: Warranty and Complaints -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section8.title' | transloco }}</h2>
          <p>{{ 'terms.section8.content' | transloco: { email: contactEmail() } }}</p>
        </section>

        <!-- Section 9: Intellectual Property -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section9.title' | transloco }}</h2>
          <p>{{ 'terms.section9.content' | transloco }}</p>
        </section>

        <!-- Section 10: Limitation of Liability -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section10.title' | transloco }}</h2>
          <p>{{ 'terms.section10.content' | transloco }}</p>
        </section>

        <!-- Section 11: Dispute Resolution -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section11.title' | transloco }}</h2>
          <div [innerHTML]="'terms.section11.content' | transloco"></div>
        </section>

        <!-- Section 12: Final Provisions -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section12.title' | transloco }}</h2>
          <p>{{ 'terms.section12.content' | transloco }}</p>
        </section>

        <!-- Section 13: Contact -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'terms.section13.title' | transloco }}</h2>
          <div [innerHTML]="'terms.section13.content' | transloco: { email: contactEmail(), phone: phone(), address: address(), country: country(), owner: ownerName(), id: companyId(), taxId: taxId() }"></div>
        </section>

        <!-- Section 14: Documents for Download -->
        <section class="mt-12">
          <h2 class="text-2xl font-bold mb-6">{{ 'downloads.documents_title' | transloco }}</h2>
          
          <p class="text-muted-foreground mb-6">
            {{ 'downloads.description' | transloco }}
          </p>

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

          <!-- Additional Info & Certificate -->
          <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
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
          </div>
        </section>
      </div>

      <div class="mt-12 pt-8 border-t border-border">
        <a 
          [routerLink]="homeLink()"
          class="inline-flex items-center text-accent hover:underline">
          ← {{ 'terms.back_home' | transloco }}
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
export class TermsOfServiceComponent {
  private languageService = inject(LanguageService);
  private settingsService = inject(SettingsService);
  private themeService = inject(ThemeService);

  currentLang = this.languageService.currentLang;
  homeLink = computed(() => `/${this.currentLang()}`);
  contactEmail = this.settingsService.contactEmail;
  phone = this.settingsService.phone;
  address = this.settingsService.address;
  country = this.settingsService.country;
  ownerName = this.settingsService.ownerName;
  companyId = this.settingsService.companyId;
  taxId = this.settingsService.taxId;

  // Theme-aware certificate logo
  isDark = this.themeService.isDark;
  certLogo = computed(() => this.isDark() ? '/cert_black.png' : '/cert_white.png');

  // Download documents
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
}
