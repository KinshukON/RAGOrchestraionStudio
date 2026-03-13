.PHONY: db-migrate db-upgrade db-downgrade db-history dev-backend dev-frontend

# ── Database Migration Targets ─────────────────────────────────────────────────
# Run from the repo root; all alembic commands are executed inside backend/

## Generate a new migration (auto-detect changes from SQLModel models)
## Usage: make db-migrate msg="add user preferences"
db-migrate:
	@if [ -z "$(msg)" ]; then echo "Usage: make db-migrate msg='<description>'"; exit 1; fi
	cd backend && alembic revision --autogenerate -m "$(msg)"

## Apply all pending migrations to the database
db-upgrade:
	cd backend && alembic upgrade head

## Roll back the most recent migration
db-downgrade:
	cd backend && alembic downgrade -1

## Show full migration history
db-history:
	cd backend && alembic history --verbose

## Show current DB revision
db-current:
	cd backend && alembic current

# ── Local Dev Shortcuts ────────────────────────────────────────────────────────
dev-backend:
	cd backend && uvicorn main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev
