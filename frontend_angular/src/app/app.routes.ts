import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { languageGuard } from './core/guards/language.guard';

// TEMPORARY: Coming Soon page - all routes blocked
const appRoutes: Routes = [
  {
    path: '**',
    loadComponent: () => import('./pages/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent)
  }
];

// ORIGINAL ROUTES - Commented out for Coming Soon mode
/*
const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'shop',
    loadComponent: () => import('./pages/shop/shop.component').then(m => m.ShopComponent)
  },
  {
    path: 'product/:slug',
    loadComponent: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./pages/cart/cart.component').then(m => m.CartComponent)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent)
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'verify-email',
        loadComponent: () => import('./pages/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./pages/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
      }
    ]
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'orders/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/order-detail/order-detail.component').then(m => m.OrderDetailComponent)
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent)
  },
  {
    path: 'order-confirmation',
    loadComponent: () => import('./pages/order-confirmation/order-confirmation.component').then(m => m.OrderConfirmationComponent)
  },
  {
    path: 'blog',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/blog/blog-list/blog-list.component').then(m => m.BlogListComponent)
      },
      {
        path: ':slug',
        loadComponent: () => import('./pages/blog/blog-detail/blog-detail.component').then(m => m.BlogDetailComponent)
      }
    ]
  },
  {
    path: 'events',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/events/event-list/event-list.component').then(m => m.EventListComponent)
      },
      {
        path: ':slug',
        loadComponent: () => import('./pages/events/event-detail/event-detail.component').then(m => m.EventDetailComponent)
      }
    ]
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent)
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/terms-of-service/terms-of-service.component').then(m => m.TermsOfServiceComponent)
  },
  {
    path: 'cookies',
    loadComponent: () => import('./pages/cookies-policy/cookies-policy.component').then(m => m.CookiesPolicyComponent)
  },
  {
    path: 'downloads',
    redirectTo: 'terms',
    pathMatch: 'full'
  },
  {
    path: 'newsletter/unsubscribe',
    loadComponent: () => import('./pages/newsletter-unsubscribe/newsletter-unsubscribe.component').then(m => m.NewsletterUnsubscribeComponent)
  },
  {
    path: 'review/submit',
    loadComponent: () => import('./pages/review-submit/review-submit').then(m => m.ReviewSubmit)
  },
  {
    path: 'review/:id',
    loadComponent: () => import('./pages/review-detail/review-detail').then(m => m.ReviewDetail)
  }
];
*/

export const routes: Routes = [
  // TEMPORARY: All routes redirect to Coming Soon
  {
    path: '**',
    loadComponent: () => import('./pages/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent)
  }
];

// ORIGINAL ROUTING - Commented out for Coming Soon mode
/*
export const routes: Routes = [
  // Legacy unsubscribe links without language prefix
  {
    path: 'newsletter/unsubscribe',
    redirectTo: '/en/newsletter/unsubscribe',
    pathMatch: 'full'
  },
  // All routes protected by language guard
  {
    path: ':lang',
    canActivate: [languageGuard],
    children: appRoutes
  },
  {
    path: '',
    redirectTo: '/en',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/en'
  }
];
*/
