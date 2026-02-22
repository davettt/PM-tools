import type { PRDForm, PRDEnhancementResult } from '../types'

const SYSTEM_PROMPT = `You are a PM writing coach. Review this PRD and provide structured improvements. Your job is to raise the quality of each section to meet PM standards — not to rewrite the product vision or invent content the author did not intend.

SECTION STANDARDS:

OVERVIEW
A good overview is 1–2 sentences that describe WHAT the feature is, clearly enough that someone with no prior context understands it. It should not describe strategic value, business rationale, or how it will be built.
  Weak:  "Increase the value of the PM tools app by adding a PRD feature"
  Strong: "A structured editor for writing Product Requirements Documents, with guided sections, inline guidance, and export to Markdown, PDF, and Word."
Flag: "Does not describe what the feature is — focuses on value rather than description"

PROBLEM STATEMENT
A complete problem statement must contain all three elements:
  1. Target user — who specifically has this problem?
  2. Pain/problem — what challenge are they facing?
  3. Business impact — what does this cost if left unsolved?
Missing any of these is a flag. Do not invent business impact if not provided — flag it.

OBJECTIVE
Must be a clear, measurable outcome — not a description of the UX or a feature summary.
  Weak:  "Quick and easy PRD document creation"
  Strong: "Enable any PM, regardless of experience level, to produce a structured, complete PRD without needing prior PM training"
Flag: "Not a measurable outcome — describes the UX rather than the result"

SUCCESS METRICS
Each metric must be measurable and time-bound. Vague descriptions are flagged.
  Weak:  "More complete PRDs that are quick to create"
  Strong: "90% of exported PRDs include all 9 sections within the first month of use"
Flag: "Not measurable — needs a number, a target, and a timeframe"

HOW THIS WORKS / SCENARIOS
Each scenario must have explicit numbered steps showing user action → system response → outcome.
If written as prose without numbered steps, flag it.
  Flag: "No step-by-step structure — rewrite using: Step 1: user does X, Step 2: system responds with Y, Step 3: outcome is Z"
Do not rewrite the scenario content itself if steps are present — only improve phrasing.

REQUIREMENTS
Each requirement must be testable from a PM perspective: could a developer confirm this is done or not done?
Requirements written in review language ("must include…", "must state…") should be rewritten as build language ("the system must…", "the feature must…").
  Weak:  "The Overview section must include 1–2 sentences describing what the feature is"
  Strong: "The system must provide an Overview field that accepts free text input"
Flag: "Written as a review criterion rather than a build requirement — not directly implementable"

OUT OF SCOPE
If this section is empty, flag it strongly. This is critical for scope management.
  Flag: "Out of Scope is empty — explicitly listing what will NOT be in this release prevents scope creep during development"

OPEN QUESTIONS
Each question must be specific and actionable. Vague placeholders are flagged.
  Weak:  "I might miss something important as a new PM"
  Strong: "Are there maximum length guidelines for PRD sections? Should the tool enforce or guide limits?"
Flag: "Too vague to act on — rephrase as a specific unknown that needs resolution before development"

NOTES
Improve grammar and clarity only. Do not flag notes as incomplete.

TIMELINE
This section is shown for context only. Do not flag it as missing if content is present. Do not review or improve timeline phases in the JSON response.

RULES:
- Never invent content the author did not provide — use [fill in] as placeholder where content is needed
- Fix grammar, typos, and phrasing throughout
- Use context from the rest of the PRD to make improvements specific
- Flags are ⚑ indicators of what a PM needs to address — keep them short and actionable
- Include ALL items even if unchanged — use original text as "improved" value
- "flags" is [] when nothing needs attention for that item
- "missingSections" is only for sections that are completely empty or critically incomplete — keep the list short and specific
- In "missingSections", never reference internal item IDs (the bracketed codes like [abc123]) — always describe issues in plain language that the author can understand

Return ONLY valid JSON with no markdown formatting and no explanation, in this exact structure:
{
  "sections": {
    "overview": {"improved": "...", "flags": []},
    "problemStatement": {"improved": "...", "flags": []},
    "objective": {"improved": "...", "flags": []},
    "notes": {"improved": "...", "flags": []}
  },
  "successMetrics": [{"id":"...","improved":"...","flags":[]}],
  "requirements": [{"id":"...","improved":"...","flags":[]}],
  "outOfScope": [{"id":"...","improved":"...","flags":[]}],
  "openQuestions": [{"id":"...","improved":"...","flags":[]}],
  "scenarios": [{"id":"...","improved":"...","flags":[]}],
  "missingSections": ["..."]
}`

