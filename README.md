# SniffOrbit ONE

A 3D-interactive, full-stack flagship store for **SniffOrbit ONE** — a *conceptual* six-chamber dog-enrichment puzzle.
The storefront, checkout, order tracking and admin are real and database-backed; the product is a design concept and
every order is a clearly labelled **test order** (no payment is taken, nothing ships).

| | |
|---|---|
| **Framework** | Next.js 16 (App Router) · React 19 · TypeScript |
| **Styling / motion** | Tailwind CSS v4 (CSS-first tokens) · Motion for React · CSS keyframes |
| **3D** | Three.js · React Three Fiber · Drei — procedural model, no external assets |
| **Data** | PostgreSQL · Drizzle ORM + SQL migrations · Zod validation |
| **Forms** | React Hook Form + Zod resolvers |
| **Payments** | Optional Stripe Checkout in **test mode**; otherwise test-order mode |
| **Tests** | Vitest (integration, real Postgres) · Playwright (E2E, production build) |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Database — any PostgreSQL 15+. Easiest: Docker
docker compose up -d                 # creates snifforbit + snifforbit_test

# 3. Environment
cp .env.example .env.local           # then set AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # → AUTH_SECRET

# 4. Schema + demo data + admin account
npm run db:setup                     # = db:migrate + db:seed

# 5. Run
npm run dev                          # http://localhost:3000
```

Admin dashboard: **http://localhost:3000/admin** — sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run typecheck` · `npm run lint` | TypeScript and ESLint (flat config, React Compiler rules) |
| `npm run db:generate` | Generate a new SQL migration after editing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations (`drizzle/`) — safe to run repeatedly |
| `npm run db:seed` | Idempotent seed: product, 8 variants, stock, images, shipping config, admin |
| `npm run admin:create -- --email you@x.com --name "You"` | Create/reset an admin (password read from `ADMIN_PASSWORD`) |
| `npm run render:products` | Re-render product PNGs from the 3D model (dev server must be running) |
| `npm test` | Backend integration tests against `DATABASE_URL_TEST` |
| `npm run test:e2e` | Playwright E2E against a production build (run `npm run build` first) |
| `npm run db:reset:test` | Truncate + reseed the test database |

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string. On serverless hosts use the provider's **pooled** URL. |
| `DATABASE_URL_TEST` | tests | Separate database — integration and E2E tests **truncate** it. Must differ from `DATABASE_URL`. |
| `AUTH_SECRET` | ✅ | ≥ 32 random chars. Keys session-token hashing and IP hashing. Required in production. |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public origin (canonical URLs, sitemap, Stripe redirects). Inlined at build time. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | seed | Used by `db:seed` / `admin:create`. Stored only as a scrypt hash. |
| `STRIPE_SECRET_KEY` | optional | Must start with `sk_test_` — live keys are refused. Enables Stripe Checkout test mode. |
| `STRIPE_WEBHOOK_SECRET` | with Stripe | Signing secret for `POST /api/stripe/webhook`. |
| `CRON_SECRET` | optional | Protects `GET /api/cron/expire-pending` (releases abandoned Stripe reservations). |
| `RATE_LIMIT_DISABLED` | tests | Set to `1` to disable rate limiting (test runs only). |

## Demo data

`npm run db:seed` creates one flagship product with four colourways × two sizes:

| Colourway | Standard ($129) | Large ($149) |
|---|---|---|
| Morning Walk — ivory / coral | 40 | 24 |
| Deep Woods — forest / mint | 32 | 18 |
| Fresh Trail — mint / graphite | 26 | **4** (low stock) |
| Sunset Fetch — coral / cream | 20 | **0** (sold out) |

Shipping (stored in `site_config`, editable): Standard $9 (free from $140), Express $24; US & Canada. No tax is collected.

## Placing a test order

1. Configure on `/customize` (or the homepage) → **Add to cart**.
2. **Checkout** → contact → address → delivery → review → tick the test-order acknowledgement → **Place test order**.
3. The confirmation page shows the saved order, its reference (`SO-XXXX-XXXX`) and a private **tracking key**.
4. Look it up later at `/order/track` with the reference + key (or the copied tracking link — the key travels in the URL
   fragment, so it never reaches server logs).

### Stripe test mode (optional)

