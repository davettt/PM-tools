import type { PRDForm } from '../types'

export function generatePRDMarkdown(
  form: PRDForm,
  createdAt?: string,
  modifiedAt?: string
): string {
  const lines: string[] = []
  const title = form.title || 'Untitled PRD'

  lines.push(`# PRD [${title}]`)
  lines.push('')

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const metaRows: [string, string][] = [
    ['Product Manager', form.meta?.author ?? ''],
    ['Status', form.meta?.status ?? ''],
    ['Created', createdAt ? fmt(createdAt) : ''],
    ['Last Updated', modifiedAt ? fmt(modifiedAt) : ''],
    ['Version', form.meta?.version ?? ''],
    ['Product Area', form.meta?.productArea ?? ''],
    ['Dev Lead', form.meta?.engineeringLead ?? ''],
    ['Design Lead', form.meta?.designLead ?? ''],
    ['PMM', form.meta?.pmm ?? ''],
    ['Target Launch', form.meta?.targetLaunch ?? ''],
    ['Key Stakeholders', form.meta?.stakeholders ?? ''],
    ['Doc Link', form.meta?.docLink ?? ''],
  ].filter(([, v]) => v) as [string, string][]

  if (metaRows.length > 0) {
    lines.push('| Field | Value |')
    lines.push('|-------|-------|')
    for (const [label, value] of metaRows) {
      lines.push(`| ${label} | ${value} |`)
    }
    lines.push('')
  }

  lines.push('## Overview')
  lines.push(form.overview || '_Not completed._')
  lines.push('')

  lines.push('## Problem Statement')
  lines.push(form.problemStatement || '_Not completed._')
  lines.push('')

  lines.push('## Goals')
  lines.push('**Primary Objective**')
  lines.push(form.objective || '_Not completed._')
  lines.push('')
  lines.push('**Success Metrics**')
  if (form.successMetrics.length === 0) {
    lines.push('_No success metrics added._')
  } else {
    for (const m of form.successMetrics) {
      lines.push(`- ${m.metric}`)
    }
  }
  lines.push('')

  lines.push('## How This Works')
  if (form.scenarios.length === 0) {
    lines.push('_No scenarios added._')
  } else {
    for (const s of form.scenarios) {
      lines.push(`### ${s.title || 'Scenario'}`)
      lines.push(s.content || '_Not completed._')
      lines.push('')
    }
  }

  lines.push('## Requirements')
  if (form.requirements.length === 0) {
    lines.push('_No requirements added._')
  } else {
    for (const r of form.requirements) {
      lines.push(`- ${r.description}`)
    }
  }
  lines.push('')

  lines.push('## Out of Scope')
  if (form.outOfScope.length === 0) {
    lines.push('_No out of scope items added._')
  } else {
    for (const item of form.outOfScope) {
      lines.push(`- ${item.description}`)
    }
  }
  lines.push('')

  lines.push('## Timeline')
  if (form.timeline.length === 0) {
    lines.push('_No timeline added._')
  } else {
    const hasDeps = form.timeline.some(p => p.dependencies)
    if (hasDeps) {
      lines.push('| Phase | Dates | What Ships | Dependencies |')
      lines.push('|-------|-------|------------|--------------|')
      for (const phase of form.timeline) {
        lines.push(
          `| ${phase.name || ''} | ${phase.dates || ''} | ${phase.deliverables || ''} | ${phase.dependencies || ''} |`
        )
      }
    } else {
      lines.push('| Phase | Dates | What Ships |')
      lines.push('|-------|-------|------------|')
      for (const phase of form.timeline) {
        lines.push(
          `| ${phase.name || ''} | ${phase.dates || ''} | ${phase.deliverables || ''} |`
        )
      }
    }
  }

  lines.push('## Open Questions')
  if (form.openQuestions.length === 0) {
    lines.push('_No open questions added._')
  } else {
    for (const q of form.openQuestions) {
      lines.push(`- ${q.question}`)
    }
  }
  lines.push('')

  lines.push('## Notes')
  lines.push(form.notes || '_No notes added._')

  return lines.join('\n')
}

export async function copyPRDMarkdownToClipboard(
  form: PRDForm,
  createdAt?: string,
  modifiedAt?: string
): Promise<void> {
  const md = generatePRDMarkdown(form, createdAt, modifiedAt)
  await navigator.clipboard.writeText(md)
}
