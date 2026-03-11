---
title: Global project rules
description: High-level guidance and safety constraints for RAG Studio and the future admin service.
---

## Project scope

- This workspace contains **RAG Studio** (FastAPI + React) and is the home for future **Admin Console** work (Express + Prisma + PostgreSQL) as described in the Admin Section Implementation Plan.
- Treat RAG Studio and the Admin Console as related but distinct concerns:
  - RAG Studio: retrieval workflows, Query Studio, RAG-oriented Integrations Hub.
  - Admin Console: auth/session, users/roles/teams/sessions, enterprise integrations, data integration, views/preferences, observability.

## Safety rules

- **Databases**
  - For any Prisma-based admin backend:
    - Use `npx prisma db push` to evolve the schema.
    - **Never** use destructive commands such as:
      - `prisma migrate reset`
      - dropping databases or tables
      - `docker compose down -v` for DB containers.
  - Prefer additive, backwards-compatible schema changes.
- **Secrets**
  - Do not hardcode secrets (JWT secrets, API keys, client secrets, etc.).
  - Use environment variables or a secret manager and reference them by name.
- **Git / CI**
  - Avoid force-pushing to shared branches.
  - Keep tests and linters passing before proposing large changes.

## Design & implementation principles

- **Do not replatform the admin backend**:
  - If/when the Express + Prisma + Postgres admin backend is present, **keep that stack** and extend it.
  - Do not migrate it to Fastify/SQLite without explicit instruction.
- **Reuse existing patterns**:
  - For RAG Studio UI, follow the existing control-plane aesthetic (left nav, central canvas, right config panel).
  - For admin UIs, use similar layout patterns (cards, tabs, side panels) rather than inventing new paradigms per page.
- **Configuration-first philosophy**:
  - Where possible, prefer configuration and metadata (e.g., JSON configs, templates, views, mappings) over hard-coded logic.
  - Keep room for “advanced mode” hooks but design defaults to be no-code / low-code friendly.

