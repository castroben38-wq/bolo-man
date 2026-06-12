.PHONY: dev test docker-up docker-down seed migrate build lint

# Development
dev:
	cd backend && npm run start:dev

dev-admin:
	cd admin && npm run dev

# Docker
docker-up:
	docker-compose -f infrastructure/docker-compose.yml up -d

docker-down:
	docker-compose -f infrastructure/docker-compose.yml down

docker-logs:
	docker-compose -f infrastructure/docker-compose.yml logs -f

# Database
migrate:
	cd backend && npx prisma migrate dev

seed:
	cd backend && npx prisma db seed

db-push:
	cd backend && npx prisma db push

db-studio:
	cd backend && npx prisma studio

# Build
build:
	cd backend && npm run build
	cd admin && npm run build

# Testing
test:
	cd backend && npm run test

test-e2e:
	cd backend && npm run test:e2e

test-cov:
	cd backend && npm run test:cov

# Linting
lint:
	cd backend && npm run lint
	cd admin && npm run lint

# Install
install:
	npm install
	cd backend && npm install
	cd admin && npm install
	cd mobile && npm install
