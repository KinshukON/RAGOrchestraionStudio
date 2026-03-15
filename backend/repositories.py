from typing import Any, Dict, List, Optional

from sqlmodel import select

from db import get_session
from models_core import Project, Integration, Environment
from models_architecture import WorkflowDefinitionRecord


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

    def update_health(self, external_id: str, health_status: str, last_tested_at) -> None:
        """Persist test-connection result without touching other fields."""
        from datetime import datetime as _dt
        with get_session() as session:
            statement = select(Integration).where(Integration.external_id == external_id)
            existing = session.exec(statement).first()
            if existing:
                existing.health_status = health_status
                existing.last_tested_at = last_tested_at
                existing.updated_at = _dt.utcnow()
                session.add(existing)
                session.commit()



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
                for key in (
                    "name",
                    "description",
                    "integration_bindings",
                    "runtime_profile",
                    "promotion_status",
                    "approval_state",
                    "health_status",
                ):
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
                runtime_profile=payload.get("runtime_profile") or {},
                promotion_status=payload.get("promotion_status") or "draft",
                approval_state=payload.get("approval_state"),
                health_status=payload.get("health_status"),
            )
            session.add(env)
            session.commit()
            session.refresh(env)
            return env

    def update_promotion(self, external_id: str, new_status: str) -> None:
        """Advance the promotion_status of an environment."""
        from datetime import datetime as _dt
        with get_session() as session:
            statement = select(Environment).where(Environment.external_id == external_id)
            existing = session.exec(statement).first()
            if existing:
                existing.promotion_status = new_status
                existing.updated_at = _dt.utcnow()
                session.add(existing)
                session.commit()



class WorkflowRepository:
    """Persist and load workflow definitions. Converts to/from the API shape (WorkflowDefinition)."""

    def _record_to_definition_dict(self, r: WorkflowDefinitionRecord) -> Dict[str, Any]:
        nodes = r.definition.get("nodes", [])
        edges = r.definition.get("edges", [])
        return {
            "id": r.workflow_id,
            "project_id": r.project_id or "",
            "name": r.name,
            "description": r.description,
            "version": r.version,
            "nodes": nodes,
            "edges": edges,
            "is_active": r.status == "active",
            "architecture_type": r.architecture_type or "",
        }

    def list_all(self) -> List[Dict[str, Any]]:
        with get_session() as session:
            rows = list(session.exec(select(WorkflowDefinitionRecord)))
        return [self._record_to_definition_dict(r) for r in rows]

    def list_by_architecture(self, architecture_type: str) -> List[Dict[str, Any]]:
        with get_session() as session:
            statement = select(WorkflowDefinitionRecord).where(
                WorkflowDefinitionRecord.architecture_type == architecture_type
            )
            rows = list(session.exec(statement))
        return [self._record_to_definition_dict(r) for r in rows]

    def get(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        with get_session() as session:
            row = session.get(WorkflowDefinitionRecord, workflow_id)
        return self._record_to_definition_dict(row) if row else None

    def create(self, definition_dict: Dict[str, Any]) -> Dict[str, Any]:
        wf_id = definition_dict["id"]
        with get_session() as session:
            existing = session.get(WorkflowDefinitionRecord, wf_id)
            if existing:
                raise ValueError(f"Workflow with id {wf_id!r} already exists")
            record = WorkflowDefinitionRecord(
                workflow_id=wf_id,
                project_id=definition_dict.get("project_id") or "",
                architecture_type=definition_dict.get("architecture_type") or "",
                name=definition_dict.get("name") or "",
                description=definition_dict.get("description") or "",
                version=definition_dict.get("version") or "1",
                status="active" if definition_dict.get("is_active") else "draft",
                definition={
                    "nodes": definition_dict.get("nodes", []),
                    "edges": definition_dict.get("edges", []),
                },
            )
            session.add(record)
            session.commit()
            session.refresh(record)
        return self._record_to_definition_dict(record)

    def update(self, workflow_id: str, definition_dict: Dict[str, Any]) -> Dict[str, Any]:
        with get_session() as session:
            record = session.get(WorkflowDefinitionRecord, workflow_id)
            if not record:
                raise ValueError(f"Workflow {workflow_id!r} not found")
            record.project_id = definition_dict.get("project_id") or ""
            record.architecture_type = definition_dict.get("architecture_type") or ""
            record.name = definition_dict.get("name") or ""
            record.description = definition_dict.get("description") or ""
            record.version = definition_dict.get("version") or record.version
            record.status = "active" if definition_dict.get("is_active") else "draft"
            record.definition = {
                "nodes": definition_dict.get("nodes", []),
                "edges": definition_dict.get("edges", []),
            }
            session.add(record)
            session.commit()
            session.refresh(record)
        return self._record_to_definition_dict(record)

    def delete(self, workflow_id: str) -> None:
        with get_session() as session:
            record = session.get(WorkflowDefinitionRecord, workflow_id)
            if not record:
                raise ValueError(f"Workflow {workflow_id!r} not found")
            session.delete(record)
            session.commit()

