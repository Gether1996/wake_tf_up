import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { LanguageService } from '../../core/services/language.service';
import { SettingsService } from '../../core/api/settings.service';

@Component({
  selector: 'app-privacy-policy',
  imports: [CommonModule, RouterModule, TranslocoModule],
  template: `
    <div class="container mx-auto px-4 py-12 max-w-4xl">
      <h1 class="text-4xl font-bold mb-8">{{ 'privacy.title' | transloco }}</h1>
      
      <div class="prose prose-lg max-w-none space-y-6">
        <p class="text-muted-foreground">
          <strong>{{ 'privacy.effective_date' | transloco }}:</strong> {{ 'privacy.date' | transloco }}
        </p>

        <!-- Section 1: Introduction -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section1.title' | transloco }}</h2>
          <p>{{ 'privacy.section1.content' | transloco }}</p>
        </section>

        <!-- Section 2: Data Controller -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section2.title' | transloco }}</h2>
          <div [innerHTML]="'privacy.section2.content' | transloco: { email: contactEmail(), phone: phone(), address: address(), country: country() }"></div>
        </section>

        <!-- Section 3: What Data We Collect -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section3.title' | transloco }}</h2>
          <p>{{ 'privacy.section3.intro' | transloco }}</p>
          <ul class="list-disc pl-6 space-y-2 mt-4">
            <li><strong>{{ 'privacy.section3.personal.title' | transloco }}:</strong> {{ 'privacy.section3.personal.content' | transloco }}</li>
            <li><strong>{{ 'privacy.section3.order.title' | transloco }}:</strong> {{ 'privacy.section3.order.content' | transloco }}</li>
            <li><strong>{{ 'privacy.section3.technical.title' | transloco }}:</strong> {{ 'privacy.section3.technical.content' | transloco }}</li>
            <li><strong>{{ 'privacy.section3.payment.title' | transloco }}:</strong> {{ 'privacy.section3.payment.content' | transloco }}</li>
          </ul>
        </section>

        <!-- Section 4: How We Use Your Data -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section4.title' | transloco }}</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li>{{ 'privacy.section4.item1' | transloco }}</li>
            <li>{{ 'privacy.section4.item2' | transloco }}</li>
            <li>{{ 'privacy.section4.item3' | transloco }}</li>
            <li>{{ 'privacy.section4.item4' | transloco }}</li>
            <li>{{ 'privacy.section4.item5' | transloco }}</li>
          </ul>
        </section>

        <!-- Section 5: Legal Basis (GDPR) -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section5.title' | transloco }}</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>{{ 'privacy.section5.contract.title' | transloco }}:</strong> {{ 'privacy.section5.contract.content' | transloco }}</li>
            <li><strong>{{ 'privacy.section5.consent.title' | transloco }}:</strong> {{ 'privacy.section5.consent.content' | transloco }}</li>
            <li><strong>{{ 'privacy.section5.legitimate.title' | transloco }}:</strong> {{ 'privacy.section5.legitimate.content' | transloco }}</li>
            <li><strong>{{ 'privacy.section5.legal.title' | transloco }}:</strong> {{ 'privacy.section5.legal.content' | transloco }}</li>
          </ul>
        </section>

        <!-- Section 6: Data Sharing -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section6.title' | transloco }}</h2>
          <p>{{ 'privacy.section6.intro' | transloco }}</p>
          <ul class="list-disc pl-6 space-y-2 mt-4">
            <li><strong>{{ 'privacy.section6.shipping.title' | transloco }}:</strong> {{ 'privacy.section6.shipping.content' | transloco }}</li>
            <li><strong>{{ 'privacy.section6.payment.title' | transloco }}:</strong> {{ 'privacy.section6.payment.content' | transloco }}</li>
            <li><strong>{{ 'privacy.section6.services.title' | transloco }}:</strong> {{ 'privacy.section6.services.content' | transloco }}</li>
          </ul>
        </section>

        <!-- Section 7: Your Rights -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section7.title' | transloco }}</h2>
          <p>{{ 'privacy.section7.intro' | transloco }}</p>
          <ul class="list-disc pl-6 space-y-2 mt-4">
            <li><strong>{{ 'privacy.section7.access' | transloco }}</strong></li>
            <li><strong>{{ 'privacy.section7.rectification' | transloco }}</strong></li>
            <li><strong>{{ 'privacy.section7.erasure' | transloco }}</strong></li>
            <li><strong>{{ 'privacy.section7.restriction' | transloco }}</strong></li>
            <li><strong>{{ 'privacy.section7.portability' | transloco }}</strong></li>
            <li><strong>{{ 'privacy.section7.objection' | transloco }}</strong></li>
            <li><strong>{{ 'privacy.section7.complaint' | transloco }}</strong></li>
          </ul>
        </section>

        <!-- Section 8: Data Retention -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section8.title' | transloco }}</h2>
          <p>{{ 'privacy.section8.content' | transloco }}</p>
        </section>

        <!-- Section 9: Security -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section9.title' | transloco }}</h2>
          <p>{{ 'privacy.section9.content' | transloco }}</p>
        </section>

        <!-- Section 10: Cookies -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section10.title' | transloco }}</h2>
          <p>{{ 'privacy.section10.content' | transloco }}</p>
        </section>

        <!-- Section 11: Changes -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section11.title' | transloco }}</h2>
          <p>{{ 'privacy.section11.content' | transloco }}</p>
        </section>

        <!-- Section 12: Contact -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'privacy.section12.title' | transloco }}</h2>
          <div [innerHTML]="'privacy.section12.content' | transloco: { email: contactEmail(), phone: phone(), address: address(), country: country() }"></div>
        </section>
      </div>

      <div class="mt-12 pt-8 border-t border-border">
        <a 
          [routerLink]="homeLink()"
          class="inline-flex items-center text-accent hover:underline">
          ← {{ 'privacy.back_home' | transloco }}
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
export class PrivacyPolicyComponent {
  private languageService = inject(LanguageService);
  private settingsService = inject(SettingsService);
  currentLang = this.languageService.currentLang;
  homeLink = computed(() => `/${this.currentLang()}`);
  contactEmail = this.settingsService.contactEmail;
  phone = this.settingsService.phone;
  address = this.settingsService.address;
  country = this.settingsService.country;
}
