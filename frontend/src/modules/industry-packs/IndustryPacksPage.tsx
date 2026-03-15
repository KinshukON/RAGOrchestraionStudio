import { useState } from 'react'
import './industry-packs.css'

// ── Industry Pack definitions ─────────────────────────────────────────────
interface IndustryPack {
  id: string
  industry: string
  title: string
  subtitle: string
  emoji: string
  color: string
  architectures: string[]
  useCases: string[]
  integrations: string[]
  govPolicies: string[]
  benchmarks: string[]
  estimatedSetupDays: number
  maturity: 'GA' | 'Beta' | 'Preview'
}

const PACKS: IndustryPack[] = [
  {
    id: 'financial-services',
    industry: 'Financial Services',
    title: 'FS Compliance & Risk Assistant',
    subtitle: 'Regulatory Q&A, audit trail, citation enforcement',
    emoji: '🏦',
    color: 'blue',
    architectures: ['Vector RAG', 'Temporal RAG'],
    useCases: ['FINRA / SEC compliance Q&A', 'Risk memo summarisation', 'Regulatory change tracking', 'Audit evidence retrieval'],
    integrations: ['Bloomberg API', 'Thomson Reuters', 'SharePoint', 'S3 / GCS'],
    govPolicies: ['min_confidence ≥ 0.80', 'Always cite source', 'Restrict to approved LLMs', 'Audit every retrieval'],
    benchmarks: ['citation_recall', 'temporal_accuracy', 'hallucination_rate'],
    estimatedSetupDays: 7,
    maturity: 'GA',
  },
  {
    id: 'healthcare',
    industry: 'Healthcare & Life Sciences',
    title: 'Clinical Knowledge Assistant',
    subtitle: 'Drug interactions, clinical protocols, trial data',
    emoji: '🏥',
    color: 'green',
    architectures: ['Graph RAG', 'Hybrid RAG'],
    useCases: ['Drug-drug interaction lookup', 'Clinical guideline Q&A', 'Trial cohort matching', 'ICD-10 coding assistance'],
    integrations: ['Epic / Cerner FHIR', 'PubMed API', 'S3 (DICOM)', 'Snowflake'],
    govPolicies: ['HIPAA data residency', 'min_confidence ≥ 0.85', 'Human-in-loop for dx'],
    benchmarks: ['clinical_recall', 'icd_precision', 'citation_recall'],
    estimatedSetupDays: 10,
    maturity: 'GA',
  },
  {
    id: 'legal',
    industry: 'Legal & Professional Services',
    title: 'Contract Intelligence Suite',
    subtitle: 'Clause extraction, precedent search, risk flagging',
    emoji: '⚖️',
    color: 'purple',
    architectures: ['Vectorless RAG', 'Temporal RAG'],
    useCases: ['Clause comparison across MSAs', 'Precedent case retrieval', 'Redline & risk flagging', 'Regulatory obligation tracking'],
    integrations: ['iManage', 'NetDocuments', 'SharePoint', 'DocuSign'],
    govPolicies: ['Privilege filters', 'Reviewer-in-loop', 'Timestamped citations'],
    benchmarks: ['clause_recall', 'risk_precision', 'latency_p95'],
    estimatedSetupDays: 5,
    maturity: 'GA',
  },
  {
    id: 'retail',
    industry: 'Retail & E-Commerce',
    title: 'Product & Support Intelligence',
    subtitle: 'Catalog search, support deflection, personalised recs',
    emoji: '🛍️',
    color: 'orange',
    architectures: ['Vector RAG', 'Hybrid RAG'],
    useCases: ['Product search & recommendation', 'CX support deflection', 'Inventory Q&A', 'Review synthesis'],
    integrations: ['Shopify / Commercetools', 'Zendesk', 'S3', 'Pinecone'],
    govPolicies: ['PII masking', 'Inventory freshness ≤ 1h'],
    benchmarks: ['product_recall', 'deflection_rate', 'latency_p50'],
    estimatedSetupDays: 3,
    maturity: 'GA',
  },
  {
    id: 'manufacturing',
    industry: 'Manufacturing & Engineering',
    title: 'Technical Documentation Assistant',
    subtitle: 'Maintenance manuals, fault diagnostics, SOP search',
    emoji: '🏭',
    color: 'slate',
    architectures: ['Vector RAG', 'Graph RAG'],
    useCases: ['Equipment fault lookup', 'Preventive maintenance Q&A', 'SOP & safety protocol search', 'BOM / parts cross-reference'],
    integrations: ['SAP PM / S4HANA', 'OSIsoft PI', 'SharePoint', 'Snowflake'],
    govPolicies: ['Safety-critical citation', 'Version-locked manuals'],
    benchmarks: ['fault_recall', 'sop_precision', 'latency_p95'],
    estimatedSetupDays: 6,
    maturity: 'Beta',
  },
  {
    id: 'public-sector',
    industry: 'Government & Public Sector',
    title: 'Civic Knowledge & Policy Engine',
    subtitle: 'Policy Q&A, regulatory lookup, multilingual',
    emoji: '🏛️',
    color: 'teal',
    architectures: ['Vectorless RAG', 'Temporal RAG'],
    useCases: ['Regulation & policy search', 'Benefits eligibility lookup', 'Budget & procurement reference', 'Multilingual citizen services'],
    integrations: ['SharePoint / GovCMS', 'Salesforce Gov Cloud', 'Azure Blob', 'Elasticsearch'],
    govPolicies: ['IL2/IL4 data residency', 'No PII in retrieval', 'Audit every query'],
    benchmarks: ['policy_recall', 'multilingual_accuracy', 'latency_p95'],
    estimatedSetupDays: 8,
    maturity: 'Preview',
  },
]

