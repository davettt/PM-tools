import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx'
import type { PRDForm } from '../types'

function heading1(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1 })
}

function heading2(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 })
}

function heading3(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3 })
}

function bullet(text: string): Paragraph {
  return new Paragraph({ text, bullet: { level: 0 } })
}

function body(text: string): Paragraph {
  return new Paragraph({ text, alignment: AlignmentType.LEFT })
}

function bold(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true }),
      new TextRun({ text: value }),
    ],
  })
}

function empty(): Paragraph {
  return new Paragraph({ text: '' })
}

export async function downloadPRDDocx(
  form: PRDForm,
  createdAt?: string,
  modifiedAt?: string
): Promise<void> {
  const children: Paragraph[] = []
  const title = form.title || 'Untitled PRD'

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  children.push(heading1(`PRD [${title}]`))
  children.push(empty())

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

  for (const [label, value] of metaRows) {
    children.push(bold(`${label}: `, value))
  }
  if (metaRows.length > 0) children.push(empty())

  children.push(heading2('Overview'))
  children.push(body(form.overview || 'Not completed.'))
  children.push(empty())

  children.push(heading2('Problem Statement'))
  children.push(body(form.problemStatement || 'Not completed.'))
  children.push(empty())

  children.push(heading2('Goals'))
  children.push(bold('Primary Objective', ''))
  children.push(body(form.objective || 'Not completed.'))
  children.push(empty())
  children.push(bold('Success Metrics', ''))
  if (form.successMetrics.length === 0) {
    children.push(body('No success metrics added.'))
  } else {
    for (const m of form.successMetrics) {
      children.push(bullet(m.metric))
    }
  }
  children.push(empty())

  children.push(heading2('How This Works'))
  if (form.scenarios.length === 0) {
    children.push(body('No scenarios added.'))
  } else {
    for (const s of form.scenarios) {
      children.push(heading3(s.title || 'Scenario'))
      children.push(body(s.content || 'Not completed.'))
      children.push(empty())
    }
  }

  children.push(heading2('Requirements'))
  if (form.requirements.length === 0) {
    children.push(body('No requirements added.'))
  } else {
    for (const r of form.requirements) {
      children.push(bullet(r.description))
    }
  }
  children.push(empty())

  children.push(heading2('Out of Scope'))
  if (form.outOfScope.length === 0) {
    children.push(body('No out of scope items added.'))
  } else {
    for (const item of form.outOfScope) {
      children.push(bullet(item.description))
    }
  }
  children.push(empty())

  children.push(heading2('Timeline'))
  if (form.timeline.length === 0) {
    children.push(body('No timeline added.'))
  } else {
    for (const phase of form.timeline) {
      children.push(heading3(phase.name || 'Phase'))
      if (phase.dates) children.push(bold('Dates: ', phase.dates))
      if (phase.deliverables)
        children.push(bold('What ships: ', phase.deliverables))
      if (phase.dependencies)
        children.push(bold('Dependencies: ', phase.dependencies))
      children.push(empty())
    }
  }

  children.push(heading2('Open Questions'))
  if (form.openQuestions.length === 0) {
    children.push(body('No open questions added.'))
  } else {
    for (const q of form.openQuestions) {
      children.push(bullet(q.question))
    }
  }
  children.push(empty())

  children.push(heading2('Notes'))
  children.push(body(form.notes || 'No notes added.'))

  const doc = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prd-${title.replace(/\s+/g, '-').toLowerCase()}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
