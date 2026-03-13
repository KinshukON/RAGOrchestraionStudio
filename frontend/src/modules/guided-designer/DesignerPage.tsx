import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import './designer.css'
import { getDesignSession, updateDesignSession, type DesignSession } from '../../api/architectures'
import { DesignerStepper } from './DesignerStepper'
import {
  createDefaultConfig,
  type DesignerWizardState,
  type ArchitectureConfig,
  type VectorRagConfig,
  type VectorlessRagConfig,
  type GraphRagConfig,
  type TemporalRagConfig,
  type HybridRagConfig,
  type CustomRagConfig,
} from './designerTypes'
import { VectorDesignerStepGroups } from './designerVector'
import { VectorlessDesignerStepGroups } from './designerVectorless'
import { GraphDesignerStepGroups } from './designerGraph'
import { TemporalDesignerStepGroups } from './designerTemporal'
import { HybridDesignerStepGroups } from './designerHybrid'
import { CustomDesignerStepGroups } from './designerCustom'

function useSessionIdFromQuery() {
  const location = useLocation()
  const search = new URLSearchParams(location.search)
  const id = search.get('sessionId')
  return id ? Number(id) : null
}

function toWizardState(session: DesignSession): DesignerWizardState {
  const raw = (session.wizard_state as DesignerWizardState | undefined) ?? null
  if (raw && raw.architecture_type === session.architecture_type && raw.architecture_config) {
    return raw
  }
  return {
    architecture_type: session.architecture_type,
    architecture_config: createDefaultConfig(session.architecture_type),
  }
}

export function DesignerPage() {
  const sessionId = useSessionIdFromQuery()

  const sessionQuery = useQuery({
    enabled: sessionId != null,
    queryKey: ['design-session', sessionId],
    queryFn: () => getDesignSession(sessionId as number),
  })

  const [wizardState, setWizardState] = useState<DesignerWizardState | null>(null)
  const [activeStepId, setActiveStepId] = useState<'architecture' | 'retrieval' | 'answering'>('architecture')

  useEffect(() => {
    if (sessionQuery.data) {
      setWizardState(toWizardState(sessionQuery.data))
    }
  }, [sessionQuery.data])

  const saveMutation = useMutation({
    mutationFn: (state: DesignerWizardState) =>
      updateDesignSession(sessionId as number, {
        wizard_state: state as unknown as Record<string, unknown>,
      }),
  })

  const steps = useMemo(
    () => [
      { id: 'architecture', label: 'Architecture profile' },
      { id: 'retrieval', label: 'Retrieval & routing' },
      { id: 'answering', label: 'Answering & governance (preview)' },
    ],
    [],
  )

  function updateConfig(nextConfig: ArchitectureConfig) {
    if (!wizardState) return
    setWizardState({ ...wizardState, architecture_config: nextConfig })
  }

  function renderConfig() {
    if (!wizardState) return null
    const config = wizardState.architecture_config
    switch (config.type) {
      case 'vector':
        return (
          <VectorDesignerStepGroups
            value={config.config as VectorRagConfig}
            onChange={next => updateConfig({ type: 'vector', config: next })}
          />
        )
      case 'vectorless':
        return (
          <VectorlessDesignerStepGroups
            value={config.config as VectorlessRagConfig}
            onChange={next => updateConfig({ type: 'vectorless', config: next })}
          />
        )
      case 'graph':
        return (
          <GraphDesignerStepGroups
            value={config.config as GraphRagConfig}
            onChange={next => updateConfig({ type: 'graph', config: next })}
          />
        )
      case 'temporal':
        return (
          <TemporalDesignerStepGroups
            value={config.config as TemporalRagConfig}
            onChange={next => updateConfig({ type: 'temporal', config: next })}
          />
        )
      case 'hybrid':
        return (
          <HybridDesignerStepGroups
            value={config.config as HybridRagConfig}
            onChange={next => updateConfig({ type: 'hybrid', config: next })}
          />
        )
      case 'custom':
      default:
        return (
          <CustomDesignerStepGroups
            value={config.config as CustomRagConfig}
            onChange={next => updateConfig({ type: 'custom', config: next })}
          />
        )
    }
  }

  const loading = sessionId == null || sessionQuery.isLoading || !wizardState

  return (
    <div className="designer-root">
      <header className="designer-header">
        <h1>Guided Designer</h1>
        <p>
          Configure your selected RAG architecture without code. Each step captures decisions that will later generate
          an executable workflow in the builder.
        </p>
      </header>

      {sessionId == null && (
        <div className="designer-main">
          <p>
            No design session id was provided. Start from the Architecture Catalog and choose an architecture to launch a
            new guided design session.
          </p>
        </div>
      )}

      {sessionId != null && (
        <div className="designer-layout">
          <DesignerStepper steps={steps} activeStepId={activeStepId} onStepChange={id => setActiveStepId(id as typeof activeStepId)} />
          <div className="designer-main">
            {loading && <p>Loading design session…</p>}
            {!loading && (
              <>
                {renderConfig()}
                <div className="designer-footer">
                  <span>
                    Session #{sessionId} · Architecture type: <strong>{wizardState?.architecture_type}</strong>
                  </span>
                  <div className="designer-actions">
                    <button
                      type="button"
                      className="designer-button designer-button--secondary"
                      disabled={saveMutation.isPending}
                      onClick={() => wizardState && saveMutation.mutate(wizardState)}
                    >
                      {saveMutation.isPending ? 'Saving…' : 'Save draft'}
                    </button>
                    <button type="button" className="designer-button designer-button--primary" disabled>
                      Generate workflow (coming soon)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

