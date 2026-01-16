# MainSettings Implementation - Overview

## Backend (Django)

### 1. Model: `settings/models.py`
✅ **MainSettings** model vytvorený
- Singleton pattern (len jedna inštancia)
- Shipping settings: `free_shipping_threshold`, `standard_shipping_cost`
- Tax settings: `tax_rate`
- General settings: `site_name`, `contact_email`
- Social media URLs
- Cart settings: `max_cart_quantity`
- Maintenance mode

### 2. Admin: `settings/admin.py`
✅ Admin interface nakonfigurovaný
- Organizované sekcie (fieldsets)
- Zabránené vytváranie viacerých inštancií
- Automatické presmerovanie na edit stránku

### 3. API: `settings/views.py` + `settings/serializers.py`
✅ REST API endpoints:
- `GET /api/v1/settings/` - všetky nastavenia
- `GET /api/v1/settings/shipping/` - len shipping nastavenia
- `GET /api/v1/settings/cart/` - len cart nastavenia

### 4. URL Routing: `wake_tf_up/urls.py`
✅ Pridané: `path('api/v1/settings/', include('settings.urls'))`

### 5. Django Settings: `wake_tf_up/settings.py`
✅ App pridaná do INSTALLED_APPS: `'settings'`

## Frontend (Angular)

### 1. Service: `core/api/settings.service.ts`
✅ **SettingsService** vytvorený
- Signal-based state management
- Automatické načítanie pri štarte aplikácie
- Fallback na default hodnoty pri chybe
- Metódy: `loadSettings()`, `getShippingSettings()`, `getCartSettings()`, `refresh()`

### 2. Cart Component: `pages/cart/cart.component.ts`
✅ Upravený na používanie dynamických hodnôt
- `freeShippingThreshold` = computed z settings
- `shippingCost` = computed z settings
- `total` = automaticky prepočítaný pri zmene settings

## Ako to funguje

### Flow:
1. **Angular štart** → `SettingsService` constructor → automatické `loadSettings()`
2. **HTTP GET** → `http://localhost:8000/api/v1/settings/`
3. **Response** → uložené do `settings` signal
4. **Cart component** → čítá `freeShippingThreshold()` a `shippingCost()` z computed values
5. **Zmena v Django admin** → frontend automaticky použije nové hodnoty po refresh

### Dynamické hodnoty v template:
```typescript
// Predtým (hardcoded):
freeShippingThreshold = 50;
shippingCost = 5.99;

// Teraz (dynamické):
freeShippingThreshold = computed(() => 
  this.settingsService.settings()?.free_shipping_threshold ?? 50
);
shippingCost = computed(() => 
  this.settingsService.settings()?.standard_shipping_cost ?? 5.99
);
```

## Ďalšie kroky

### 1. Spustiť migrácie:
```bash
docker compose exec backend python manage.py makemigrations settings
docker compose exec backend python manage.py migrate
```

### 2. Vytvoriť initial settings v Django admin:
- Ísť na: http://localhost:8000/admin/settings/mainsettings/
- Nastaviť hodnoty (automaticky vytvorí prvú inštanciu)

### 3. Otestovať:
- Zmeniť `free_shipping_threshold` v admin (napr. na 100€)
- Refreshnúť frontend
- Skontrolovať či sa správne zobrazuje nový threshold v košíku

## Výhody implementácie

✅ **Žiadne hardcoded hodnoty** - všetko v DB
✅ **Centralizované nastavenia** - jeden model pre všetky config
✅ **Bez redeployment** - zmeny cez Django admin
✅ **Type-safe** - TypeScript interface
✅ **Reactive** - Angular signals automaticky updatujú UI
✅ **Fallback values** - default hodnoty ak API zlyhá
✅ **Rozšíriteľné** - ľahko pridať nové nastavenia

## Príklady budúcich nastavení

Do `MainSettings` môžeš pridať:
- `minimum_order_value` - minimálna hodnota objednávky
- `loyalty_points_rate` - konverzný pomer bodov
- `newsletter_discount` - zľava pre newsletter
- `instagram_feed_enabled` - zapnúť/vypnúť Instagram feed
- `featured_categories` - vybraté kategórie na homepage
- atď...
