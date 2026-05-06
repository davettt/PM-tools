import { v4 as uuidv4 } from 'uuid'
import type {
  PRDForm,
  PRDMeta,
  PRDScenario,
  PRDRequirementItem,
  PRDSubtaskItem,
  PRDSuccessMetric,
  PRDOutOfScopeItem,
  PRDTimelinePhase,
  PRDOpenQuestion,
} from '../types'

const META_FIELD_MAP: Record<string, keyof PRDMeta> = {
  'Product Manager': 'author',
  Status: 'status',
  Version: 'version',
  'Product Area': 'productArea',
  'Dev Lead': 'engineeringLead',
  'Design Lead': 'designLead',
  PMM: 'pmm',
  'Target Launch': 'targetLaunch',
  'Key Stakeholders': 'stakeholders',
  'Doc Link': 'docLink',
}

function parseMetaTable(text: string): Partial<PRDMeta> {
  const meta: Partial<PRDMeta> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)
    if (cells.length < 2) continue
    const [field, value] = cells
    if (!field || field === 'Field' || field.startsWith('---')) continue
    const key = META_FIELD_MAP[field]
    if (key && value) {
      ;(meta as Record<string, string>)[key] = value
    }
  }
  return meta
}

function parseBulletList(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2).trim())
    .filter(Boolean)
}

function stripCheckbox(text: string): string {
  return text.replace(/^\[[ x]\]\s*/, '')
}

function parseRequirementsList(text: string): PRDRequirementItem[] {
  const items: PRDRequirementItem[] = []
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  let current: PRDRequirementItem | null = null
  let baseIndent: number | null = null

  for (const line of lines) {
    const bulletMatch = line.match(/^(\s*)- (.+)/)
    if (!bulletMatch) continue
    const indent = bulletMatch[1]!.length
    const content = bulletMatch[2]!.trim()

    if (baseIndent === null) baseIndent = indent

    if (indent > baseIndent && current) {
      const desc = stripCheckbox(content)
      if (desc) {
        const sub: PRDSubtaskItem = { id: uuidv4(), description: desc }
        current.subtasks = current.subtasks ?? []
        current.subtasks.push(sub)
      }
    } else {
      const desc = stripCheckbox(content)
      if (desc) {
        current = { id: uuidv4(), description: desc }
        items.push(current)
      }
    }
  }
  return items
}

function stripPlaceholder(text: string): string {
  const t = text.trim()
  if (t.startsWith('_') && t.endsWith('_')) return ''
  return t
}

function parseGoals(text: string): {
  objective: string
  successMetrics: PRDSuccessMetric[]
} {
  const objMatch = text.match(
    /\*\*Primary Objective\*\*\s*([\s\S]*?)(?=\*\*Success Metrics\*\*|$)/
  )
  const metricsMatch = text.match(/\*\*Success Metrics\*\*\s*([\s\S]*)$/)
  const objective = stripPlaceholder(objMatch?.[1]?.trim() ?? '')
  const successMetrics: PRDSuccessMetric[] = parseBulletList(
    metricsMatch?.[1]?.trim() ?? ''
  ).map(m => ({ id: uuidv4(), metric: m }))
  return { objective, successMetrics }
}

function parseScenarios(text: string): PRDScenario[] {
  const scenarios: PRDScenario[] = []
  const normalised = text.replace(/^(\s*###\s+)/m, '\n$1')
  const parts = normalised.split(/\n\s*###\s+/)
  for (const part of parts.slice(1)) {
    const newline = part.indexOf('\n')
    const title = newline === -1 ? part.trim() : part.slice(0, newline).trim()
    const content =
      newline === -1 ? '' : stripPlaceholder(part.slice(newline + 1).trim())
    if (title) scenarios.push({ id: uuidv4(), title, content })
  }
  return scenarios
}

function parseTimelineTable(text: string): PRDTimelinePhase[] {
  const phases: PRDTimelinePhase[] = []
  const lines = text
    .split('\n')
    .filter(l => l.trim().startsWith('|'))
    .map(l => l.trim())
  const headerLine = lines[0] ?? ''
  const hasDeps = headerLine.toLowerCase().includes('dependencies')
  for (const line of lines.slice(2)) {
    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)
    if (cells.length < 3) continue
    phases.push({
      id: uuidv4(),
      name: cells[0] ?? '',
      dates: cells[1] ?? '',
      deliverables: cells[2] ?? '',
      dependencies: hasDeps ? (cells[3] ?? '') : '',
    })
  }
  return phases
}

export function parsePRDMarkdown(markdown: string): Partial<PRDForm> {
  const lines = markdown.split('\n')

  // Title — allow leading whitespace
  const titleMatch = lines[0]?.trim().match(/^#\s+PRD\s+\[(.+)\]$/)
  const title = titleMatch?.[1] ?? ''

  // Preamble (meta table) — everything before the first ## heading
  const firstH2 = lines.findIndex(l => /^\s*## /.test(l))
  const preamble = firstH2 > 0 ? lines.slice(0, firstH2).join('\n') : ''
  const metaPartial = parseMetaTable(preamble)
  const meta: PRDMeta = {
    author: metaPartial.author ?? '',
    status: (metaPartial.status as PRDMeta['status']) ?? 'Draft',
    version: metaPartial.version ?? '',
    productArea: metaPartial.productArea ?? '',
    engineeringLead: metaPartial.engineeringLead ?? '',
    designLead: metaPartial.designLead ?? '',
    pmm: metaPartial.pmm ?? '',
    stakeholders: metaPartial.stakeholders ?? '',
    targetLaunch: metaPartial.targetLaunch ?? '',
    docLink: metaPartial.docLink ?? '',
  }

  // Split into sections by ## headings (allow leading whitespace)
  const chunks = markdown.split(/^\s*## /m)
  const sections: Record<string, string> = {}
  for (const chunk of chunks.slice(1)) {
    const newline = chunk.indexOf('\n')
    const heading =
      newline === -1 ? chunk.trim() : chunk.slice(0, newline).trim()
    const content = newline === -1 ? '' : chunk.slice(newline + 1).trim()
    sections[heading] = content
  }

  const overview = stripPlaceholder(sections['Overview'] ?? '')
  const problemStatement = stripPlaceholder(sections['Problem Statement'] ?? '')
  const { objective, successMetrics } = parseGoals(sections['Goals'] ?? '')
  const scenarios = parseScenarios(sections['How This Works'] ?? '')

  const requirements: PRDRequirementItem[] = parseRequirementsList(
    sections['Requirements'] ?? ''
  )

  const outOfScope: PRDOutOfScopeItem[] = parseBulletList(
    sections['Out of Scope'] ?? ''
  ).map(d => ({ id: uuidv4(), description: d }))

  const openQuestions: PRDOpenQuestion[] = parseBulletList(
    sections['Open Questions'] ?? ''
  ).map(q => ({ id: uuidv4(), question: q }))

  const timelineText = sections['Timeline'] ?? ''
  const timeline = timelineText.includes('|')
    ? parseTimelineTable(timelineText)
    : []

  const notes = stripPlaceholder(sections['Notes'] ?? '')

  return {
    title,
    meta,
    overview,
    problemStatement,
    objective,
    successMetrics,
    scenarios,
    requirements,
    outOfScope,
    openQuestions,
    ...(timeline.length > 0 ? { timeline } : {}),
    notes,
  }
}
