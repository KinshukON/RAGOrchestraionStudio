import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import './architecture-catalog.css'
import { createDesignSession, listArchitectureCatalog, type ArchitectureTemplate } from '../../api/architectures'
import { fetchTieredCatalog, fetchGovernanceProfiles } from '../../api/analytics'
import { PageHeader } from '../ui/feedback'
import { PageSkeleton } from '../ui/Skeleton'
import { useToast } from '../ui/ToastContext'
import { ArchitectAdvisor } from './ArchitectAdvisor'
import { RequiredIntegrationsPanel } from './RequiredIntegrationsPanel'

type CatalogTileProps = {
  template: ArchitectureTemplate
  onDesign: () => void
  isDesigning: boolean
}

function CatalogTile({ template, onDesign, isDesigning }: CatalogTileProps) {
  return (
    <article className="arch-catalog-card" data-arch={template.type}>
      <header className="arch-catalog-card-header">
        <div className="arch-catalog-card-pill">{template.type.toUpperCase()} RAG</div>
        <h2>{template.title}</h2>
        <p className="arch-catalog-card-definition">{template.short_definition}</p>
      </header>
      <div className="arch-catalog-card-body">
        <section>
          <h3>When to use</h3>
          <p>{template.when_to_use}</p>
        </section>
        <section className="arch-catalog-card-row">
          <div>
            <h3>Strengths</h3>
            <ul>
              {Object.entries(template.strengths).map(([key, value]) => (
                <li key={key}>{String(value)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Tradeoffs</h3>
            <ul>
              {Object.entries(template.tradeoffs).map(([key, value]) => (
                <li key={key}>{String(value)}</li>
              ))}
            </ul>
          </div>
        </section>
        <section>
          <h3>Typical backends</h3>
          <div className="arch-catalog-backends">
            {Object.entries(template.typical_backends).map(([category, providers]) => (
              <div key={category} className="arch-catalog-backend-chip">
                <span className="arch-catalog-backend-label">{category}</span>
                <span className="arch-catalog-backend-values">{Array.isArray(providers) ? providers.join(', ') : String(providers)}</span>
              </div>
            ))}
          </div>
        </section>
      {/* Required integrations + ops complexity panel */}
      <RequiredIntegrationsPanel archType={template.type} variant="card" />
      </div>
      <footer className="arch-catalog-card-footer">
        <button className="arch-catalog-cta" type="button" onClick={onDesign} disabled={isDesigning}>
          {isDesigning ? 'Starting designer…' : 'Design this architecture'}
        </button>
      </footer>
    </article>
  )
}

export function ArchitectureCatalogPage() {
  const navigate = useNavigate()
  const { error } = useToast()
  const catalogRef = useRef<HTMLDivElement>(null)

  function scrollToCatalog() {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const catalogQuery = useQuery({
    queryKey: ['architecture-catalog'],
    queryFn: () => listArchitectureCatalog(),
  })

  const designMutation = useMutation({
    mutationFn: createDesignSession,
    onSuccess: session => {
      navigate(`/app/designer?sessionId=${session.id}`)
    },
    onError: () => error('Failed to start design session — please try again'),
  })

  const isLoading = catalogQuery.isLoading
  const isError = catalogQuery.isError
  const templates = catalogQuery.data ?? []

  // WS-5: Tiered catalog + governance
  const [viewMode, setViewMode] = useState<'flat' | 'tiered'>('flat')
  const tieredQ = useQuery({ queryKey: ['tiered-catalog'], queryFn: fetchTieredCatalog, enabled: viewMode === 'tiered' })
  const govQ = useQuery({ queryKey: ['governance-profiles'], queryFn: fetchGovernanceProfiles, enabled: viewMode === 'tiered' })

  if (isLoading) return <PageSkeleton cards={6} columns={3} title />

  return (
    <div className="arch-catalog-root">
      <PageHeader
        title="Architecture Catalog"
        description="Choose a RAG architecture to design. Each template encodes when to use it, core strengths and tradeoffs, and typical backend components."
        simulated
      />

      {/* ── Architect Advisor two-path entry ── */}
      <ArchitectAdvisor onBrowse={scrollToCatalog} />

      {/* ── Catalog anchor ── */}
      <div ref={catalogRef} />

      {/* ── View mode toggle ── */}
      {templates.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button className={`arch-catalog-cta ${viewMode === 'flat' ? '' : 'arch-catalog-cta--outlined'}`} style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }} onClick={() => setViewMode('flat')}>
            🗂️ Flat Grid
          </button>
          <button className={`arch-catalog-cta ${viewMode === 'tiered' ? '' : 'arch-catalog-cta--outlined'}`} style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }} onClick={() => setViewMode('tiered')}>
            🏢 Tiered View
          </button>
        </div>
      )}

      {isLoading && <div className="arch-catalog-status">Loading architecture templates…</div>}
      {isError && (
        <div className="arch-catalog-status arch-catalog-status--error">
          Failed to load catalog. Check that the backend is running and exposing `/api/architectures/catalog`.
        </div>
      )}

      {!isLoading && !isError && templates.length === 0 && (
        <div className="arch-catalog-empty">
          <div className="arch-catalog-empty-icon">🗂️</div>
          <h2>No architectures in the catalog yet</h2>
          <p>Load demo data to explore Vector, Graph, Temporal, and Hybrid RAG architectures.</p>
          <button
            className="arch-catalog-cta"
            onClick={async () => {
              await fetch('/api/demo/seed', { method: 'POST' })
              catalogQuery.refetch()
            }}
          >
            Load demo architectures
          </button>
        </div>
      )}

      {!isLoading && !isError && templates.length > 0 && viewMode === 'flat' && (
        <div className="arch-catalog-grid">
          {templates.map(template => (
            <CatalogTile
              key={template.key}
              template={template}
              isDesigning={designMutation.isPending}
              onDesign={() => designMutation.mutate({ architecture_type: template.type })}
            />
          ))}
        </div>
      )}

      {/* WS-5: Tiered catalog view */}
      {!isLoading && !isError && viewMode === 'tiered' && tieredQ.data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {(tieredQ.data.tiers as Array<Record<string, unknown>> ?? []).map(tier => (
            <div key={String(tier.tier_name ?? '')}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{String(tier.emoji ?? '📦')}</span>
                {String(tier.tier_name ?? '')} Architectures
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)', fontWeight: 500 }}>({String(tier.count ?? 0)})</span>
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>{String(tier.description ?? '')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {(Array.isArray(tier.architectures) ? tier.architectures : []).map((arch: Record<string, unknown>) => {
                  const govProfile = (govQ.data?.profiles as Record<string, Record<string, unknown>> ?? {})[String(arch.key ?? '')]
                  return (
                    <div key={String(arch.key ?? '')} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', transition: 'border-color 0.2s', cursor: 'pointer' }}
                      onClick={() => designMutation.mutate({ architecture_type: String(arch.type ?? '') as import('../../api/architectures').ArchitectureType })}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--color-accent)', marginBottom: '0.3rem' }}>
                        {String(arch.type ?? '').toUpperCase()} RAG
                      </div>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.3rem' }}>{String(arch.title ?? '')}</h3>
                      <p style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>{String(arch.short_definition ?? '')}</p>
                      {govProfile && (
                        <div style={{ marginTop: '0.6rem', fontSize: '0.7rem', color: 'var(--color-text-faint)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const }}>
                          <span>⚖️ Recall ≥ {String(govProfile.min_recall_threshold ?? '')}</span>
                          <span>💰 Max ${String(govProfile.max_monthly_cost ?? '')}/mo</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


