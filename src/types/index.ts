export type StatusOption = 'VERIFIED' | 'INCOMPLETE' | 'MISSING'
export type RecommendationStatus = 'OPEN' | 'DONE' | 'WONT_FIX'
export type GapStatus = 'OPEN' | 'RESOLVED' | 'WONT_DO'

export interface RequirementItem {
  id: string
  status: StatusOption
  description: string
}

export interface GapItem {
  id: string
  description: string
  resolved?: boolean // kept for backwards compat with saved data
  status?: GapStatus // takes precedence when present
  reason?: string // populated when status is WONT_DO
  note?: string // populated when status is RESOLVED
}

export interface RecommendationItem {
  id: string
  status?: RecommendationStatus
  description: string
  reason?: string
}

export interface OutOfScopeItem {
  id: string
  title: string
  acceptanceCriteria: string
}

export interface CodeReviewForm {
  title: string
  requirements: RequirementItem[]
  gaps: GapItem[]
  recommendations: RecommendationItem[]
  outOfScope: OutOfScopeItem[]
}

export interface EnhancementItem {
  id: string
  improved: string
  flags: string[]
}

export interface EnhancementResult {
  requirements: EnhancementItem[]
  gaps: EnhancementItem[]
  recommendations: EnhancementItem[]
  missingCoverage: string[]
}

export interface AcceptedChanges {
  requirements: Record<string, string>
  gaps: Record<string, string>
  recommendations: Record<string, string>
  newGaps: string[]
}

export interface SavedDocument {
  id: string
  type: 'code-review'
  title: string
  createdAt: string
  modifiedAt: string
  data: CodeReviewForm
}
