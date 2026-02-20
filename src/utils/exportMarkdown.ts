import type { CodeReviewForm } from '../types'

export function generateMarkdown(form: CodeReviewForm): string {
  const lines: string[] = []

  lines.push(`# PM Review [${form.title || 'Untitled'}]`)
  lines.push('')

  lines.push('## Requirements Coverage')
  if (form.requirements.length === 0) {
    lines.push('_No requirements added._')
  } else {
    for (const req of form.requirements) {
      lines.push(`- ${req.status} — ${req.description}`)
    }
  }
  lines.push('')

  lines.push('## Gaps Identified')
  if (form.gaps.length === 0) {
    lines.push('_No gaps identified._')
  } else {
    for (const gap of form.gaps) {
      lines.push(`- ${gap.description}`)
    }
  }
  lines.push('')

  lines.push('## Recommendations')
  if (form.recommendations.length === 0) {
    lines.push('_No recommendations._')
  } else {
    for (const rec of form.recommendations) {
      lines.push(`- [ ] ${rec.description}`)
    }
  }
  lines.push('')

  lines.push('## Out of Scope / Follow-up')
  if (form.outOfScope.length === 0) {
    lines.push('_No out of scope items._')
  } else {
    for (const item of form.outOfScope) {
      lines.push(`### ${item.title}`)
      lines.push('**Acceptance Criteria:**')
      lines.push(item.acceptanceCriteria)
      lines.push('')
    }
  }

  return lines.join('\n')
}

export async function copyMarkdownToClipboard(form: CodeReviewForm): Promise<void> {
  const md = generateMarkdown(form)
  await navigator.clipboard.writeText(md)
}