Set `STRIPE_SECRET_KEY=sk_test_…`. Orders are created as *Awaiting payment* with stock **reserved**, the customer is sent
to Stripe Checkout, and on success the reservation becomes a sale. Configure a webhook to
`https://<your-domain>/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.expired`
(locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`). Use Stripe's test card `4242 4242 4242 4242`.
The success page also re-verifies the session server-side, so it works even before the webhook arrives.

## How the important parts work

**Order creation** (`src/server/services/orders.ts`) runs in one transaction:
advisory lock on the client's `Idempotency-Key` → `SELECT … FOR UPDATE` on every inventory row (sorted, so no deadlocks)
→ prices, names and availability re-read from the database → totals computed server-side → customer upsert, order,
items, inventory movements, status event and payment record written atomically. A retried submission with the same key
returns the same order (and the same tracking key, which is HMAC-derived so it never needs to be stored); a reused key
with a different cart is rejected. Concurrency is covered by a test where 8 buyers race for 4 units.

**Security** — admin sessions are random 256-bit tokens in `httpOnly`, `SameSite=Lax`, `Secure` (`__Host-` prefixed in
production) cookies; the database stores only an HMAC. Passwords use Node's scrypt. Every admin page calls
`requireAdminPage()` and every admin API uses `adminRoute()` (401 before any handler code). Mutations reject cross-origin
requests and non-JSON bodies; login, checkout, lookup, contact and newsletter are rate limited in Postgres (works across
serverless instances). Guest order access requires the reference **and** a 100-bit tracking key; failures are
indistinguishable. No card data is ever handled.

**3D** (`src/components/three/`) — the model is built procedurally (lathe, extrude and primitive geometry) from a
plausible mechanism: weighted housing, six-tooth ratchet + pawl + return spring, removable six-chamber tray with six
interchangeable inserts, lid with window and scent ports, and a spring shutter. Scenes mutate animation-target refs in
`useFrame`, so scroll-driven choreography never re-renders React. Canvases are lazy-loaded, pause off-screen, drop to a
low-quality tier on small/low-memory devices, and fall back to rendered PNGs if WebGL is missing or crashes.

**Motion** — entrance animations respect `prefers-reduced-motion` (Motion's `reducedMotion="user"` plus a CSS override).
The page loader (dog + puck) runs on CSS keyframes and exits on a fixed timeline, so it can't block the page even if
JavaScript fails; it is skipped with reduced motion and after a visitor presses *Skip*.

## Project structure

```
src/
  app/(site)/        storefront routes (home, product, customize, cart, checkout, order, content pages)
  app/admin/         admin login + protected dashboard (orders, products, inventory, messages)
  app/api/           route handlers (public, admin, Stripe webhook, cron)
  components/        ui primitives · layout · home sections · three (3D) · simulation · dog-match · admin
  content/           product definition (seed source), discoveries, FAQ
  lib/               validation schemas (shared client/server), cart store, money, utils
  server/            db (schema, client) · services (catalog, quote, orders, admin, stripe) · auth · http helpers
drizzle/             SQL migrations
scripts/             migrate, seed, create-admin, render-products, reset-test-db
tests/integration/   Vitest — orders, concurrency, idempotency, API auth, admin services
tests/e2e/           Playwright — purchase journey, routes, admin, accessibility, mobile
```

## Testing

```bash
npm test                     # 32 integration tests (real Postgres, DATABASE_URL_TEST)
npm run build && npm run test:e2e   # 44 E2E tests: starts `next start` on :3200 against the TEST database
```

E2E covers the full purchase journey (configure → cart persistence → validated multi-step checkout → confirmation →
secure tracking), duplicate-submission protection, sold-out handling, every public route, 404s, SEO endpoints, contact &
newsletter, Dog Match, the simulation, admin auth/authorisation, order status changes, stock adjustments, keyboard
access, reduced motion and mobile layouts (no horizontal overflow).

## Deploying to Vercel

1. Create a hosted Postgres (Neon, Supabase, Vercel Postgres…). Copy the **pooled** connection string.
2. Import the repo in Vercel and set `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (your production URL) and,
   optionally, `CRON_SECRET` and the Stripe test keys.
3. Apply migrations and seed once from your machine against the production database:
   ```bash
   DATABASE_URL="postgres://…" ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:setup
   ```
   (Run `npm run db:migrate` again whenever a new migration is added — before or as part of each deploy.)
4. Deploy. `vercel.json` registers a daily cron for `/api/cron/expire-pending`.

Nothing depends on the local filesystem at runtime: product renders are static files in `public/`, all state lives in
Postgres, and the development-only `/dev/render` route returns 404 in production.

## Honest limitations

- SniffOrbit ONE is a **concept**: dimensions and materials are provisional; the mechanism has not been prototyped,
  safety-tested or trialled with dogs. The site says so wherever it matters.
- No emails are sent (no provider configured); confirmations are shown on-screen and via the tracking page.
- Tax is not calculated. Shipping covers the US and Canada only.
- Stripe test mode is implemented but was not exercised end-to-end in this environment (no test keys were available);
  test-order mode is fully tested.
- Lighthouse / Core Web Vitals were not formally measured; the 3D sections are lazy-loaded and degrade gracefully, but
  real-device profiling is a sensible next step.
