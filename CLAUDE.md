# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

WAKE TF UP is a Slovak e-commerce webshop selling products, event tickets, and running a blog/newsletter/loyalty program. Two independent apps talk over a REST API:

- `backend_django/wake_tf_up/` — Django 5.0.4 + Django REST Framework API
- `frontend_angular/` — Angular 21 app with SSR (Express server), Transloco i18n (`en`/`sk`), Tailwind CSS

`nginx/` fronts both in production; `docker-compose.yml` is the prod stack, `docker-compose.dev.yml` is local dev (backend on :8000, frontend on :4200 directly, no nginx).

## Commands

### Backend (run inside `backend_django/wake_tf_up/`, with venv active)
```
python manage.py runserver              # dev server
python manage.py migrate                # apply migrations
python manage.py makemigrations <app>   # new migration for one app
python manage.py test                   # run all tests (settings.py picks DB from env)
python manage.py test accounts          # run one app's tests
python manage.py test accounts.tests.ClassName.test_method  # single test
DJANGO_SETTINGS_MODULE=wake_tf_up.settings_test python manage.py test  # use sqlite + fast MD5 password hasher instead of MySQL
python manage.py reconcile_pending_payments --older-than-minutes=2 --limit=50  # manual GoPay reconciliation (also runs as a loop in entrypoint.sh)
```
Backend requires a `.env` file one level above `wake_tf_up/` (loaded via `load_dotenv(BASE_DIR.parent / '.env')`) with at minimum `SECRET_KEY`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`. DB is MySQL via `mysql-connector-python` (not the usual `mysqlclient`/psycopg2 path, despite `psycopg2-binary` being in requirements).

### Frontend (run inside `frontend_angular/`)
```
npm start                 # ng serve, dev
npm run build             # production build
npm run watch             # dev build, watch mode
npm test                  # vitest via `ng test`
npm run serve:ssr:frontend_angular   # run the built SSR server (node dist/frontend_angular/server/server.mjs)
```

### Docker
```
docker compose -f docker-compose.dev.yml up    # local dev, backend+frontend only
docker compose up                               # prod stack: backend + frontend + nginx (published on :9006)
```

## Architecture

### Backend app layout
Local Django apps under `backend_django/wake_tf_up/`, each with the standard `models/serializers/views/urls/admin` split:
- `accounts` — custom `User` model (`AUTH_USER_MODEL = 'accounts.User'`), JWT auth (SimpleJWT: 60 min access / 7 day refresh, no rotation, no blacklist), email verification, password reset, and a separate `views_demo.py` for demo login.
- `shop` — products/categories.
- `orders` — cart/order lifecycle, `packeta_service.py` (Packeta pickup-point shipping integration), `access.py` (order ownership checks), `emails.py`.
- `payments` — `gopay_service.py` (GoPay payment gateway integration), `reconciliation.py` (polls/reconciles pending payments — also run as a background loop by `entrypoint.sh`, separate from the gunicorn web process).
- `reviews`, `blog`, `events`, `analytics`, `newsletter`, `loyalty`, `settings` — supporting domains.
- `core` — cross-cutting: `permissions.py`, `seller_access.py`, `email_utils.py`, `admin_mixins.py`, `logging_handlers.py` (custom `DailyNamedFileHandler`).

All API routes are mounted under `/api/v1/...` in `wake_tf_up/urls.py`, one `include()` per app (see that file for the exact prefix per app — most apps live directly under `/api/v1/`, not `/api/v1/<appname>/`).

Static files are served by WhiteNoise (`CompressedManifestStaticFilesStorage`) even behind nginx. Media (user-uploaded images) is only served by Django itself when `DEBUG=True`; in production nginx serves `/media/` directly from the shared volume — the backend container's media directory is mounted read-only into the nginx container.

`USE_TZ = False` is an intentional, documented decision (see comment in `settings.py`) — all datetimes are naive, stored in server-local time (`Europe/Bratislava`). Be consistent with `datetime.now()` and do not introduce `timezone.now()`/aware datetimes without checking this.

Logging is per-app-and-day via `core.logging_handlers.DailyNamedFileHandler`, configured per logger in `settings.py` (`django`, `django.request`, `orders`, `payments`, `loyalty`, `newsletter`); add a new logger entry there for any new app that needs its own log file.

Use `wake_tf_up.settings_test` for tests that shouldn't touch MySQL — it swaps in sqlite and the MD5 password hasher for speed.

### Frontend structure
Standalone-components Angular app (no NgModules), all pages lazy-loaded via `loadComponent` in `app.routes.ts`. Routing is language-prefixed: every real route is nested under `/:lang` guarded by `languageGuard`, with a redirect from `/` to `/en` and a legacy (non-prefixed) redirect for old newsletter-unsubscribe links.

- `core/api` — HTTP clients per backend resource.
- `core/auth` — auth state, `authGuard`/`guestGuard`.
- `core/guards` — `languageGuard` and friends.
- `core/services`, `core/pipes` — cross-cutting frontend logic.
- `shared/` — presentational components reused across pages (`product-card`, `ticket-card`, `badge`, `button`, `confirm-dialog`, `cookie-consent`, `newsletter-popup`, `notification-container`).
- `pages/` — one folder per route, matching `app.routes.ts`.

i18n strings live in `src/assets/i18n/{en,sk}.json` via `@jsverse/transloco`; `transloco-loader.ts` wires the loader.
