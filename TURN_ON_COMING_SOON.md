# 🔒 Návod na zapnutie Coming Soon stránky

## Rýchly postup

Aby ste aktivovali Coming Soon stránku a zablokovali prístup k aplikácii, musíte upraviť **1 súbor**:

### 📄 `frontend_angular/src/app/app.routes.ts`

1. Otvorte súbor `frontend_angular/src/app/app.routes.ts`

2. **ZAKOMENTUJTE** pôvodné routes (začínajú na riadku 15):
   - Pridajte `/*` na začiatku (pred definíciu appRoutes)
   - Pridajte `*/` na konci sekcie (po ukončení appRoutes)

3. **ZAKOMENTUJTE** pôvodný export routes (začína na riadku 133):
   - Pridajte `/*` pred `export const routes`
   - Pridajte `*/` na konci sekcie

4. **PRIDAJTE** alebo odkomentujte Coming Soon routing (riadky 5-13):
```typescript
// TEMPORARY: Coming Soon page - all routes blocked
const appRoutes: Routes = [
  {
    path: '**',
    loadComponent: () => import('./pages/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent)
  }
];
```

5. **PRIDAJTE** alebo odkomentujte dočasný export (riadky 125-131):
```typescript
// TEMPORARY: All routes redirect to Coming Soon
export const routes: Routes = [
  {
    path: '**',
    loadComponent: () => import('./pages/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent)
  }
];
```

## ℹ️ Poznámky

- **Header a Footer** sa automaticky skryjú po aktivácii Coming Soon režimu
- Coming Soon stránka zablokuje všetky routes v aplikácii
- Všetci návštevníci uvidia len Coming Soon obrazovku bez ohľadu na URL

## ✅ Overenie

Po úprave by mal súbor `app.routes.ts` vyzerať takto (hlavné časti):

```typescript
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
  // ... zvyšok routes zakomentovaný
];
*/

// TEMPORARY: All routes redirect to Coming Soon
export const routes: Routes = [
  {
    path: '**',
    loadComponent: () => import('./pages/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent)
  }
];

/*
export const routes: Routes = [
  {
    path: 'newsletter/unsubscribe',
    redirectTo: '/en/newsletter/unsubscribe',
    pathMatch: 'full'
  },
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
```

## 🚀 Reštart aplikácie

Po úprave súboru:
- Aplikácia by sa mala automaticky reloadnúť (hot reload)
- Ak nie, reštartujte development server
- Návštevníci uvidia Coming Soon stránku namiesto normálnej aplikácie

## 🔓 Vypnutie Coming Soon

Pre obnovenie normálnej funkcionality použite návod v súbore `TURN_OFF_COMING_SOON.md`

---

**Vytvorené:** 4. marec 2026  
**Účel:** Dočasná Coming Soon obrazovka počas údržby alebo prípravy webu