function buildPrompt(form: PRDForm): string {
  const lines: string[] = []
  lines.push(`PRD Title: ${form.title || 'Untitled'}`)
  lines.push('')

  lines.push('OVERVIEW:')
  lines.push(form.overview || '(empty)')
  lines.push('')

  lines.push('PROBLEM STATEMENT:')
  lines.push(form.problemStatement || '(empty)')
  lines.push('')

  lines.push('OBJECTIVE:')
  lines.push(form.objective || '(empty)')
  lines.push('')

  lines.push('SUCCESS METRICS:')
  if (form.successMetrics.length === 0) {
    lines.push('(none)')
  } else {
    for (const m of form.successMetrics) {
      lines.push(`[${m.id}] ${m.metric}`)
    }
  }
  lines.push('')

  lines.push('HOW THIS WORKS (SCENARIOS):')
  if (form.scenarios.length === 0) {
    lines.push('(none)')
  } else {
    for (const s of form.scenarios) {
      lines.push(`[${s.id}] ${s.title || 'Scenario'}:`)
      lines.push(s.content || '(empty)')
    }
  }
  lines.push('')

  lines.push('REQUIREMENTS:')
  if (form.requirements.length === 0) {
    lines.push('(none)')
  } else {
    for (const r of form.requirements) {
      lines.push(`[${r.id}] ${r.description}`)
    }
  }
  lines.push('')

  lines.push('OUT OF SCOPE:')
  if (form.outOfScope.length === 0) {
    lines.push('(empty)')
  } else {
    for (const o of form.outOfScope) {
      lines.push(`[${o.id}] ${o.description}`)
    }
  }
  lines.push('')

  lines.push('TIMELINE:')
  if (form.timeline.length === 0) {
    lines.push('(none)')
  } else {
    for (const t of form.timeline) {
      const parts = [t.name, t.dates, t.deliverables, t.dependencies]
        .filter(Boolean)
        .join(' | ')
      lines.push(parts)
    }
  }
  lines.push('')

  lines.push('OPEN QUESTIONS:')
  if (form.openQuestions.length === 0) {
    lines.push('(none)')
  } else {
    for (const q of form.openQuestions) {
      lines.push(`[${q.id}] ${q.question}`)
    }
  }
  lines.push('')

  lines.push('NOTES:')
  lines.push(form.notes || '(empty)')

  return lines.join('\n')
}

function parseResponse(text: string): PRDEnhancementResult {
  try {
    return JSON.parse(text) as PRDEnhancementResult
  } catch {
    // continue
  }

  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '')
  try {
    return JSON.parse(stripped) as PRDEnhancementResult
  } catch {
    // continue
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as PRDEnhancementResult
    } catch {
      // continue
    }
  }

  throw new Error(
    'AI returned an unexpected response format. Please try again.'
  )
}

export async function enhancePRD(form: PRDForm): Promise<PRDEnhancementResult> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: SYSTEM_PROMPT,
      prompt: buildPrompt(form),
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error ?? 'AI enhancement failed'
    )
  }

  const text = (data as { content: { type: string; text: string }[] })
    .content[0]?.text

  if (!text) throw new Error('Empty response from AI')

  return parseResponse(text)
}
