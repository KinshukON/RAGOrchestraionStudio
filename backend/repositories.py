from typing import List, Optional

from sqlmodel import select

from db import get_session
from models_core import Project, Integration, Environment


class ProjectRepository:
    def list_projects(self) -> List[Project]:
        with get_session() as session:
            return list(session.exec(select(Project)))

    def create_project(self, project: Project) -> Project:
        with get_session() as session:
            session.add(project)
            session.commit()
            session.refresh(project)
            return project


class IntegrationRepository:
    def list_integrations(self) -> List[Integration]:
        with get_session() as session:
            return list(session.exec(select(Integration)))

    def get_by_external_id(self, external_id: str) -> Optional[Integration]:
        with get_session() as session:
            statement = select(Integration).where(Integration.external_id == external_id)
            return session.exec(statement).first()

    def upsert_from_payload(self, payload: dict) -> Integration:
        """
        Adapts the existing IntegrationConfig API payload into a persisted Integration row.
        """
        external_id = payload["id"]
        with get_session() as session:
            statement = select(Integration).where(Integration.external_id == external_id)
            existing = session.exec(statement).first()
            if existing:
                for key in (
                    "name",
                    "provider_type",
                    "credentials_reference",
                    "environment_mapping",
                    "default_usage_policies",
                    "reusable",
                    "health_status",
                ):
                    if key in payload:
                        setattr(existing, key, payload[key])
                session.add(existing)
                session.commit()
                session.refresh(existing)
                return existing

            integration = Integration(
                external_id=external_id,
                name=payload["name"],
                provider_type=payload["provider_type"],
                credentials_reference=payload["credentials_reference"],
                environment_mapping=payload.get("environment_mapping") or {},
                default_usage_policies=payload.get("default_usage_policies") or {},
                reusable=payload.get("reusable", True),
                health_status=payload.get("health_status"),
            )
            session.add(integration)
            session.commit()
            session.refresh(integration)
            return integration


class EnvironmentRepository:
    def list_environments(self) -> List[Environment]:
        with get_session() as session:
            return list(session.exec(select(Environment)))

    def get_by_external_id(self, external_id: str) -> Optional[Environment]:
        with get_session() as session:
            statement = select(Environment).where(Environment.external_id == external_id)
            return session.exec(statement).first()

    def upsert_from_payload(self, payload: dict) -> Environment:
        """
        Adapts the existing EnvironmentConfig API payload into a persisted Environment row.
        """
        external_id = payload["id"]
        with get_session() as session:
            statement = select(Environment).where(Environment.external_id == external_id)
            existing = session.exec(statement).first()
            if existing:
                for key in ("name", "description", "integration_bindings"):
                    if key in payload:
                        setattr(existing, key, payload[key])
                session.add(existing)
                session.commit()
                session.refresh(existing)
                return existing

            env = Environment(
                external_id=external_id,
                name=payload["name"],
                description=payload["description"],
                integration_bindings=payload.get("integration_bindings") or {},
            )
            session.add(env)
            session.commit()
            session.refresh(env)
            return env

