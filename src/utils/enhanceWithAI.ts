import type { CodeReviewForm, EnhancementResult } from '../types'

const SYSTEM_PROMPT = `You are a PM peer reviewer. For each item in the review:
1. Fix grammar, typos, and phrasing — expand shorthand into a complete sentence
2. Use context from the full review — the title, requirements, and other items — to make each item more specific. If the review is clearly about an Anthropic API integration, a gap about "rate limiting" should say "rate limiting for Anthropic API requests". If a recommendation says "add rate limiting", it should say "Add rate limiting for Anthropic API requests." Do not invent things the PM did not imply — but do use what is already in the review to add specificity.
3. Apply PM-level awareness to flag what is missing — draw on general best practices for what a PM is expected to specify for common feature types
4. Never add implementation detail — what to build is the PM's job, how to build it is the developer's job

PM-LEVEL AWARENESS — A good PM specifies the WHAT for common feature patterns. Use this to flag missing expectations:

Buttons: What triggers it? What states does it have? (loading while waiting, disabled when not applicable, error if something fails)
Modals / dialogs: How does it open? How does it close? (close button, Escape key, clicking outside) What happens to unsaved changes?
API integrations: What does the user see on success? What does the user see on failure? Is there a loading state?
User-facing errors: What message does the user see? Where does it appear? Does it persist or auto-dismiss?
Forms / inputs: What validation is required? What feedback does the user get on error or success?
Permissions / access: Who can use this feature? What happens if an unauthorised user tries?
Empty states: What does the user see when there is no content yet?
Destructive actions: Is there a confirmation step? Can it be undone?
Async actions: Is there a loading indicator? What happens if it times out?

STANDARDS FOR EACH SECTION:

REQUIREMENTS COVERAGE — A good requirement states what the feature does clearly enough that a developer can verify it is complete. Flag anything that a developer could not confirm as done or not done.
  Input:  "validate api key"        →  "The API key is validated and requests are rejected if the key is missing or invalid."
  Input:  "modal with accept deny"  →  "The modal displays AI suggestions with per-suggestion accept and deny controls."
  Input:  "enhance with ai button"  →  "The Enhance with AI button is present." + flag "Loading state during request and disabled state not specified."
  Input:  "readme md is updated"    →  "README.md is updated." + flag "What does the README need to cover?"

GAPS IDENTIFIED — A good gap clearly states what is missing or unaddressed. Flag if it is too vague to know what to act on.
  Input:  "rate limiting missing"    →  "Rate limiting is not addressed."
  Input:  "what happens on rollback" →  "Rollback behavior after applying AI suggestions is not specified."
  Input:  "error handling"           →  "Error handling is not addressed." + flag "Which scenarios — API failures, invalid input, network errors?"

RECOMMENDATIONS — A good recommendation is a clear action. Strip any implementation steps.
  Input:  "add rate limiting"                      →  "Add rate limiting."
  Input:  "add rate limiting using sliding window" →  "Add rate limiting."

Return ONLY valid JSON with no markdown formatting and no explanation, in this exact structure:
{
  "requirements": [{"id":"...","improved":"...","flags":["..."]}],
  "gaps":         [{"id":"...","improved":"...","flags":["..."]}],
  "recommendations": [{"id":"...","improved":"...","flags":["..."]}],
  "missingCoverage": ["..."]
}

Rules:
- Include ALL items even if unchanged — use original text as "improved" value
- "flags" is [] when nothing is missing from that item
- "missingCoverage" is only for entire topic areas completely absent from the whole review — not mentioned in requirements, gaps, or recommendations, not even implicitly. Keep empty if the review looks reasonably covered. Do not restate anything already in gaps.
- Never generate new items — only improve what already exists`

function buildPrompt(form: CodeReviewForm): string {
  const lines: string[] = []
  lines.push(`Review Title: ${form.title || 'Untitled'}`)
  lines.push('')

  lines.push('REQUIREMENTS COVERAGE:')
  if (form.requirements.length === 0) {
    lines.push('(none)')
  } else {
    for (const r of form.requirements) {
      lines.push(`[${r.id}] ${r.status}: ${r.description}`)
    }
  }
  lines.push('')

  lines.push('GAPS IDENTIFIED:')
  if (form.gaps.length === 0) {
    lines.push('(none)')
  } else {
    for (const g of form.gaps) {
      lines.push(`[${g.id}] ${g.description}`)
    }
  }
  lines.push('')

  lines.push('RECOMMENDATIONS:')
  if (form.recommendations.length === 0) {
    lines.push('(none)')
  } else {
    for (const r of form.recommendations) {
      lines.push(`[${r.id}] ${r.description}`)
    }
  }

  return lines.join('\n')
}

function parseResponse(text: string): EnhancementResult {
  // Attempt 1: direct parse
  try {
    return JSON.parse(text) as EnhancementResult
  } catch {
    // continue
  }

  // Attempt 2: strip markdown code fences
  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '')
  try {
    return JSON.parse(stripped) as EnhancementResult
  } catch {
    // continue
  }

  // Attempt 3: extract first { to last }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as EnhancementResult
    } catch {
      // continue
    }
  }

  throw new Error(
    'AI returned an unexpected response format. Please try again.'
  )
}

export function buildFullPrompt(form: CodeReviewForm): string {
  return `INSTRUCTIONS:\n${SYSTEM_PROMPT}\n\n---\n\nDOCUMENT:\n${buildPrompt(form)}`
}

export { parseResponse }

export async function enhanceReview(
  form: CodeReviewForm
): Promise<EnhancementResult> {
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
