# Bolo-Man Deployment Guide

## Local Development

```bash
# Start infrastructure
docker-compose -f infrastructure/docker-compose.yml up -d

# Install & run backend
cd backend && npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# Run admin dashboard
cd admin && npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Strong random string
- `MOMO_*` / `ORANGE_*` / `FLUTTERWAVE_*` - Payment gateway credentials
- `FIREBASE_*` - Push notifications (optional)

## Production Deployment

### Docker

```bash
docker-compose -f infrastructure/docker-compose.prod.yml up -d
```

Services:
- Postgres (PostGIS)
- Redis
- Backend API
- Admin Dashboard (Nginx)
- Nginx Reverse Proxy
- Prometheus
- Grafana

### Steps

1. Set up SSL certificates
2. Configure `.env` for production
3. Run migrations: `npx prisma migrate deploy`
4. Seed data: `npx prisma db seed`
5. Start services: `docker-compose up -d`

## Monitoring

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Health checks: `GET /health`
