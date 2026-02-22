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
  author?: string
  authorRole?: string
  relatedPRD?: string
  relatedIssue?: string
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
  type: 'code-review' | 'prd'
  title: string
  createdAt: string
  modifiedAt: string
  data: CodeReviewForm | PRDForm
}

// PRD types

export interface PRDMeta {
  author: string
  status: 'Draft' | 'In Review' | 'Approved'
  version: string
  productArea: string
  engineeringLead: string
  designLead: string
  pmm: string
  stakeholders: string
  targetLaunch: string
  docLink: string
}

export interface PRDScenario {
  id: string
  title: string
  content: string
}

export interface PRDRequirementItem {
  id: string
  description: string
  sourceReviewId?: string
}

export interface PRDSuccessMetric {
  id: string
  metric: string
}

export interface PRDOutOfScopeItem {
  id: string
  description: string
}

export interface PRDTimelinePhase {
  id: string
  name: string
  dates: string
  deliverables: string
  dependencies: string
}

export interface PRDOpenQuestion {
  id: string
  question: string
}

export interface PRDTextFieldImprovement {
  improved: string
  flags: string[]
}

export interface PRDItemImprovement {
  id: string
  improved: string
  flags: string[]
}

export interface PRDEnhancementResult {
  sections: {
    overview?: PRDTextFieldImprovement
    problemStatement?: PRDTextFieldImprovement
    objective?: PRDTextFieldImprovement
    notes?: PRDTextFieldImprovement
  }
  successMetrics: PRDItemImprovement[]
  requirements: PRDItemImprovement[]
  outOfScope: PRDItemImprovement[]
  openQuestions: PRDItemImprovement[]
  scenarios: PRDItemImprovement[]
  missingSections: string[]
}

export interface PRDForm {
  title: string
  meta: PRDMeta
  overview: string
  problemStatement: string
  objective: string
  successMetrics: PRDSuccessMetric[]
  scenarios: PRDScenario[]
  requirements: PRDRequirementItem[]
  outOfScope: PRDOutOfScopeItem[]
  timeline: PRDTimelinePhase[]
  openQuestions: PRDOpenQuestion[]
  notes: string
}
