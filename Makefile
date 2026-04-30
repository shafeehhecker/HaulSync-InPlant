# ─────────────────────────────────────────────────────────────────────────────
# HaulSync In-Plant — Makefile
# Usage: make <target>
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: help dev prod stop down logs shell-backend shell-db migrate seed \
        reset-db build test lint clean ps health

# Default
help:
	@echo ""
	@echo "  HaulSync In-Plant — available commands"
	@echo "  ──────────────────────────────────────"
	@echo "  make dev           Start full stack in development mode"
	@echo "  make prod          Start full stack in production mode"
	@echo "  make stop          Stop all containers"
	@echo "  make down          Stop + remove containers and networks"
	@echo "  make down-v        Stop + remove containers, networks AND volumes"
	@echo ""
	@echo "  make migrate       Run Prisma DB migrations"
	@echo "  make seed          Seed database with demo data"
	@echo "  make reset-db      Drop + recreate + migrate + seed (dev only)"
	@echo ""
	@echo "  make logs          Tail all service logs"
	@echo "  make logs-be       Tail backend logs only"
	@echo "  make logs-db       Tail postgres logs only"
	@echo ""
	@echo "  make shell-backend Open shell in backend container"
	@echo "  make shell-db      Open psql in postgres container"
	@echo "  make shell-redis   Open redis-cli in redis container"
	@echo ""
	@echo "  make build         Build all Docker images"
	@echo "  make ps            Show running containers"
	@echo "  make health        Hit the backend health endpoint"
	@echo "  make clean         Remove dangling images and build cache"
	@echo ""

# ── Environment setup ─────────────────────────────────────────────────────────
.env:
	@echo "📋 Creating .env from .env.docker..."
	cp .env.docker .env
	@echo "⚠️  Edit .env and set secure passwords before production use."

# ── Development ───────────────────────────────────────────────────────────────
dev: .env
	@echo "🚀 Starting HaulSync In-Plant (development)..."
	docker compose up --build -d postgres redis
	@echo "⏳ Waiting for database..."
	@sleep 5
	docker compose --profile migrate run --rm migrate
	docker compose up --build -d backend frontend
	@echo ""
	@echo "  ✅ Ready!"
	@echo "  Frontend → http://localhost:3001"
	@echo "  Backend  → http://localhost:5001"
	@echo "  API docs → http://localhost:5001/health"
	@echo ""

# ── Production ────────────────────────────────────────────────────────────────
prod: .env
	@echo "🚀 Starting HaulSync In-Plant (production)..."
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
	@echo ""
	@echo "  ✅ Production stack running on port 80"
	@echo ""

# ── Stop / Down ───────────────────────────────────────────────────────────────
stop:
	docker compose stop

down:
	docker compose down

down-v:
	docker compose down -v
	@echo "🗑️  All volumes removed."

# ── Database ──────────────────────────────────────────────────────────────────
migrate:
	docker compose run --rm backend sh -c "npx prisma migrate deploy"

seed:
	docker compose run --rm backend sh -c "node prisma/seed.js"

reset-db:
	@echo "⚠️  This will DROP all data in the database. Ctrl+C to cancel."
	@sleep 3
	docker compose run --rm backend sh -c "npx prisma migrate reset --force && node prisma/seed.js"

# ── Logs ──────────────────────────────────────────────────────────────────────
logs:
	docker compose logs -f --tail=100

logs-be:
	docker compose logs -f --tail=100 backend

logs-db:
	docker compose logs -f --tail=100 postgres

# ── Shells ────────────────────────────────────────────────────────────────────
shell-backend:
	docker compose exec backend sh

shell-db:
	docker compose exec postgres psql -U haulsync -d haulsync_inplant

shell-redis:
	docker compose exec redis redis-cli -a redis_secret

# ── Build ─────────────────────────────────────────────────────────────────────
build:
	docker compose build --no-cache

# ── Status ────────────────────────────────────────────────────────────────────
ps:
	docker compose ps

health:
	@curl -s http://localhost:5001/health | python3 -m json.tool 2>/dev/null || echo "Backend not reachable"

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean:
	docker image prune -f
	docker builder prune -f
	@echo "🧹 Cleaned up dangling images and build cache."
