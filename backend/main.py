from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import (
    auth,
    projects,
    workflows,
    integrations,
    environments,
    governance,
    admin_users,
    admin_roles,
    admin_teams,
    admin_sessions,
    admin_views,
    admin_preferences,
    admin_observability,
)
from db import init_db


app = FastAPI(
    title="RAG Studio API",
    version="0.1.0",
    description="Backend API for RAG Studio enterprise RAG orchestration platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["workflows"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["integrations"])
app.include_router(environments.router, prefix="/api/environments", tags=["environments"])
app.include_router(governance.router, prefix="/api/governance", tags=["governance"])
app.include_router(admin_users.router, prefix="/api/admin/users", tags=["admin-users"])
app.include_router(admin_roles.router, prefix="/api/admin/roles", tags=["admin-roles"])
app.include_router(admin_teams.router, prefix="/api/admin/teams", tags=["admin-teams"])
app.include_router(admin_sessions.router, prefix="/api/admin/sessions", tags=["admin-sessions"])
app.include_router(admin_views.router, prefix="/api/admin/views", tags=["admin-views"])
app.include_router(admin_preferences.router, prefix="/api/admin/preferences", tags=["admin-preferences"])
app.include_router(admin_observability.router, prefix="/api/admin/observability", tags=["admin-observability"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "rag-studio-api"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

