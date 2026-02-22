import type { CodeReviewForm } from '../types'

export function generateMarkdown(
  form: CodeReviewForm,
  createdAt?: string
): string {
  const lines: string[] = []

  lines.push(`# PM Review [${form.title || 'Untitled'}]`)
  lines.push('')

  const metaRows: [string, string][] = [
    ['Author', form.author ?? ''],
    ['Role', form.authorRole ?? ''],
    ['Related PRD', form.relatedPRD ?? ''],
    ['Issue', form.relatedIssue ?? ''],
    [
      'Date',
      createdAt
        ? new Date(createdAt).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '',
    ],
  ].filter(([, v]) => v) as [string, string][]

  if (metaRows.length > 0) {
    for (const [label, value] of metaRows) {
      lines.push(`**${label}:** ${value}  `)
    }
    lines.push('')
  }

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
      const gapStatus = gap.status ?? (gap.resolved ? 'RESOLVED' : 'OPEN')
      if (gapStatus === 'RESOLVED') {
        const suffix = gap.note ? ` *(${gap.note})*` : ''
        lines.push(`- [x] ${gap.description}${suffix}`)
      } else if (gapStatus === 'WONT_DO') {
        const suffix = gap.reason ? ` — ${gap.reason}` : ''
        lines.push(`- ~~${gap.description}~~ *(Won't Do${suffix})*`)
      } else {
        lines.push(`- [ ] ${gap.description}`)
      }
    }
  }
  lines.push('')

  lines.push('## Recommendations')
  if (form.recommendations.length === 0) {
    lines.push('_No recommendations._')
  } else {
    for (const rec of form.recommendations) {
      const status = rec.status ?? 'OPEN'
      if (status === 'DONE') lines.push(`- [x] ${rec.description}`)
      else if (status === 'WONT_FIX') {
        const suffix = rec.reason ? ` — ${rec.reason}` : ''
        lines.push(`- ~~${rec.description}~~ *(Won't Fix${suffix})*`)
      } else lines.push(`- [ ] ${rec.description}`)
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

export async function copyMarkdownToClipboard(
  form: CodeReviewForm,
  createdAt?: string
): Promise<void> {
  const md = generateMarkdown(form, createdAt)
  await navigator.clipboard.writeText(md)
}
