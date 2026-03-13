import type { ArchitectureType } from '../../api/architectures'

export type VectorRagConfig = {
  dataSourceType: string
  chunkingStrategy: string
  embeddingModel: string
  vectorDatabase: string
  similarityMetric: string
  topK: number
  metadataFilters: string
  reranker: string
  answerModel: string
  fallbackStrategy: string
}

export type VectorlessRagConfig = {
  documentParsingStrategy: string
  structureAwareRetrieval: string
  lexicalRetrieval: string
  metadataFilters: string
  symbolicSelection: string
  exactMatchControls: string
  answerModel: string
  fallbackStrategy: string
}

export type GraphRagConfig = {
  graphDatabase: string
  ontologyHints: string
  nodeTypes: string
  edgeTypes: string
  entityExtractionStrategy: string
  traversalDepth: number
  expansionLogic: string
  rankingStrategy: string
  answerModel: string
}

export type TemporalRagConfig = {
  timeAwareIndexSource: string
  effectiveDateLogic: string
  recencyWeighting: string
  timeWindow: string
  eventSequenceRetrieval: string
  versionAwareFiltering: string
  answerModel: string
}

export type HybridRagConfig = {
  retrievalModes: string
  routingPolicy: string
  executionMode: 'sequential' | 'parallel'
  scoreFusionStrategy: string
  precedenceRules: string
  confidenceArbitration: string
  fallbackBehavior: string
  answerModel: string
}

export type CustomRagConfig = {
  summary: string
  notes: string
}

export type ArchitectureConfig =
  | { type: 'vector'; config: VectorRagConfig }
  | { type: 'vectorless'; config: VectorlessRagConfig }
  | { type: 'graph'; config: GraphRagConfig }
  | { type: 'temporal'; config: TemporalRagConfig }
  | { type: 'hybrid'; config: HybridRagConfig }
  | { type: 'custom'; config: CustomRagConfig }

export type DesignerWizardState = {
  architecture_type: ArchitectureType
  architecture_config: ArchitectureConfig
}

export function createDefaultConfig(type: ArchitectureType): ArchitectureConfig {
  switch (type) {
    case 'vector':
      return {
        type: 'vector',
        config: {
          dataSourceType: '',
          chunkingStrategy: 'semantic',
          embeddingModel: '',
          vectorDatabase: '',
          similarityMetric: 'cosine',
          topK: 8,
          metadataFilters: '',
          reranker: '',
          answerModel: '',
          fallbackStrategy: 'llm_fallback',
        },
      }
    case 'vectorless':
      return {
        type: 'vectorless',
        config: {
          documentParsingStrategy: 'sections',
          structureAwareRetrieval: 'headings',
          lexicalRetrieval: 'bm25',
          metadataFilters: '',
          symbolicSelection: '',
          exactMatchControls: '',
          answerModel: '',
          fallbackStrategy: 'none',
        },
      }
    case 'graph':
      return {
        type: 'graph',
        config: {
          graphDatabase: '',
          ontologyHints: '',
          nodeTypes: '',
          edgeTypes: '',
          entityExtractionStrategy: 'ner',
          traversalDepth: 2,
          expansionLogic: 'neighbors',
          rankingStrategy: 'path_score',
          answerModel: '',
        },
      }
    case 'temporal':
      return {
        type: 'temporal',
        config: {
          timeAwareIndexSource: '',
          effectiveDateLogic: 'valid_from_to',
          recencyWeighting: 'medium',
          timeWindow: '30d',
          eventSequenceRetrieval: '',
          versionAwareFiltering: '',
          answerModel: '',
        },
      }
    case 'hybrid':
      return {
        type: 'hybrid',
        config: {
          retrievalModes: 'vector + lexical',
          routingPolicy: 'intent_based',
          executionMode: 'parallel',
          scoreFusionStrategy: 'weighted_sum',
          precedenceRules: '',
          confidenceArbitration: '',
          fallbackBehavior: 'fallback_to_best_single',
          answerModel: '',
        },
      }
    case 'custom':
    default:
      return {
        type: 'custom',
        config: {
          summary: '',
          notes: '',
        },
      }
  }
}

