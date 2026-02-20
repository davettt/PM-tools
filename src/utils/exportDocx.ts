import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx'
import type { CodeReviewForm } from '../types'

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

export async function downloadDocx(form: CodeReviewForm): Promise<void> {
  const children: Paragraph[] = []

  children.push(heading1(`PM Review [${form.title || 'Untitled'}]`))
  children.push(empty())

  children.push(heading2('Requirements Coverage'))
  if (form.requirements.length === 0) {
    children.push(body('No requirements added.'))
  } else {
    for (const req of form.requirements) {
      children.push(bullet(`${req.status} — ${req.description}`))
    }
  }
  children.push(empty())

  children.push(heading2('Gaps Identified'))
  if (form.gaps.length === 0) {
    children.push(body('No gaps identified.'))
  } else {
    for (const gap of form.gaps) {
      children.push(bullet(gap.description))
    }
  }
  children.push(empty())

  children.push(heading2('Recommendations'))
  if (form.recommendations.length === 0) {
    children.push(body('No recommendations.'))
  } else {
    for (const rec of form.recommendations) {
      children.push(bullet(`[ ] ${rec.description}`))
    }
  }
  children.push(empty())

  children.push(heading2('Out of Scope / Follow-up'))
  if (form.outOfScope.length === 0) {
    children.push(body('No out of scope items.'))
  } else {
    for (const item of form.outOfScope) {
      children.push(heading3(item.title))
      children.push(bold('Acceptance Criteria: ', ''))
      children.push(body(item.acceptanceCriteria))
      children.push(empty())
    }
  }

  const doc = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pm-review-${form.title.replace(/\s+/g, '-').toLowerCase() || 'untitled'}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
