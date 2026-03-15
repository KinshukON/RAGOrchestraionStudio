import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listIntegrations } from '../../api/integrations'
import { ARCH_PROFILES, COMPLEXITY_COLOR } from './archProfiles'
import './required-integrations.css'

interface Props {
  archType: string
  /** 'card' = compact panel on catalog tile, 'result' = richer advisor result panel */
  variant?: 'card' | 'result'
}

const HEALTH_DOT: Record<string, string> = {
  healthy:  '🟢',
  degraded: '🟡',
  error:    '🔴',
}

function healthDot(status?: string | null) {
  return HEALTH_DOT[status ?? ''] ?? '⚪'
}

export function RequiredIntegrationsPanel({ archType, variant = 'card' }: Props) {
  const navigate = useNavigate()
  const profile = ARCH_PROFILES[archType]

  const { data: integrations = [] } = useQuery({
    queryKey: ['integrations'],
    queryFn: listIntegrations,
    staleTime: 30_000,
  })

  if (!profile) return null

  const required = profile.integrations.filter(r => r.required)
  const optional = profile.integrations.filter(r => !r.required)

  // For each required integration, find a matching configured connector
  function matchedIntegration(category: string) {
    return integrations.find(i => i.provider_type === category || i.provider_type?.startsWith(category))
  }

  const missingRequired = required.filter(r => !matchedIntegration(r.category))
  const allRequiredMet = missingRequired.length === 0

  const complexityColor = COMPLEXITY_COLOR[profile.opsComplexity] ?? 'info'

  if (variant === 'card') {
    return (
      <div className="ri-card">
        {/* Complexity badge + status */}
        <div className="ri-card-header">
          <span className={`ri-complexity ri-complexity--${complexityColor}`}>
            {profile.opsComplexity} complexity
          </span>
          <span className={`ri-readiness ${allRequiredMet ? 'ri-readiness--ready' : 'ri-readiness--missing'}`}>
            {allRequiredMet
              ? '✓ Stack ready'
              : `${missingRequired.length} connector${missingRequired.length > 1 ? 's' : ''} missing`}
          </span>
        </div>

        {/* Required integrations row */}
        <div className="ri-row">
          {required.map(req => {
            const matched = matchedIntegration(req.category)
            return (
              <div
                key={req.category}
                className={`ri-chip ${matched ? 'ri-chip--ok' : 'ri-chip--missing'}`}
                title={matched
                  ? `${req.label}: ${matched.name} (${matched.health_status ?? 'untested'})`
                  : `${req.label} required — examples: ${req.examples}`}
              >
                <span className="ri-chip-dot">{healthDot(matched?.health_status)}</span>
                <span className="ri-chip-label">{req.label}</span>
              </div>
            )
          })}
        </div>

        {/* Configure CTA if missing */}
        {!allRequiredMet && (
          <button className="ri-configure-btn" onClick={() => navigate('/app/integrations')}>
            Configure missing connectors →
          </button>
        )}
      </div>
    )
  }

  // variant === 'result' — fuller panel for Architect Advisor result card
  return (
    <div className="ri-result">
      {/* Ops profile header */}
      <div className="ri-result-meta">
        <div className="ri-result-meta-item">
          <span className="ri-result-meta-label">Ops Complexity</span>
          <span className={`ri-complexity ri-complexity--${complexityColor}`}>
            {profile.opsComplexity}
          </span>
        </div>
        <div className="ri-result-meta-item">
          <span className="ri-result-meta-label">Est. Setup</span>
          <span className="ri-result-meta-value">{profile.estimatedSetupDays} days</span>
        </div>
        <div className="ri-result-meta-item">
          <span className="ri-result-meta-label">Cost Tier</span>
          <span className="ri-result-meta-value">{profile.costTier}</span>
        </div>
        <div className={`ri-result-meta-item ${allRequiredMet ? 'ri-result-meta-item--ok' : 'ri-result-meta-item--warn'}`}>
          <span className="ri-result-meta-label">Stack Ready</span>
          <span className="ri-result-meta-value">
            {allRequiredMet ? '✓ Yes' : `${missingRequired.length} missing`}
          </span>
        </div>
      </div>

      {/* Required integrations */}
      <div className="ri-result-section">
        <div className="ri-result-section-title">Required connectors</div>
        <div className="ri-result-chips">
          {required.map(req => {
            const matched = matchedIntegration(req.category)
            return (
              <div
                key={req.category}
                className={`ri-chip ri-chip--lg ${matched ? 'ri-chip--ok' : 'ri-chip--missing'}`}
                title={matched ? `${matched.name} — ${matched.health_status ?? 'untested'}` : req.examples}
              >
                <span className="ri-chip-dot">{healthDot(matched?.health_status)}</span>
                <span className="ri-chip-label">{req.label}</span>
                {matched && <span className="ri-chip-name">{matched.name}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Optional integrations */}
      {optional.length > 0 && (
        <div className="ri-result-section">
          <div className="ri-result-section-title">Optional connectors</div>
          <div className="ri-result-chips">
            {optional.map(req => {
              const matched = matchedIntegration(req.category)
              return (
                <div
                  key={req.category}
                  className={`ri-chip ri-chip--lg ri-chip--optional ${matched ? 'ri-chip--ok' : ''}`}
                  title={matched ? `${matched.name} — ${matched.health_status ?? 'untested'}` : `Optional — examples: ${req.examples}`}
                >
                  <span className="ri-chip-dot">{matched ? healthDot(matched.health_status) : '⚪'}</span>
                  <span className="ri-chip-label">{req.label}</span>
                  {matched && <span className="ri-chip-name">{matched.name}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Configure CTA */}
      {!allRequiredMet && (
        <button className="ri-configure-btn ri-configure-btn--result" onClick={() => navigate('/app/integrations')}>
          Configure {missingRequired.length} missing connector{missingRequired.length > 1 ? 's' : ''} →
        </button>
      )}

      {/* Use cases */}
      <div className="ri-result-section">
        <div className="ri-result-section-title">Typical use cases</div>
        <div className="ri-use-cases">
          {profile.useCases.map(uc => (
            <span key={uc} className="ri-use-case-chip">{uc}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
