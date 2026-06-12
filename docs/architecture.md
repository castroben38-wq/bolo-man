# Bolo-Man Architecture Blueprint

## Overview

Bolo-Man is a production-ready daily services platform tailored for Cameroon, with a clear path for multi-country expansion across Central Africa.

## Architecture Decisions

### Monolithic Modular Backend
- **NestJS** modular monolith with clear domain boundaries
- Each module (auth, bookings, payments, etc.) is self-contained
- Easy future extraction into microservices when scaling

### Payment Adapter Pattern
- Abstract `IPaymentGateway` interface with concrete adapters per payment method
- Factory resolves by `(PaymentMethod, country_code)` allowing easy expansion
- Supports MoMo, Orange Money, Card (Flutterwave), COD, Wallet

### Gated Contact Access
- Dedicated `/contacts/:providerId` endpoint protected by `ContactAccessGuard`
- Contact data NEVER included in generic provider profile responses
- 403 response includes upgrade options (subscription or micro-payment)

### Multi-Country Expansion
- `country_code` field on all relevant models
- Per-country pricing, language packs, payment adapters
- All queries scoped by country_code (via middleware)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS, TypeScript |
| Database | PostgreSQL + PostGIS |
| Cache | Redis |
| ORM | Prisma |
| Auth | JWT (15min), Refresh Tokens (7d) |
| Real-time | Socket.IO / WebSocket |
| Mobile | React Native (Expo) |
| Admin Web | React + Vite + Tailwind |
| Payments | MoMo, Orange Money, Flutterwave |
| DevOps | Docker, GitHub Actions |

## Data Flow

```
Mobile/Admin -> Nginx -> NestJS Modules -> Prisma -> PostgreSQL/Redis
                    |             |
                    v             v
               WebSocket    Payment Adapters -> MoMo/Orange/Flutterwave
```
