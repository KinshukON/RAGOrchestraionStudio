import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createDesignSession, type ArchitectureType } from '../../api/architectures'
import { listIntegrations } from '../../api/integrations'
import { useToast } from '../ui/ToastContext'
import './industry-packs.css'

// ── Industry Pack definitions ─────────────────────────────────────────────

interface InfraQuestion {
  id: string
  question: string
  options: { label: string; value: string; hint?: string }[]
}

interface IndustryPack {
  id: string
  industry: string
  title: string
  subtitle: string
  emoji: string
  color: string
  architectures: { name: string; key: ArchitectureType }[]
  useCases: { label: string; value: string; description?: string }[]
  integrations: string[]
  govPolicies: string[]
  benchmarks: string[]
  estimatedSetupDays: number
  maturity: 'GA' | 'Beta' | 'Preview'
  infraQuestions: InfraQuestion[]
  /** Recommendation logic: given use case + answers, pick the best arch */
  recommend: (useCase: string, answers: Record<string, string>) => {
    archKey: ArchitectureType
    archName: string
    rationale: string
    confidence: number
  }
}

// ── Pack definitions with questions & recommendation logic ────────────────

const PACKS: IndustryPack[] = [
  {
    id: 'financial-services',
    industry: 'Financial Services',
    title: 'FS Compliance & Risk Assistant',
    subtitle: 'Regulatory Q&A, audit trail, citation enforcement',
    emoji: '🏦',
    color: 'blue',
    architectures: [
      { name: 'Vector RAG', key: 'vector' },
      { name: 'Temporal RAG', key: 'temporal' },
    ],
    useCases: [
      { label: 'FINRA / SEC compliance Q&A', value: 'compliance_qa', description: 'Answer regulatory queries against compliance docs, SEC filings, and internal policies' },
      { label: 'Risk memo summarisation', value: 'risk_memo', description: 'Summarise risk reports and identify key risk indicators across memos' },
      { label: 'Regulatory change tracking', value: 'reg_change', description: 'Monitor and surface regulatory changes relevant to your firm' },
      { label: 'Audit evidence retrieval', value: 'audit_evidence', description: 'Retrieve cited evidence for audit inquiries with full traceability' },
    ],
    integrations: ['Bloomberg API', 'Thomson Reuters', 'SharePoint', 'S3 / GCS'],
    govPolicies: ['min_confidence ≥ 0.80', 'Always cite source', 'Restrict to approved LLMs', 'Audit every retrieval'],
    benchmarks: ['citation_recall', 'temporal_accuracy', 'hallucination_rate'],
    estimatedSetupDays: 7,
    maturity: 'GA',
    infraQuestions: [
      {
        id: 'regulatory_bodies',
        question: 'Which regulatory bodies do you need to comply with?',
        options: [
          { label: 'FINRA / SEC', value: 'finra_sec', hint: 'US securities regulation' },
          { label: 'CFTC / NFA', value: 'cftc', hint: 'Derivatives and commodities' },
          { label: 'FCA / PRA', value: 'fca', hint: 'UK financial regulation' },
          { label: 'Multi-jurisdiction', value: 'multi', hint: 'Multiple regulatory regimes' },
        ],
      },
      {
        id: 'data_sources',
        question: 'Where is your primary financial data stored?',
        options: [
          { label: 'Bloomberg / Reuters feeds', value: 'market_data', hint: 'Real-time or historical market data' },
          { label: 'SharePoint / internal DMS', value: 'internal_docs', hint: 'Policy docs, memos, reports' },
          { label: 'Data warehouse / Snowflake', value: 'warehouse', hint: 'Structured analytics data' },
          { label: 'Mixed sources', value: 'mixed', hint: 'Combination of the above' },
        ],
      },
      {
        id: 'data_freshness',
        question: 'How critical is data freshness for your use case?',
        options: [
          { label: 'Real-time (< 1 hour)', value: 'realtime', hint: 'Trading compliance, live risk' },
          { label: 'Daily refresh', value: 'daily', hint: 'Regulatory reporting, end-of-day' },
          { label: 'Weekly / on-demand', value: 'periodic', hint: 'Audit prep, policy review' },
        ],
      },
    ],
    recommend: (useCase, answers) => {
      if (answers.data_freshness === 'realtime' || useCase === 'reg_change') {
        return { archKey: 'temporal', archName: 'Temporal RAG', confidence: 92,
          rationale: 'Your use case requires tracking changes over time and retrieving the most current data. Temporal RAG uses time-decay scoring and recency filters to ensure answers reflect the latest regulatory state.' }
      }
      return { archKey: 'vector', archName: 'Vector RAG', confidence: 88,
        rationale: 'Semantic search over compliance documentation delivers the best precision for regulatory Q&A. Vector RAG with citation enforcement ensures every answer is traceable to source documents.' }
    },
  },
  {
    id: 'healthcare',
    industry: 'Healthcare & Life Sciences',
    title: 'Clinical Knowledge Assistant',
    subtitle: 'Drug interactions, clinical protocols, trial data',
    emoji: '🏥',
    color: 'green',
    architectures: [
      { name: 'Graph RAG', key: 'graph' },
      { name: 'Hybrid RAG', key: 'hybrid' },
    ],
    useCases: [
      { label: 'Drug-drug interaction lookup', value: 'ddi', description: 'Check for interactions between medications using clinical knowledge graphs' },
      { label: 'Clinical guideline Q&A', value: 'clinical_qa', description: 'Answer questions against clinical protocols, CPGs, and treatment guidelines' },
      { label: 'Trial cohort matching', value: 'trial_matching', description: 'Match patients to clinical trials based on eligibility criteria' },
      { label: 'ICD-10 coding assistance', value: 'icd_coding', description: 'Suggest diagnosis codes from clinical notes and discharge summaries' },
    ],
    integrations: ['Epic / Cerner FHIR', 'PubMed API', 'S3 (DICOM)', 'Snowflake'],
    govPolicies: ['HIPAA data residency', 'min_confidence ≥ 0.85', 'Human-in-loop for dx'],
    benchmarks: ['clinical_recall', 'icd_precision', 'citation_recall'],
    estimatedSetupDays: 10,
    maturity: 'GA',
    infraQuestions: [
      {
        id: 'ehr_system',
        question: 'Which EHR system does your organisation use?',
        options: [
          { label: 'Epic', value: 'epic', hint: 'Epic Systems FHIR APIs' },
          { label: 'Cerner / Oracle Health', value: 'cerner', hint: 'Cerner Millennium' },
          { label: 'Meditech / Allscripts', value: 'other_ehr', hint: 'Other EHR platforms' },
          { label: 'No EHR integration needed', value: 'none', hint: 'PubMed/literature only' },
        ],
      },
      {
        id: 'data_types',
        question: 'What clinical data types will you primarily work with?',
        options: [
          { label: 'Structured (FHIR resources)', value: 'structured', hint: 'Conditions, medications, observations' },
          { label: 'Unstructured notes', value: 'notes', hint: 'Discharge summaries, progress notes' },
          { label: 'Medical images (DICOM)', value: 'imaging', hint: 'Radiology, pathology' },
          { label: 'Mix of structured + unstructured', value: 'mixed', hint: 'Full clinical dataset' },
        ],
      },
      {
        id: 'hipaa_tier',
        question: 'What is your HIPAA compliance tier?',
        options: [
          { label: 'Covered entity (full PHI)', value: 'covered', hint: 'Hospitals, clinics, payers' },
          { label: 'Business associate', value: 'ba', hint: 'IT vendors processing PHI' },
          { label: 'De-identified data only', value: 'deidentified', hint: 'Research use, no PHI' },
        ],
      },
    ],
    recommend: (useCase, answers) => {
      if (useCase === 'ddi' || useCase === 'trial_matching' || answers.data_types === 'structured') {
        return { archKey: 'graph', archName: 'Graph RAG', confidence: 94,
          rationale: 'Drug interaction lookups and trial matching require multi-hop reasoning across connected entities (drugs, conditions, trials). Graph RAG excels at traversing clinical knowledge graphs to find these relationships.' }
      }
      return { archKey: 'hybrid', archName: 'Hybrid RAG', confidence: 90,
        rationale: 'Combining semantic vector search with structured medical coding lookups delivers the highest accuracy for clinical Q&A. Hybrid RAG fuses both strategies with cross-encoder reranking.' }
    },
  },
  {
    id: 'legal',
    industry: 'Legal & Professional Services',
    title: 'Contract Intelligence Suite',
    subtitle: 'Clause extraction, precedent search, risk flagging',
    emoji: '⚖️',
    color: 'purple',
    architectures: [
      { name: 'Vectorless RAG', key: 'vectorless' },
      { name: 'Temporal RAG', key: 'temporal' },
    ],
    useCases: [
      { label: 'Clause comparison across MSAs', value: 'clause_compare', description: 'Compare specific clauses (indemnity, limitation of liability) across master service agreements' },
      { label: 'Precedent case retrieval', value: 'precedent', description: 'Find relevant case law and precedent decisions for a given legal question' },
      { label: 'Redline & risk flagging', value: 'redline', description: 'Identify risky clauses and deviations from standard templates in contracts' },
      { label: 'Regulatory obligation tracking', value: 'reg_obligation', description: 'Track regulatory obligation changes and their impact on existing contracts' },
    ],
    integrations: ['iManage', 'NetDocuments', 'SharePoint', 'DocuSign'],
    govPolicies: ['Privilege filters', 'Reviewer-in-loop', 'Timestamped citations'],
    benchmarks: ['clause_recall', 'risk_precision', 'latency_p95'],
    estimatedSetupDays: 5,
    maturity: 'GA',
    infraQuestions: [
      {
        id: 'dms_platform',
        question: 'Which document management system do you use?',
        options: [
          { label: 'iManage Work', value: 'imanage', hint: 'Dominant in Am Law 200' },
          { label: 'NetDocuments', value: 'netdocs', hint: 'Cloud-native DMS' },
          { label: 'SharePoint / OneDrive', value: 'sharepoint', hint: 'Microsoft ecosystem' },
          { label: 'Other / custom', value: 'other', hint: 'Legacy or bespoke system' },
        ],
      },
      {
        id: 'jurisdiction',
        question: 'What jurisdictions do you primarily operate in?',
        options: [
          { label: 'US (state + federal)', value: 'us', hint: 'US law, UCC, federal regs' },
          { label: 'UK / Common law', value: 'uk', hint: 'English law, precedent-heavy' },
          { label: 'EU / Civil law', value: 'eu', hint: 'GDPR, civil code systems' },
          { label: 'Multi-jurisdictional', value: 'multi', hint: 'Cross-border practice' },
        ],
      },
      {
        id: 'privilege_controls',
        question: 'Do you need attorney-client privilege controls?',
        options: [
          { label: 'Yes, strict privilege barriers', value: 'strict', hint: 'Ethical wall enforcement' },
          { label: 'Basic access controls sufficient', value: 'basic', hint: 'Role-based access only' },
          { label: 'Not applicable', value: 'na', hint: 'Internal legal ops / compliance' },
        ],
      },
    ],
    recommend: (useCase, answers) => {
      if (useCase === 'reg_obligation' || answers.jurisdiction === 'multi') {
        return { archKey: 'temporal', archName: 'Temporal RAG', confidence: 87,
          rationale: 'Regulatory obligation tracking and multi-jurisdictional practice require time-aware retrieval to surface the correct version of regulations and contracts as of a specific date.' }
      }
      return { archKey: 'vectorless', archName: 'Vectorless RAG', confidence: 91,
        rationale: 'Legal document retrieval benefits from precise keyword and clause matching (BM25) without embedding drift. Vectorless RAG preserves exact legal terminology and avoids hallucinated paraphrasing.' }
    },
  },
  {
    id: 'retail',
    industry: 'Retail & E-Commerce',
    title: 'Product & Support Intelligence',
    subtitle: 'Catalog search, support deflection, personalised recs',
    emoji: '🛍️',
    color: 'orange',
    architectures: [
      { name: 'Vector RAG', key: 'vector' },
      { name: 'Hybrid RAG', key: 'hybrid' },
    ],
    useCases: [
      { label: 'Product search & recommendation', value: 'product_search', description: 'Semantic product search with personalised recommendations' },
      { label: 'CX support deflection', value: 'support_deflection', description: 'Auto-resolve common customer queries to reduce support ticket volume' },
      { label: 'Inventory Q&A', value: 'inventory_qa', description: 'Real-time inventory availability and fulfilment queries' },
      { label: 'Review synthesis', value: 'review_synthesis', description: 'Summarise product reviews and extract sentiment patterns' },
    ],
    integrations: ['Shopify / Commercetools', 'Zendesk', 'S3', 'Pinecone'],
    govPolicies: ['PII masking', 'Inventory freshness ≤ 1h'],
    benchmarks: ['product_recall', 'deflection_rate', 'latency_p50'],
    estimatedSetupDays: 3,
    maturity: 'GA',
    infraQuestions: [
      {
        id: 'commerce_platform',
        question: 'Which commerce platform do you use?',
        options: [
          { label: 'Shopify / Shopify Plus', value: 'shopify', hint: 'Shopify APIs' },
          { label: 'Commercetools', value: 'commercetools', hint: 'Headless commerce' },
          { label: 'Salesforce Commerce Cloud', value: 'sfcc', hint: 'B2C Commerce' },
          { label: 'Custom / self-hosted', value: 'custom', hint: 'Own e-commerce stack' },
        ],
      },
      {
        id: 'catalog_size',
        question: 'How large is your product catalog?',
        options: [
          { label: 'Small (< 10K SKUs)', value: 'small', hint: 'Specialty / boutique' },
          { label: 'Medium (10K–100K)', value: 'medium', hint: 'Mid-market retailer' },
          { label: 'Large (100K+ SKUs)', value: 'large', hint: 'Enterprise / marketplace' },
        ],
      },
      {
        id: 'realtime_inventory',
        question: 'Do you need real-time inventory data in responses?',
        options: [
          { label: 'Yes, live stock levels', value: 'realtime', hint: 'Stock-aware recommendations' },
          { label: 'Periodic sync is fine', value: 'periodic', hint: 'Daily or hourly refresh' },
          { label: 'No inventory data needed', value: 'no', hint: 'Content / support only' },
        ],
      },
    ],
    recommend: (useCase, answers) => {
      if (useCase === 'support_deflection' || answers.catalog_size === 'large') {
        return { archKey: 'hybrid', archName: 'Hybrid RAG', confidence: 89,
          rationale: 'Large catalogs and support deflection benefit from combining semantic and keyword search. Hybrid RAG fuses both strategies to handle diverse query patterns — exact product names, vague descriptions, and natural language questions.' }
      }
      return { archKey: 'vector', archName: 'Vector RAG', confidence: 86,
        rationale: 'Semantic vector search excels at understanding product intent ("warm waterproof jacket under £100") and generating personalised recommendations from unstructured product descriptions and reviews.' }
    },
  },
  {
    id: 'manufacturing',
    industry: 'Manufacturing & Engineering',
    title: 'Technical Documentation Assistant',
    subtitle: 'Maintenance manuals, fault diagnostics, SOP search',
    emoji: '🏭',
    color: 'slate',
    architectures: [
      { name: 'Vector RAG', key: 'vector' },
      { name: 'Graph RAG', key: 'graph' },
    ],
    useCases: [
      { label: 'Equipment fault lookup', value: 'fault_lookup', description: 'Search fault codes and troubleshooting procedures across equipment manuals' },
      { label: 'Preventive maintenance Q&A', value: 'pm_qa', description: 'Answer maintenance schedule and procedure queries from PM plans' },
      { label: 'SOP & safety protocol search', value: 'sop_search', description: 'Find standard operating procedures and safety protocols quickly' },
      { label: 'BOM / parts cross-reference', value: 'bom_xref', description: 'Cross-reference parts across bills of materials and supplier catalogs' },
    ],
    integrations: ['SAP PM / S4HANA', 'OSIsoft PI', 'SharePoint', 'Snowflake'],
    govPolicies: ['Safety-critical citation', 'Version-locked manuals'],
    benchmarks: ['fault_recall', 'sop_precision', 'latency_p95'],
    estimatedSetupDays: 6,
    maturity: 'Beta',
    infraQuestions: [
      {
        id: 'erp_system',
        question: 'Which ERP / CMMS system do you use?',
        options: [
          { label: 'SAP PM / S4HANA', value: 'sap', hint: 'SAP Plant Maintenance' },
          { label: 'Maximo / IBM', value: 'maximo', hint: 'IBM Maximo EAM' },
          { label: 'Oracle E-Business Suite', value: 'oracle', hint: 'Oracle ERP' },
          { label: 'Other / custom', value: 'other', hint: 'Legacy or custom CMMS' },
        ],
      },
      {
        id: 'safety_critical',
        question: 'Is this a safety-critical environment?',
        options: [
          { label: 'Yes — ISO 45001 / OSHA regulated', value: 'yes', hint: 'Strict audit trail required' },
          { label: 'Standard industrial', value: 'standard', hint: 'Normal manufacturing ops' },
          { label: 'Office / non-hazardous', value: 'office', hint: 'Administrative environment' },
        ],
      },
      {
        id: 'connectivity',
        question: 'Does the deployment need offline / edge support?',
        options: [
          { label: 'Yes, air-gapped / edge', value: 'offline', hint: 'Factory floor, no internet' },
          { label: 'Cloud-connected is fine', value: 'cloud', hint: 'Standard cloud deployment' },
        ],
      },
    ],
    recommend: (useCase, answers) => {
      if (useCase === 'bom_xref' || useCase === 'fault_lookup') {
        return { archKey: 'graph', archName: 'Graph RAG', confidence: 91,
          rationale: 'BOM cross-referencing and fault diagnostics involve traversing equipment-part-procedure relationships. Graph RAG excels at multi-hop traversal through technical knowledge graphs.' }
      }
      return { archKey: 'vector', archName: 'Vector RAG', confidence: 85,
        rationale: 'SOP and maintenance procedure search works well with semantic embedding over technical documents. Vector RAG handles the natural language variation in how technicians describe problems.' }
    },
  },
  {
    id: 'public-sector',
    industry: 'Government & Public Sector',
    title: 'Civic Knowledge & Policy Engine',
    subtitle: 'Policy Q&A, regulatory lookup, multilingual',
    emoji: '🏛️',
    color: 'teal',
    architectures: [
      { name: 'Vectorless RAG', key: 'vectorless' },
      { name: 'Temporal RAG', key: 'temporal' },
    ],
    useCases: [
      { label: 'Regulation & policy search', value: 'policy_search', description: 'Search across legislation, policy documents, and government publications' },
      { label: 'Benefits eligibility lookup', value: 'benefits', description: 'Determine citizen eligibility for government benefits and programmes' },
      { label: 'Budget & procurement reference', value: 'procurement', description: 'Reference procurement rules, budget documents, and contract templates' },
      { label: 'Multilingual citizen services', value: 'multilingual', description: 'Answer citizen queries in multiple languages with official translations' },
    ],
    integrations: ['SharePoint / GovCMS', 'Salesforce Gov Cloud', 'Azure Blob', 'Elasticsearch'],
    govPolicies: ['IL2/IL4 data residency', 'No PII in retrieval', 'Audit every query'],
    benchmarks: ['policy_recall', 'multilingual_accuracy', 'latency_p95'],
    estimatedSetupDays: 8,
    maturity: 'Preview',
    infraQuestions: [
      {
        id: 'impact_level',
        question: 'What is your required security Impact Level?',
        options: [
          { label: 'IL2 (public data)', value: 'il2', hint: 'Non-CUI, low sensitivity' },
          { label: 'IL4 (CUI)', value: 'il4', hint: 'Controlled Unclassified Information' },
          { label: 'IL5 (higher CUI)', value: 'il5', hint: 'Mission-critical CUI' },
          { label: 'Standard / non-DoD', value: 'standard', hint: 'Non-military government' },
        ],
      },
      {
        id: 'multilingual',
        question: 'Do you need multilingual support?',
        options: [
          { label: 'Yes, 3+ languages', value: 'multi', hint: 'Federal multilingual mandate' },
          { label: 'Bilingual (EN + one other)', value: 'bilingual', hint: 'e.g. English + Spanish' },
          { label: 'English only', value: 'en_only', hint: 'Single language' },
        ],
      },
      {
        id: 'data_residency',
        question: 'Any data residency requirements?',
        options: [
          { label: 'US-only / FedRAMP', value: 'fedramp', hint: 'FedRAMP authorized cloud' },
          { label: 'Country-specific', value: 'country', hint: 'Sovereign cloud required' },
          { label: 'No residency constraint', value: 'none', hint: 'Any cloud region' },
        ],
      },
    ],
    recommend: (useCase, answers) => {
      if (useCase === 'policy_search' || useCase === 'procurement') {
        return { archKey: 'temporal', archName: 'Temporal RAG', confidence: 88,
          rationale: 'Policy and procurement documents change frequently. Temporal RAG ensures retrieval of the version in effect at a given date, preventing citation of superseded regulations.' }
      }
      return { archKey: 'vectorless', archName: 'Vectorless RAG', confidence: 85,
        rationale: 'Government document retrieval requires exact keyword precision (bill numbers, statute references, benefit codes). Vectorless BM25 search ensures precise matching without embedding ambiguity.' }
    },
  },
]

