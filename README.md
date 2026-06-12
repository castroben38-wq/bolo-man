# Bolo-Man

**Cameroon-focused daily services platform** — connect clients with local service
providers (electricians, plumbers, cleaners, mechanics, tutors and more), with
mobile-money payments, gated contact access, and a clear path to multi-country
expansion across Central & West Africa.

> Mobile-first · low-bandwidth friendly · multilingual (Français / English /
> Fulfulde) · built for the Cameroonian economy (XAF).

---

## Features

- **Service discovery & booking** — search by category, location, rating and price; one-time and recurring bookings with real-time status (Requested → Accepted → En Route → On Site → Completed).
- **Payments built for Cameroon** — MTN MoMo, Orange Money, cards (via Flutterwave), USSD fallback for low connectivity, and cash-on-delivery with QR confirmation.
- **Payment assurance** — in-app wallet with milestone escrow (25% deposit / 50% mid / 25% on completion), a transaction PIN separate from the login password, SMS/OTP per transaction, and biometric unlock.
- **Gated contact access** — provider phone/location is unlocked by an active subscription tier or a one-off micro-payment (500 XAF / 48h).
- **Subscriptions** — Classic / Gold / Premium tiers for both clients and providers (visibility boosts, contact access, higher booking caps).
- **Admin dashboard** — manage users, providers, categories, bookings, payments and reviews.
- **Multi-country ready** — `countryCode`/`region` scoping and a pluggable payment-gateway factory let new markets (Chad, Gabon, Congo, Nigeria, …) be added without touching business logic.

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Backend API | NestJS 10 · Prisma · PostgreSQL · Redis · Socket.IO · JWT/RBAC |
| Admin web | React 18 · Vite · Tailwind CSS · Recharts |
| Mobile (Client + Provider) | React Native (Expo) · Redux Persist · i18next · offline queue |
| Infra | Docker · docker-compose · Nginx · GitHub Actions CI |

---

## Repository layout

```
backend/         NestJS API (auth, bookings, payments, subscriptions, contacts, admin, …)
admin/           React + Vite admin dashboard
mobile/          React Native (Expo) client & provider app
infrastructure/  docker-compose, Nginx config
docs/            architecture, data model, OpenAPI spec, multi-country guide
```

Key documents:
- [`docs/architecture.md`](docs/architecture.md) — system design
- [`docs/data-model.md`](docs/data-model.md) — entities, subscriptions, gating rules
- [`docs/api/openapi.yaml`](docs/api/openapi.yaml) — OpenAPI v3 spec
- [`docs/expansion/multi-country.md`](docs/expansion/multi-country.md) — expansion strategy
- [`TEST-REPORT.md`](TEST-REPORT.md) — test coverage summary

---

## Quick start (local)

Prerequisites: Node.js 20+, PostgreSQL 16, Redis (optional).

```bash
# 1. Backend
cd backend
npm install
cp ../.env.example ../.env        # then edit DATABASE_URL, JWT secrets, etc.
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev                 # API on http://localhost:3000 (docs at /docs)

# 2. Admin dashboard (new terminal)
cd admin
npm install
npm run dev                       # http://localhost:5173

# 3. Mobile app (new terminal)
cd mobile
npm install
npx expo start
```

On Windows without Docker, see [`DIRECT-RUN.md`](DIRECT-RUN.md) for a step-by-step
guide and the `start-local.ps1` helper.

### Seeded test accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@boloman.cm | admin123! |
| Client | alice@example.cm | client123! |
| Provider | jean.electricien@boloman.cm | provider123! |

---

## Deployment

- **Railway (recommended, zero local Docker)** — [`RAILWAY-DEPLOY.md`](RAILWAY-DEPLOY.md)
- **Docker / docker-compose** — [`DEPLOY.md`](DEPLOY.md) and [`docs/deployment-guide.md`](docs/deployment-guide.md)

The backend runs `prisma migrate deploy` on startup and exposes a `/health`
endpoint for platform health checks.

---

## Useful scripts (root)

```bash
npm run dev:backend     # start API in watch mode
npm run dev:admin       # start admin dashboard
npm run db:migrate      # run Prisma migrations
npm run db:seed         # load Cameroon seed data
npm run docker:up       # start full stack via docker-compose
```

---

## License

Private / unpublished. All rights reserved.
