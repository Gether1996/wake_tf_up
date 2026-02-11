import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { SettingsService } from '../../core/api/settings.service';

@Component({
  selector: 'app-cookies-policy',
  imports: [CommonModule, RouterModule, TranslocoModule],
  template: `
    <div class="container mx-auto px-4 py-12 max-w-4xl">
      <h1 class="text-4xl font-bold mb-8">{{ 'cookies_policy.title' | transloco }}</h1>
      
      <div class="prose prose-lg max-w-none space-y-6">
        <p class="text-muted-foreground">
          <strong>{{ 'cookies_policy.effective_date' | transloco }}:</strong> {{ 'cookies_policy.date' | transloco }}
        </p>

        <!-- Introduction -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'cookies_policy.section1.title' | transloco }}</h2>
          <p>{{ 'cookies_policy.section1.content' | transloco }}</p>
        </section>

        <!-- What Are Cookies -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'cookies_policy.section2.title' | transloco }}</h2>
          <p>{{ 'cookies_policy.section2.content' | transloco }}</p>
        </section>

        <!-- Types of Cookies We Use -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'cookies_policy.section3.title' | transloco }}</h2>
          
          <div class="mt-4">
            <h3 class="text-xl font-semibold mb-2">{{ 'cookies_policy.section3.essential.title' | transloco }}</h3>
            <p class="mb-4">{{ 'cookies_policy.section3.essential.content' | transloco }}</p>
            <ul class="list-disc pl-6 space-y-2">
              <li><strong>{{ 'cookies_policy.section3.essential.item1' | transloco }}</strong></li>
              <li><strong>{{ 'cookies_policy.section3.essential.item2' | transloco }}</strong></li>
              <li><strong>{{ 'cookies_policy.section3.essential.item3' | transloco }}</strong></li>
            </ul>
          </div>

          <div class="mt-6">
            <h3 class="text-xl font-semibold mb-2">{{ 'cookies_policy.section3.analytics.title' | transloco }}</h3>
            <p class="mb-4">{{ 'cookies_policy.section3.analytics.content' | transloco }}</p>
            <p class="bg-blue-50 border border-blue-200 p-4 rounded">
              <strong>{{ 'cookies_policy.section3.analytics.notice' | transloco }}</strong>
            </p>
          </div>

          <div class="mt-6">
            <h3 class="text-xl font-semibold mb-2">{{ 'cookies_policy.section3.marketing.title' | transloco }}</h3>
            <p class="mb-4">{{ 'cookies_policy.section3.marketing.content' | transloco }}</p>
            <p class="bg-blue-50 border border-blue-200 p-4 rounded">
              <strong>{{ 'cookies_policy.section3.marketing.notice' | transloco }}</strong>
            </p>
          </div>
        </section>

        <!-- Cookie Storage -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'cookies_policy.section4.title' | transloco }}</h2>
          <p>{{ 'cookies_policy.section4.content' | transloco }}</p>
        </section>

        <!-- Your Choices -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'cookies_policy.section5.title' | transloco }}</h2>
          <p>{{ 'cookies_policy.section5.content1' | transloco }}</p>
          <ul class="list-disc pl-6 space-y-2 mt-4">
            <li>{{ 'cookies_policy.section5.item1' | transloco }}</li>
            <li>{{ 'cookies_policy.section5.item2' | transloco }}</li>
            <li>{{ 'cookies_policy.section5.item3' | transloco }}</li>
          </ul>
          <p class="mt-4">{{ 'cookies_policy.section5.content2' | transloco }}</p>
        </section>

        <!-- Changes to Policy -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'cookies_policy.section6.title' | transloco }}</h2>
          <p>{{ 'cookies_policy.section6.content' | transloco }}</p>
        </section>

        <!-- Contact -->
        <section>
          <h2 class="text-2xl font-bold mt-8 mb-4">{{ 'cookies_policy.section7.title' | transloco }}</h2>
          <p>{{ 'cookies_policy.section7.content' | transloco: { email: contactEmail(), phone: phone(), address: address(), country: country() } }}</p>
        </section>
      </div>

      <div class="mt-12 pt-8 border-t border-border">
        <a [routerLink]="privacyLink()" class="text-accent hover:underline">
          ← {{ 'footer.privacy' | transloco }}
        </a>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .prose {
      font-size: 1rem;
      line-height: 1.6;
      color: var(--foreground);
    }
  `]
})
export class CookiesPolicyComponent {
  private settingsService = inject(SettingsService);

  contactEmail = this.settingsService.contactEmail;
  phone = this.settingsService.phone;
  address = this.settingsService.address;
  country = this.settingsService.country;
  privacyLink = computed(() => '/privacy');
}
