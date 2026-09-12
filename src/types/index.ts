export type StatusOption = 'VERIFIED' | 'INCOMPLETE' | 'MISSING';
export type RecommendationStatus = 'OPEN' | 'DONE' | 'WONT_FIX';
export type GapStatus = 'OPEN' | 'RESOLVED' | 'WONT_DO';

export interface SubtaskItem {
  id: string;
  status: StatusOption;
  description: string;
}

export interface RequirementItem {
  id: string;
  status: StatusOption;
  description: string;
  subtasks?: SubtaskItem[];
}

export interface GapItem {
  id: string;
  description: string;
  resolved?: boolean; // kept for backwards compat with saved data
  status?: GapStatus; // takes precedence when present
  reason?: string; // populated when status is WONT_DO
  note?: string; // populated when status is RESOLVED
}

export interface RecommendationItem {
  id: string;
  status?: RecommendationStatus;
  description: string;
  reason?: string;
}

export interface OutOfScopeItem {
  id: string;
  title: string;
  acceptanceCriteria: string;
}

export interface CodeReviewForm {
  title: string;
  author?: string;
  authorRole?: string;
  relatedPRD?: string;
  relatedIssue?: string;
  requirements: RequirementItem[];
  gaps: GapItem[];
  recommendations: RecommendationItem[];
  outOfScope: OutOfScopeItem[];
}

export interface EnhancementItem {
  id: string;
  improved: string;
  flags: string[];
}

export interface EnhancementResult {
  requirements: EnhancementItem[];
  gaps: EnhancementItem[];
  recommendations: EnhancementItem[];
  missingCoverage: string[];
}

export interface AcceptedChanges {
  requirements: Record<string, string>;
  gaps: Record<string, string>;
  recommendations: Record<string, string>;
  newGaps: string[];
}

export interface SavedDocument {
  id: string;
  type: 'code-review' | 'prd' | 'proposal';
  title: string;
  createdAt: string;
  modifiedAt: string;
  deletedAt?: string;
  data: CodeReviewForm | PRDForm | ProposalForm;
}

// PRD types

export interface PRDMeta {
  author: string;
  status: 'Draft' | 'In Review' | 'Approved';
  version: string;
  productArea: string;
  engineeringLead: string;
  designLead: string;
  pmm: string;
  stakeholders: string;
  targetLaunch: string;
  docLink: string;
}

export interface PRDScenario {
  id: string;
  title: string;
  content: string;
}

export interface PRDSubtaskItem {
  id: string;
  description: string;
}

export interface PRDRequirementItem {
  id: string;
  description: string;
  sourceReviewId?: string;
  subtasks?: PRDSubtaskItem[];
}

export interface PRDSuccessMetric {
  id: string;
  metric: string;
}

export interface PRDOutOfScopeItem {
  id: string;
  description: string;
}

export interface PRDTimelinePhase {
  id: string;
  name: string;
  dates: string;
  deliverables: string;
  dependencies: string;
}

export interface PRDOpenQuestion {
  id: string;
  question: string;
}

export interface PRDTextFieldImprovement {
  improved: string;
  flags: string[];
}

export interface PRDItemImprovement {
  id: string;
  improved: string;
  flags: string[];
}

export interface PRDEnhancementResult {
  sections: {
    overview?: PRDTextFieldImprovement;
    problemStatement?: PRDTextFieldImprovement;
    objective?: PRDTextFieldImprovement;
    notes?: PRDTextFieldImprovement;
  };
  successMetrics: PRDItemImprovement[];
  requirements: PRDItemImprovement[];
  outOfScope: PRDItemImprovement[];
  openQuestions: PRDItemImprovement[];
  scenarios: PRDItemImprovement[];
  missingSections: string[];
}

export interface PRDTicket {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  jiraUrl: string;
  sourceRequirementIds: string[];
}

export interface PRDTicketSuggestion {
  title: string;
  description: string;
  acceptanceCriteria: string;
  sourceRequirementIds: string[];
}

export interface PRDTicketGenerationResult {
  tickets: PRDTicketSuggestion[];
}

export interface PRDForm {
  title: string;
  meta: PRDMeta;
  overview: string;
  problemStatement: string;
  objective: string;
  successMetrics: PRDSuccessMetric[];
  scenarios: PRDScenario[];
  requirements: PRDRequirementItem[];
  tickets: PRDTicket[];
  outOfScope: PRDOutOfScopeItem[];
  timeline: PRDTimelinePhase[];
  openQuestions: PRDOpenQuestion[];
  notes: string;
}

// Proposal types

export type ProposalStatus = 'Draft' | 'In Review' | 'Approved' | 'Rejected';

export interface ProposalMeta {
  author: string;
  status: ProposalStatus;
  sponsor: string;
  stakeholders: string;
}

export interface ProposalSuccessCriterion {
  id: string;
  description: string;
}

export interface ProposalScopeItem {
  id: string;
  description: string;
}

export interface ProposalRisk {
  id: string;
  risk: string;
  mitigation: string;
}

export interface ProposalOpenQuestion {
  id: string;
  question: string;
}

export interface ProposalTextFieldImprovement {
  improved: string;
  flags: string[];
}

export interface ProposalItemImprovement {
  id: string;
  improved: string;
  flags: string[];
}

export interface ProposalRiskImprovement {
  id: string;
  improvedRisk: string;
  improvedMitigation: string;
  flags: string[];
}

export interface ProposalEnhancementResult {
  sections: {
    problemStatement?: ProposalTextFieldImprovement;
    opportunity?: ProposalTextFieldImprovement;
    proposedSolution?: ProposalTextFieldImprovement;
    resourceEstimate?: ProposalTextFieldImprovement;
    notes?: ProposalTextFieldImprovement;
  };
  successCriteria: ProposalItemImprovement[];
  inScope: ProposalItemImprovement[];
  outOfScope: ProposalItemImprovement[];
  risks: ProposalRiskImprovement[];
  openQuestions: ProposalItemImprovement[];
  missingSections: string[];
}

export interface ProposalForm {
  title: string;
  meta: ProposalMeta;
  problemStatement: string;
  opportunity: string;
  proposedSolution: string;
  successCriteria: ProposalSuccessCriterion[];
  inScope: ProposalScopeItem[];
  outOfScope: ProposalScopeItem[];
  risks: ProposalRisk[];
  resourceEstimate: string;
  openQuestions: ProposalOpenQuestion[];
  notes: string;
}
