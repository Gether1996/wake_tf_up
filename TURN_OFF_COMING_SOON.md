# 🔓 Návod na vypnutie Coming Soon stránky

## Rýchly postup

Aby ste obnovili normálnu funkcionalitu aplikácie, musíte upraviť **1 súbor**:

### 📄 `frontend_angular/src/app/app.routes.ts`

1. Otvorte súbor `frontend_angular/src/app/app.routes.ts`

2. **ODSTRÁŇTE** alebo zakomentujte tento kód (riadky 5-13):
```typescript
// TEMPORARY: Coming Soon page - all routes blocked
const appRoutes: Routes = [
  {
    path: '**',
    loadComponent: () => import('./pages/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent)
  }
];
```

3. **ODKOMENTUJTE** pôvodné routes (začínajú na riadku 15):
   - Odstráňte `/*` na začiatku (riadok 15)
   - Odstráňte `*/` na konci sekcie (cca riadok 123)

4. **ODKOMENTUJTE** pôvodný export routes (začína na riadku 133):
   - Odstráňte `/*` pred `export const routes`
   - Odstráňte `*/` na konci sekcie

5. **ODSTRÁŇTE** alebo zakomentujte dočasný export (riadky 125-131):
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

- **Header a Footer** sa automaticky obnovia po obnovení pôvodného routingu
- Coming Soon komponent zostane v projekte (môžete ho neskôr vymazať zo zložky `frontend_angular/src/app/pages/coming-soon/`)
- Zmeny v `app.ts` pre skrytie layoutu sa automaticky prispôsobia novému routingu

## ✅ Overenie

Po úprave by mal súbor `app.routes.ts` vyzerať takto (hlavné časti):

```typescript
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { languageGuard } from './core/guards/language.guard';

const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'shop',
    loadComponent: () => import('./pages/shop/shop.component').then(m => m.ShopComponent)
  },
  // ... zvyšok routes
];

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
```

## 🚀 Reštart aplikácie

Po úprave súboru:
- Aplikácia by sa mala automaticky reloadnúť (hot reload)
- Ak nie, reštartujte development server

---

**Vytvorené:** 2. marec 2026  
**Účel:** Dočasná Coming Soon obrazovka počas prípravy webu
