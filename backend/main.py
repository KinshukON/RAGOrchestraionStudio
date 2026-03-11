from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import projects, workflows, integrations, environments, governance
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


app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["workflows"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["integrations"])
app.include_router(environments.router, prefix="/api/environments", tags=["environments"])
app.include_router(governance.router, prefix="/api/governance", tags=["governance"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "rag-studio-api"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

