export type StatusOption = 'VERIFIED' | 'INCOMPLETE' | 'MISSING'
export type RecommendationStatus = 'OPEN' | 'DONE' | 'WONT_FIX'

export interface RequirementItem {
  id: string
  status: StatusOption
  description: string
}

export interface GapItem {
  id: string
  description: string
  resolved?: boolean
}

export interface RecommendationItem {
  id: string
  status?: RecommendationStatus
  description: string
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

export interface SavedDocument {
  id: string
  type: 'code-review'
  title: string
  createdAt: string
  modifiedAt: string
  data: CodeReviewForm
}
