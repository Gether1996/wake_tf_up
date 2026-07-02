# WAKE TF UP — Deep Audit

Date: 2026-07-02
Scope: `backend_django/` (Django 5.0.4 + DRF), `frontend_angular/` (Angular 21 SSR), `nginx/` + Docker deployment.

This audit was produced by three independent read-only reviews (backend security/correctness, frontend performance with a focus on image loading, and infra/Docker/nginx), followed by manual verification of the highest-severity claims against the actual code before writing them up here. Two of the backend agent's original "Critical" findings were downgraded after verification — see "Corrections" below.

## Fix status (updated after implementation pass)

Everything below except the two items marked **NOT DONE** has been implemented in the working tree. See the bottom of this file... actually see the conversation/commit for the full list. Key points:

- All Critical/High/Medium items are implemented except: HSTS (deliberately skipped — needs you to confirm TLS is actually terminated somewhere before it's safe to add; see High #5), and `NgOptimizedImage`/full responsive `srcset` (the underlying fix — real thumbnail sizes generated on upload — is done for products/tickets; migrating templates to `ngSrc` was not additionally done since plain `<img>` + explicit width/height + the new thumbnails already close most of the gap).
- The "Discount/loyalty code redemption race condition" item in Medium below turned out to be **already safe** on closer inspection — `Order.apply_discount()` in `orders/models.py` already re-fetches the code with `select_for_update()` before validating/incrementing `usage_count`, all inside `@transaction.atomic`. No fix was needed there; left in this doc with a correction note rather than deleted, so the reasoning is on record.
- Blog/Event/Newsletter images got the file-size/extension validators (Medium item) but did NOT get the thumbnail-generation treatment that Product/Ticket images got — those images are embedded as raw HTML by admins (`content_html`), not rendered through a component that would benefit from a second size, so generating unused thumbnails for them would've been dead weight.
- New migrations were hand-written (no Python/Django runtime was available in this environment to run `makemigrations`) — **run `python manage.py makemigrations --check` before applying** to confirm they match, then `migrate`, then `python manage.py backfill_image_thumbnails` once.
- The JWT-cookie migration (High #3) touches the entire auth flow (backend cookie issuance/CSRF enforcement + frontend auth service/interceptor/guard) and could not be run end-to-end in this environment (no Python/Docker available) — test login/logout/refresh/protected-routes carefully before deploying. New env var: `JWT_COOKIE_SECURE` (defaults to `True` when `DEBUG=False` — set it to `False` explicitly if production is genuinely not behind HTTPS yet, otherwise the auth cookies will silently never be sent).

## Executive summary

The app is functionally solid (sensible app boundaries, lazy-loaded routes, JWT auth, WhiteNoise + nginx static serving, background payment reconciliation), but has three categories of real risk:

1. **Payment reliability, not payment fraud.** The GoPay webhook always re-verifies status against GoPay's authenticated API rather than trusting the webhook body — good — but there's a genuine TOCTOU race that can double-send confirmation emails / double-run post-payment side effects when webhooks are delivered more than once (which GoPay does by design).
2. **Image loading is the biggest real performance problem**, exactly matching your suspicion: plain `<img>` tags everywhere, no width/height (layout shift), no resizing/CDN pipeline, and product/blog images served at full original resolution to a 300×300px card.
3. **Infra hardening gaps**: no CSP header, backend container runs as root, no DB-readiness wait before `migrate` in the entrypoint, no log rotation.

## Corrections to the raw sub-agent findings

- **"Demo login endpoint exposed in production" (was rated Critical):** Verified `accounts/urls.py` — `DemoLoginView` from `views_demo.py` is never imported or routed. It's dead code sitting in the repo, not a reachable endpoint. Downgraded to Low — delete the file (or gate it behind `DEBUG` if it's still useful for local demos) so it can't be wired up accidentally later.
- **"Missing GoPay webhook signature verification enables payment forgery" (was rated Critical):** Verified `payments/views.py:308-349` and `gopay_service.py`. The webhook handler only extracts an `id` from the request and then calls `GoPayService.process_notification()`, which makes its own authenticated (OAuth2 client-credentials) call back to GoPay to fetch the real status — it never trusts the webhook body for the actual payment state. So an attacker cannot forge a "paid" status by posting a fake webhook. Downgraded to **Medium**: the endpoint still has no verification that the caller is actually GoPay, so it's an open oracle — anyone who knows or guesses a `provider_transaction_id` can trigger a real API call to GoPay and get an existence signal (200 vs the "unknown payment ID" 200-with-warning branch), and can spam this endpoint to burn your GoPay API rate limit. Worth adding basic origin/signature validation, but it's not the "fake your order as paid" bug it was first described as.
- **The race condition in `payments/reconciliation.py` is real and confirmed** — see High findings below.

## Critical

None, after verification. (The two candidate criticals above were downgraded once checked against the actual routes/logic.)

## High

1. **Race condition in payment status application can double-fire side effects.** `payments/reconciliation.py:33-54` — `was_already_paid = transaction.order.status == 'paid'` is read *before* the `db_transaction.atomic()` block that updates it (line 46), with no `select_for_update()`. GoPay is allowed to deliver the same webhook more than once, and the background reconciliation loop (`entrypoint.sh`, polling every 120s) can overlap with a webhook for the same transaction. Two concurrent calls can both read `was_already_paid=False`, both proceed past the guard, and both send confirmation emails / run post-payment logic. Fix: wrap in `Order.objects.select_for_update().get(...)` inside the atomic block, and re-check `was_already_paid` after acquiring the lock.
2. **No `timeout=` on GoPay HTTP calls.** `payments/gopay_service.py` (`check_payment_status`, notification handling, and the OAuth2 token call) use `requests` without a timeout. If GoPay is slow or hangs, the request thread blocks indefinitely — with `gunicorn --workers 8 --threads 2`, a handful of hung requests can exhaust the whole worker pool and take the site down. Fix: add `timeout=10` (or similar) to every `requests.get/post` call in this file.
3. **JWT access + refresh tokens stored in `localStorage`.** `frontend_angular/src/app/core/auth/auth.service.ts` (~lines 15-16, 85, 105-106). Any XSS anywhere in the app (including in third-party widgets like Packeta) can exfiltrate both tokens; the refresh token is long-lived (7 days) and `BLACKLIST_AFTER_ROTATION=False` server-side, so a stolen refresh token stays valid for a week with no revocation path. Proper fix (backend + frontend) is httpOnly, `SameSite=Strict` cookies instead of `localStorage`; that's a bigger change, so treat as a scheduled item rather than a quick patch.
4. **No CSP header in nginx.** `nginx/conf.d/default.conf` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, but no `Content-Security-Policy`. On a site with payment flows, this is the single biggest cheap win against XSS blast radius. Needs care to enumerate the actual script/style/img/connect sources in use (Packeta widget, GoPay redirect, any analytics) before locking it down.
5. **HTTPS/HSTS not present in any config in this repo.** Every nginx server block listens on port 80 only, no redirect, no HSTS. If TLS is terminated by something in front of this stack (cloud LB, Cloudflare, etc.) that's fine, but it isn't visible anywhere in-repo — worth confirming explicitly rather than assuming, since a payments site with plaintext transport would be a serious exposure.
6. **Backend Docker container runs as root.** `backend_django/Dockerfile` has no `USER` directive, so gunicorn runs as root inside the container. Standard hardening: create an unprivileged user and switch to it before `CMD`/`ENTRYPOINT`.
7. **`entrypoint.sh` has no DB-readiness wait, no error handling, and an unsupervised background loop.** `backend_django/entrypoint.sh` runs `collectstatic` and `migrate` immediately with no wait-for-DB and no `set -e`, so a slow-starting MySQL container causes a crash loop instead of a clean retry, and if either command fails the script silently continues to `exec gunicorn` anyway. The payment-reconciliation `while true` loop is backgrounded with `&` and has no supervision — if the loop's Python process dies (uncaught exception), the container keeps running with reconciliation silently dead and no alert.

## Medium

**Backend**
- N+1 queries in `orders/serializers.py` (`OrderListSerializer.get_items` / `OrderDetailSerializer.get_items`) — the view prefetches `items__product`/`items__ticket`, but the serializer's `SerializerMethodField` re-queries `obj.items.all()`, discarding the prefetch. On an order list page this turns ~3 queries into dozens.
- Missing rate limiting on `ResendVerificationEmailView` / `RequestPasswordResetView` (`accounts/views.py`) — only a 2-minute in-app cooldown, no DRF throttling, so a target can be emailed dozens of times per day (harassment/spam vector, and possible email-provider reputation risk).
- Newsletter unsubscribe token (`newsletter/email_utils.py:19`) truncates a SHA256 HMAC to 32 hex chars. Still 128 bits of entropy so not urgent, but truncating a hash is a code smell worth fixing opportunistically — use the full digest or `secrets.token_urlsafe`.
- No validation that a submitted Packeta pickup-point ID actually exists before order creation (`orders/models.py`, `orders/serializers.py`) — bad IDs only surface at fulfillment time.
- ~~Discount/loyalty code redemption (`loyalty/models.py`) checks `usage_count >= max_uses` without `select_for_update()` — a single-use code can be redeemed twice by two concurrent orders.~~ **Correction:** the actual call path (`Order.apply_discount()` in `orders/models.py:189-243`) already locks the row with `select_for_update()` before validating and incrementing, inside `@transaction.atomic`. Not a real bug — the static validator method in `loyalty/models.py` is only ever called from within that lock.
- No file-size/extension validators on product/blog/event `ImageField`s — relies entirely on the global 50MB `DATA_UPLOAD_MAX_MEMORY_SIZE`, so a careless admin upload can eat storage fast.
- `nginx client_max_body_size 100M` vs Django's `DATA_UPLOAD_MAX_MEMORY_SIZE=50MB` — not broken, but nginx should be set to 50M too so oversized uploads are rejected at the edge instead of after Django buffers 50MB+ into memory per request.
- No frontend Docker health check, no log rotation configured anywhere in the compose files (container logs grow unbounded on the host), no resource limits (mem/cpu) on any service.

**Frontend — image loading (your specific concern)**
- Plain `<img [src]>` everywhere instead of `NgOptimizedImage`/`ngSrc` — `shared/product-card`, `shared/ticket-card`, `pages/product-detail`, home page hero/reviews. No automatic lazy loading enforcement, no responsive `srcset` generation.
- Missing `width`/`height` attributes on nearly all images (product cards, header logo, product-detail main image) — causes real Cumulative Layout Shift as images pop in.
- **Single full-resolution image per product, no thumbnail/size variants from the backend.** `MediaUrlPipe` just prepends the API base URL to whatever the backend returns; there's no resizing pipeline, so a 300×300px product card downloads the same multi-MB original used on the full product-detail page. This is the root cause and needs a backend change (generate/store thumbnail sizes, or add an on-the-fly resizing endpoint), not just a frontend tweak.
- `loading="lazy"` is present on product cards but missing on ticket cards and on product-detail thumbnails/video thumbnails — those load eagerly regardless of scroll position.
- No `Cache-Control` visibility on backend-served image responses in the SSR/API path (nginx `/media/` does set 30-day cache — see infra section — but double-check the Express SSR server isn't proxying images without those headers).
- No `<link rel="preconnect">` to the API origin, adding avoidable latency before the first image request even starts.

**Frontend — other**
- Several unmanaged subscriptions (`product-detail.component.ts` route params and product fetch, `shop.component.ts` query-params subscription) with no `takeUntilDestroyed`/`ngOnDestroy` cleanup — real but modest memory-leak risk on an SPA with client-side navigation.
- Cart contents stored in plain `localStorage`, shared across users of the same browser profile if logout doesn't clear it reliably.

## Low

- `views_demo.py` dead code (see Corrections) — delete it.
- Contact-form and newsletter-template preview endpoints: no real exploit found on inspection, but the newsletter admin preview does simple string substitution into HTML without escaping — low risk since it's `@staff_member_required`-gated, but worth sanitizing on principle.
- No audit logging when a non-superuser is denied deleting an order (`orders/views.py`) — minor observability gap, not a vulnerability.
- `PROTECT` on `PurchasedTicket.order`/`order_item` FKs is correct behavior but gives a confusing raw `ProtectedError` in Django admin instead of a helpful message.
- Base Docker images (`python:3.11-slim`, `node:20-alpine`, `nginx:alpine`) aren't pinned to a digest — fine for now, but drift risk over time.
- No Brotli compression in nginx (gzip only) — minor, gzip is already configured reasonably.

## Suggested fix order

Given the size of this list, a reasonable sequence (cheapest/highest-impact first):

1. **Quick, isolated, low-risk (do first):** add `timeout=` to GoPay requests; add `select_for_update()` to the payment-status race and the loyalty-code race; delete `views_demo.py`; add `width`/`height` + `loading="lazy"` to all product/ticket/blog images; add `<link rel="preconnect">`; drop `client_max_body_size` to 50M in nginx; add `USER` directive to backend Dockerfile.
2. **Needs a bit more design but still contained:** CSP header (needs an audit of actual script/style/img sources first — Packeta widget, GoPay redirect target, any analytics); `set -e` + DB-readiness wait + supervision for the reconciliation loop in `entrypoint.sh`; N+1 fix in order serializers; rate limiting on auth email endpoints.
3. **Bigger, cross-cutting work:** backend image-resizing/thumbnail pipeline (this is the real fix for the image performance problem — everything else is a band-aid until product/blog images have actual size variants); moving JWT storage from `localStorage` to httpOnly cookies (touches both frontend auth service and backend token issuance).

I'd suggest picking a batch from #1 first since those are self-contained, then discussing #3's image pipeline design (it's the one with real architectural decisions — e.g. Pillow-based on-upload thumbnail generation vs. a resizing proxy/CDN) before touching it.