const MATURITY_STYLE: Record<string, string> = {
  GA: 'ip-maturity ip-maturity--ga',
  Beta: 'ip-maturity ip-maturity--beta',
  Preview: 'ip-maturity ip-maturity--preview',
}

export function IndustryPacksPage() {
  const [selected, setSelected] = useState<IndustryPack | null>(null)

  if (selected) {
    return (
      <div className="ip-root">
        <div className="ip-detail-header">
          <button className="ip-back-btn" onClick={() => setSelected(null)}>← All packs</button>
          <span className={`ip-maturity ${MATURITY_STYLE[selected.maturity]}`}>{selected.maturity}</span>
        </div>

        <div className="ip-detail-hero" data-color={selected.color}>
          <span className="ip-detail-emoji">{selected.emoji}</span>
          <div>
            <div className="ip-detail-industry">{selected.industry}</div>
            <h1 className="ip-detail-title">{selected.title}</h1>
            <p className="ip-detail-subtitle">{selected.subtitle}</p>
          </div>
        </div>

        <div className="ip-detail-grid">
          <div className="ip-detail-card">
            <h3>Architectures</h3>
            <div className="ip-tags">
              {selected.architectures.map(a => <span key={a} className="ip-tag ip-tag--arch">{a}</span>)}
            </div>
          </div>
          <div className="ip-detail-card">
            <h3>Setup estimate</h3>
            <div className="ip-big-num">{selected.estimatedSetupDays} days</div>
          </div>
          <div className="ip-detail-card ip-detail-card--wide">
            <h3>Use cases included</h3>
            <ul className="ip-list">
              {selected.useCases.map(u => <li key={u}>{u}</li>)}
            </ul>
          </div>
          <div className="ip-detail-card">
            <h3>Required integrations</h3>
            <ul className="ip-list">
              {selected.integrations.map(i => <li key={i}>{i}</li>)}
            </ul>
          </div>
          <div className="ip-detail-card">
            <h3>Governance policies</h3>
            <ul className="ip-list ip-list--policy">
              {selected.govPolicies.map(p => <li key={p}>🛡️ {p}</li>)}
            </ul>
          </div>
          <div className="ip-detail-card">
            <h3>Benchmark suite</h3>
            <div className="ip-tags">
              {selected.benchmarks.map(b => <span key={b} className="ip-tag ip-tag--bench">{b}</span>)}
            </div>
          </div>
        </div>

        <div className="ip-detail-actions">
          <button className="ip-cta ip-cta--primary" onClick={() => window.location.href = '/app/designer'}>
            Launch Guided Designer →
          </button>
          <button className="ip-cta ip-cta--ghost" onClick={() => setSelected(null)}>
            Browse other packs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ip-root">
      <div className="ip-page-header">
        <h1>Industry Solution Packs</h1>
        <p>Pre-packaged RAG architectures with reference integrations, governance policies, and benchmark suites — configured for your vertical from day one.</p>
      </div>

      <div className="ip-grid">
        {PACKS.map(pack => (
          <button key={pack.id} className={`ip-card ip-card--${pack.color}`} onClick={() => setSelected(pack)}>
            <div className="ip-card-top">
              <span className="ip-card-emoji">{pack.emoji}</span>
              <span className={MATURITY_STYLE[pack.maturity]}>{pack.maturity}</span>
            </div>
            <div className="ip-card-industry">{pack.industry}</div>
            <h2 className="ip-card-title">{pack.title}</h2>
            <p className="ip-card-subtitle">{pack.subtitle}</p>
            <div className="ip-card-footer">
              <div className="ip-card-archs">
                {pack.architectures.map(a => <span key={a} className="ip-tag ip-tag--arch ip-tag--sm">{a}</span>)}
              </div>
              <span className="ip-card-days">{pack.estimatedSetupDays}d setup</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
