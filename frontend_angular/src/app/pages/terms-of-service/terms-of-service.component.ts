import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { LanguageService } from '../../core/services/language.service';

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
            <li><strong>{{ 'terms.section2.seller' | transloco }}</strong></li>
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
          <p>{{ 'terms.section8.content' | transloco }}</p>
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
          <div [innerHTML]="'terms.section13.content' | transloco"></div>
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
  currentLang = this.languageService.currentLang;
  homeLink = computed(() => `/${this.currentLang()}`);
}
