import { useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import './architecture-catalog.css'
import { createDesignSession, listArchitectureCatalog, type ArchitectureTemplate } from '../../api/architectures'
import { PageHeader } from '../ui/feedback'
import { PageSkeleton } from '../ui/Skeleton'
import { useToast } from '../ui/ToastContext'
import { ArchitectAdvisor } from './ArchitectAdvisor'

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

      {!isLoading && !isError && templates.length > 0 && (
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
    </div>
  )
}