// ── Wizard step type ─────────────────────────────────────────────────────

type WizardStep = 'use_case' | 'infrastructure' | 'recommendation' | null

const MATURITY_STYLE: Record<string, string> = {
  GA: 'ip-maturity ip-maturity--ga',
  Beta: 'ip-maturity ip-maturity--beta',
  Preview: 'ip-maturity ip-maturity--preview',
}

// ── Main Component ───────────────────────────────────────────────────────

export function IndustryPacksPage() {
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  const [selected, setSelected] = useState<IndustryPack | null>(null)

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>(null)
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null)
  const [infraAnswers, setInfraAnswers] = useState<Record<string, string>>({})
  const [currentInfraIdx, setCurrentInfraIdx] = useState(0)

  // Integration health (for readiness score)
  const integsQ = useQuery({ queryKey: ['integrations'], queryFn: listIntegrations })
  const existingIntegrations = integsQ.data ?? []

  const designSessionMutation = useMutation({
    mutationFn: createDesignSession,
    onSuccess: (session) => {
      success('Design session created! Opening Guided Designer…')
      navigate(`/app/designer?sessionId=${session.id}`)
    },
    onError: () => toastError('Failed to create design session'),
  })

  // Compute readiness for selected pack
  const readinessInfo = useMemo(() => {
    if (!selected) return { configured: 0, total: 0, pct: 0 }
    const total = selected.integrations.length
    const existingNames = existingIntegrations.map(i => i.name?.toLowerCase() ?? '')
    const configured = selected.integrations.filter(req =>
      existingNames.some(e => e.includes(req.toLowerCase().split(' ')[0]))
    ).length
    return { configured, total, pct: total > 0 ? Math.round((configured / total) * 100) : 0 }
  }, [selected, existingIntegrations])

  // Recommendation result
  const recommendation = useMemo(() => {
    if (!selected || !selectedUseCase) return null
    return selected.recommend(selectedUseCase, infraAnswers)
  }, [selected, selectedUseCase, infraAnswers])

  // ── Wizard handlers ──────────────────────────────────────────────────

  function startWizard() {
    setWizardStep('use_case')
    setSelectedUseCase(null)
    setInfraAnswers({})
    setCurrentInfraIdx(0)
  }

  function selectUseCase(value: string) {
    setSelectedUseCase(value)
    setCurrentInfraIdx(0)
    setInfraAnswers({})
    setWizardStep('infrastructure')
  }

  function answerInfra(questionId: string, value: string) {
    const newAnswers = { ...infraAnswers, [questionId]: value }
    setInfraAnswers(newAnswers)

    if (selected && currentInfraIdx < selected.infraQuestions.length - 1) {
      setCurrentInfraIdx(prev => prev + 1)
    } else {
      setWizardStep('recommendation')
    }
  }

  function launchDesigner() {
    if (!recommendation || !selected) return
    designSessionMutation.mutate({ architecture_type: recommendation.archKey })
  }

  function quickLaunch() {
    if (!selected) return
    // Quick launch with the pack's primary architecture
    designSessionMutation.mutate({ architecture_type: selected.architectures[0].key })
  }

  // ── Wizard UI ──────────────────────────────────────────────────────────

  if (selected && wizardStep) {
    const useCaseLabel = selected.useCases.find(u => u.value === selectedUseCase)?.label

    return (
      <div className="ip-root">
        <div className="ip-detail-header">
          <button className="ip-back-btn" onClick={() => { setWizardStep(null); setSelectedUseCase(null) }}>← Back to pack</button>
          <span className={MATURITY_STYLE[selected.maturity]}>{selected.maturity}</span>
        </div>

        {/* Wizard progress */}
        <div className="ip-wizard-progress">
          <div className={`ip-wiz-step ${wizardStep === 'use_case' ? 'ip-wiz-step--active' : selectedUseCase ? 'ip-wiz-step--done' : ''}`}>
            <span className="ip-wiz-num">1</span>
            <span>Use Case</span>
          </div>
          <div className="ip-wiz-connector" />
          <div className={`ip-wiz-step ${wizardStep === 'infrastructure' ? 'ip-wiz-step--active' : wizardStep === 'recommendation' ? 'ip-wiz-step--done' : ''}`}>
            <span className="ip-wiz-num">2</span>
            <span>Infrastructure</span>
          </div>
          <div className="ip-wiz-connector" />
          <div className={`ip-wiz-step ${wizardStep === 'recommendation' ? 'ip-wiz-step--active' : ''}`}>
            <span className="ip-wiz-num">3</span>
            <span>Recommendation</span>
          </div>
        </div>

        {/* Step 1: Use Case Selection */}
        {wizardStep === 'use_case' && (
          <div className="ip-wizard-body">
            <h2 className="ip-wiz-heading">{selected.emoji} Select your primary use case</h2>
            <p className="ip-wiz-desc">Choose the scenario most relevant to your {selected.industry} needs.</p>
            <div className="ip-usecase-grid">
              {selected.useCases.map(uc => (
                <button key={uc.value} className="ip-usecase-card" onClick={() => selectUseCase(uc.value)}>
                  <strong>{uc.label}</strong>
                  {uc.description && <span className="ip-usecase-desc">{uc.description}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Infrastructure Questions */}
        {wizardStep === 'infrastructure' && selected.infraQuestions[currentInfraIdx] && (
          <div className="ip-wizard-body">
            <div className="ip-wiz-ctx">
              <span className="ip-wiz-ctx-label">Use case:</span> {useCaseLabel}
            </div>
            <h2 className="ip-wiz-heading">{selected.infraQuestions[currentInfraIdx].question}</h2>
            <p className="ip-wiz-desc">Question {currentInfraIdx + 1} of {selected.infraQuestions.length}</p>
            <div className="ip-infra-options">
              {selected.infraQuestions[currentInfraIdx].options.map(opt => (
                <button
                  key={opt.value}
                  className="ip-infra-option"
                  onClick={() => answerInfra(selected.infraQuestions[currentInfraIdx].id, opt.value)}
                >
                  <strong>{opt.label}</strong>
                  {opt.hint && <span className="ip-infra-hint">{opt.hint}</span>}
                </button>
              ))}
            </div>
            {currentInfraIdx > 0 && (
              <button className="ip-back-btn ip-wiz-back" onClick={() => setCurrentInfraIdx(prev => prev - 1)}>
                ← Previous question
              </button>
            )}
          </div>
        )}

        {/* Step 3: Recommendation */}
        {wizardStep === 'recommendation' && recommendation && (
          <div className="ip-wizard-body">
            <div className="ip-wiz-ctx">
              <span className="ip-wiz-ctx-label">Use case:</span> {useCaseLabel}
            </div>
            <h2 className="ip-wiz-heading">Recommended Architecture</h2>

            <div className="ip-rec-card">
              <div className="ip-rec-header">
                <div className="ip-rec-arch-name">{recommendation.archName}</div>
                <div className="ip-rec-confidence">
                  <span className="ip-rec-confidence-bar" style={{ width: `${recommendation.confidence}%` }} />
                  <span className="ip-rec-confidence-label">{recommendation.confidence}% match</span>
                </div>
              </div>
              <p className="ip-rec-rationale">{recommendation.rationale}</p>

              <div className="ip-rec-details">
                <div className="ip-rec-detail-section">
                  <h4>Pre-configured Integrations</h4>
                  <div className="ip-rec-pills">
                    {selected.integrations.map(i => <span key={i} className="ip-tag ip-tag--arch">{i}</span>)}
                  </div>
                </div>
                <div className="ip-rec-detail-section">
                  <h4>Governance Policies (auto-applied)</h4>
                  <ul className="ip-list ip-list--policy">
                    {selected.govPolicies.map(p => <li key={p}>🛡️ {p}</li>)}
                  </ul>
                </div>
                <div className="ip-rec-detail-section">
                  <h4>Benchmark Suite</h4>
                  <div className="ip-rec-pills">
                    {selected.benchmarks.map(b => <span key={b} className="ip-tag ip-tag--bench">{b}</span>)}
                  </div>
                </div>
              </div>
            </div>

            <div className="ip-detail-actions">
              <button
                className="ip-cta ip-cta--primary"
                onClick={launchDesigner}
                disabled={designSessionMutation.isPending}
              >
                {designSessionMutation.isPending ? 'Creating session…' : `Launch ${recommendation.archName} Designer →`}
              </button>
              <button className="ip-cta ip-cta--ghost" onClick={() => { setWizardStep('use_case'); setSelectedUseCase(null) }}>
                Choose different use case
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Pack Detail View ───────────────────────────────────────────────────

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
              {selected.architectures.map(a => <span key={a.key} className="ip-tag ip-tag--arch">{a.name}</span>)}
            </div>
          </div>
          <div className="ip-detail-card">
            <h3>Setup estimate</h3>
            <div className="ip-big-num">{selected.estimatedSetupDays} days</div>
          </div>
          <div className="ip-detail-card ip-detail-card--wide">
            <h3>Use cases included</h3>
            <ul className="ip-list">
              {selected.useCases.map(u => <li key={u.value}>{u.label}</li>)}
            </ul>
          </div>
          <div className="ip-detail-card">
            <h3>Required integrations</h3>
            <ul className="ip-list">
              {selected.integrations.map(i => <li key={i}>{i}</li>)}
            </ul>
            {/* Readiness score */}
            <div className="ip-readiness">
              <div className="ip-readiness-bar-wrap">
                <div className="ip-readiness-bar" style={{ width: `${readinessInfo.pct}%` }} />
              </div>
              <span className="ip-readiness-label">{readinessInfo.configured}/{readinessInfo.total} configured ({readinessInfo.pct}%)</span>
            </div>
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
          <button className="ip-cta ip-cta--primary" onClick={startWizard}>
            🧭 Start Industry Guided Setup →
          </button>
          <button className="ip-cta ip-cta--ghost" onClick={quickLaunch} disabled={designSessionMutation.isPending}>
            {designSessionMutation.isPending ? 'Creating…' : `Quick launch with ${selected.architectures[0].name}`}
          </button>
          <button className="ip-cta ip-cta--ghost" onClick={() => setSelected(null)}>
            Browse other packs
          </button>
        </div>
      </div>
    )
  }

  // ── Pack Grid View ─────────────────────────────────────────────────────

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
                {pack.architectures.map(a => <span key={a.key} className="ip-tag ip-tag--arch ip-tag--sm">{a.name}</span>)}
              </div>
              <span className="ip-card-days">{pack.estimatedSetupDays}d setup</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
