import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { usePRDStore } from '../stores/prdStore'
import SectionRow from '../components/SectionRow'
import ImportFromReviewModal from '../components/ImportFromReviewModal'
import PRDEnhanceModal from '../components/PRDEnhanceModal'
import type { PRDAcceptedChanges } from '../components/PRDEnhanceModal'
import PasteAIResponseModal from '../components/PasteAIResponseModal'
import AIEnhanceDropdown from '../components/AIEnhanceDropdown'
import { copyPRDMarkdownToClipboard } from '../utils/exportPRDMarkdown'
import { downloadPRDDocx } from '../utils/exportPRDDocx'
import { printDocument } from '../utils/exportPrint'
import {
  enhancePRD,
  buildFullPRDPrompt,
  parsePRDResponse,
} from '../utils/enhancePRDWithAI'
import type {
  PRDForm,
  PRDMeta,
  PRDScenario,
  PRDRequirementItem,
  PRDSuccessMetric,
  PRDOutOfScopeItem,
  PRDTimelinePhase,
  PRDOpenQuestion,
  PRDEnhancementResult,
  SavedDocument,
} from '../types'

const emptyMeta = (): PRDMeta => ({
  author: '',
  status: 'Draft',
  version: '',
  productArea: '',
  engineeringLead: '',
  designLead: '',
  pmm: '',
  stakeholders: '',
  targetLaunch: '',
  docLink: '',
})

const emptyForm = (): PRDForm => ({
  title: '',
  meta: emptyMeta(),
  overview: '',
  problemStatement: '',
  objective: '',
  successMetrics: [],
  scenarios: [
    { id: uuidv4(), title: 'Happy Path', content: '' },
    { id: uuidv4(), title: 'Alternative Scenario', content: '' },
    { id: uuidv4(), title: 'Error State', content: '' },
  ],
  requirements: [],
  outOfScope: [],
  timeline: [
    {
      id: uuidv4(),
      name: 'Phase 1',
      dates: '',
      deliverables: '',
      dependencies: '',
    },
    {
      id: uuidv4(),
      name: 'Phase 2',
      dates: '',
      deliverables: '',
      dependencies: '',
    },
  ],
  openQuestions: [],
  notes: '',
})

const TIPS = [
  "Consult your lead stakeholders first — the PRD documents agreed decisions, it doesn't make them.",
  'Use scenario-based writing in "How This Works" to make the user experience concrete and testable.',
  'Aim for a maximum of 2 pages. If it gets longer, the scope may need narrowing.',
  'After writing your PRD, use the PM Code Review tool to validate requirements coverage.',
  'This tool auto-saves every 1.5 seconds — your work is captured with each save timestamp.',
]

const PRD = () => {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { saveDocument, updateDocument } = usePRDStore()

  const [form, setForm] = useState<PRDForm>(emptyForm())
  const [docId, setDocId] = useState<string>('')
  const [createdAt, setCreatedAt] = useState<string>('')
  const [modifiedAt, setModifiedAt] = useState<string>('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tipsOpen, setTipsOpen] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhanceResult, setEnhanceResult] =
    useState<PRDEnhancementResult | null>(null)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  const hasInitializedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scenariosSectionRef = useRef<HTMLDivElement>(null)
  const requirementsSectionRef = useRef<HTMLDivElement>(null)
  const metricsSectionRef = useRef<HTMLDivElement>(null)
  const outOfScopeSectionRef = useRef<HTMLDivElement>(null)
  const questionsSectionRef = useRef<HTMLDivElement>(null)

  const focusLastTextarea = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      const inputs =
        ref.current?.querySelectorAll<HTMLTextAreaElement>('textarea')
      inputs?.[inputs.length - 1]?.focus()
    }, 0)
  }

  useEffect(() => {
    if (isNew) {
      setDocId(uuidv4())
      const now = new Date().toISOString()
      setCreatedAt(now)
      setModifiedAt(now)
      hasInitializedRef.current = true
      return
    }
    if (!id) return
    fetch(`/api/prds/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((doc: SavedDocument) => {
        const stored = doc.data as PRDForm
        setForm({
          ...emptyForm(),
          ...stored,
          meta: { ...emptyMeta(), ...stored.meta },
        })
        setDocId(doc.id)
        setCreatedAt(doc.createdAt)
        setModifiedAt(doc.modifiedAt)
        setIsDirty(false)
        hasInitializedRef.current = true
      })
      .catch(() => setLoadError('Could not load PRD.'))
  }, [id, isNew])

  const update = useCallback((patch: Partial<PRDForm>) => {
    setForm(prev => ({ ...prev, ...patch }))
    setIsDirty(true)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const now = new Date().toISOString()
      setModifiedAt(now)
      const doc: SavedDocument = {
        id: docId,
        type: 'prd',
        title: form.title || 'Untitled PRD',
        createdAt: createdAt || now,
        modifiedAt: now,
        data: form,
      }
      if (isNew) {
        await saveDocument(doc)
        setIsDirty(false)
        navigate(`/prd/${docId}`, { replace: true })
      } else {
        await updateDocument(doc)
        setIsDirty(false)
      }
    } catch {
      setSaveError('Save failed')
    } finally {
      setIsSaving(false)
    }
  }, [isNew, docId, form, createdAt, saveDocument, updateDocument, navigate])

  useEffect(() => {
    if (!hasInitializedRef.current || !isDirty) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(handleSave, 1500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [handleSave, isDirty])

  // Save status
  const statusText = saveError
    ? saveError
    : isSaving
      ? 'Saving…'
      : isDirty
        ? 'Unsaved changes'
        : 'All changes saved'

  const statusColor = saveError
    ? 'text-red-500'
    : isDirty || isSaving
      ? 'text-amber-500'
      : 'text-gray-400'

  // Export handlers
  const handleCopyMarkdown = async () => {
    await handleSave()
    await copyPRDMarkdownToClipboard(form, createdAt, modifiedAt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = async () => {
    await handleSave()
    printDocument()
  }

  const handleDocx = async () => {
    await handleSave()
    downloadPRDDocx(form, createdAt, modifiedAt)
  }

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(buildFullPRDPrompt(form))
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const handlePasteResponse = (text: string) => {
    try {
      const raw = parsePRDResponse(text)
      const sf = (f: string) => f.replace(/^⚑\s*/, '').trim()
      const stripItem = <T extends { flags: string[] }>(item: T): T => ({
        ...item,
        flags: item.flags.map(sf),
      })
      const stripSection = <T extends { flags: string[] }>(
        s: T | undefined
      ): T | undefined => (s ? stripItem(s) : undefined)
      const result = {
        ...raw,
        sections: {
          overview: stripSection(raw.sections.overview),
          problemStatement: stripSection(raw.sections.problemStatement),
          objective: stripSection(raw.sections.objective),
          notes: stripSection(raw.sections.notes),
        },
        successMetrics: raw.successMetrics.map(stripItem),
        requirements: raw.requirements.map(stripItem),
        outOfScope: raw.outOfScope.map(stripItem),
        openQuestions: raw.openQuestions.map(stripItem),
        scenarios: raw.scenarios.map(stripItem),
      }
      setEnhanceResult(result)
      setShowPasteModal(false)
      setEnhanceError(null)
    } catch {
      setEnhanceError(
        'Could not parse AI response. Make sure you pasted the full JSON output.'
      )
      setShowPasteModal(false)
    }
  }

  // AI Enhancement
  const handleEnhance = async () => {
    setIsEnhancing(true)
    setEnhanceError(null)
    try {
      await handleSave()
      const result = await enhancePRD(form)
      setEnhanceResult(result)
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : 'Enhancement failed')
    } finally {
      setIsEnhancing(false)
    }
  }

  const applyPRDEnhancements = (accepted: PRDAcceptedChanges) => {
    const patch: Partial<PRDForm> = {}

    // Text fields
    if (accepted.sections.overview !== undefined)
      patch.overview = accepted.sections.overview
    if (accepted.sections.problemStatement !== undefined)
      patch.problemStatement = accepted.sections.problemStatement
    if (accepted.sections.objective !== undefined)
      patch.objective = accepted.sections.objective
    if (accepted.sections.notes !== undefined)
      patch.notes = accepted.sections.notes

    // List items
    if (Object.keys(accepted.successMetrics).length > 0) {
      patch.successMetrics = form.successMetrics.map(m => {
        const improved = accepted.successMetrics[m.id]
        return improved !== undefined ? { ...m, metric: improved } : m
      })
    }
    if (Object.keys(accepted.requirements).length > 0) {
      patch.requirements = form.requirements.map(r => {
        const improved = accepted.requirements[r.id]
        return improved !== undefined ? { ...r, description: improved } : r
      })
    }
    if (Object.keys(accepted.outOfScope).length > 0) {
      patch.outOfScope = form.outOfScope.map(o => {
        const improved = accepted.outOfScope[o.id]
        return improved !== undefined ? { ...o, description: improved } : o
      })
    }
    if (Object.keys(accepted.openQuestions).length > 0) {
      patch.openQuestions = form.openQuestions.map(q => {
        const improved = accepted.openQuestions[q.id]
        return improved !== undefined ? { ...q, question: improved } : q
      })
    }
    if (Object.keys(accepted.scenarios).length > 0) {
      patch.scenarios = form.scenarios.map(s => {
        const improved = accepted.scenarios[s.id]
        return improved !== undefined ? { ...s, content: improved } : s
      })
    }

    update(patch)
    setEnhanceResult(null)
  }

  // Scenarios
  const addScenario = () => {
    update({
      scenarios: [...form.scenarios, { id: uuidv4(), title: '', content: '' }],
    })
    setTimeout(() => {
      const inputs =
        scenariosSectionRef.current?.querySelectorAll<HTMLInputElement>(
          'input[type="text"]'
        )
      inputs?.[inputs.length - 1]?.focus()
    }, 0)
  }
  const updateScenario = (id: string, patch: Partial<PRDScenario>) =>
    update({
      scenarios: form.scenarios.map(s =>
        s.id === id ? { ...s, ...patch } : s
      ),
    })
  const removeScenario = (id: string) =>
    update({ scenarios: form.scenarios.filter(s => s.id !== id) })

  // Requirements
  const addRequirement = (focusNew = false) => {
    update({
      requirements: [...form.requirements, { id: uuidv4(), description: '' }],
    })
    if (focusNew) focusLastTextarea(requirementsSectionRef)
  }
  const updateRequirement = (id: string, patch: Partial<PRDRequirementItem>) =>
    update({
      requirements: form.requirements.map(r =>
        r.id === id ? { ...r, ...patch } : r
      ),
    })
  const removeRequirement = (id: string) =>
    update({ requirements: form.requirements.filter(r => r.id !== id) })

  // Success metrics
  const addMetric = (focusNew = false) => {
    update({
      successMetrics: [...form.successMetrics, { id: uuidv4(), metric: '' }],
    })
    if (focusNew) focusLastTextarea(metricsSectionRef)
  }
  const updateMetric = (id: string, patch: Partial<PRDSuccessMetric>) =>
    update({
      successMetrics: form.successMetrics.map(m =>
        m.id === id ? { ...m, ...patch } : m
      ),
    })
  const removeMetric = (id: string) =>
    update({ successMetrics: form.successMetrics.filter(m => m.id !== id) })

  // Out of scope
  const addOutOfScope = (focusNew = false) => {
    update({
      outOfScope: [...form.outOfScope, { id: uuidv4(), description: '' }],
    })
    if (focusNew) focusLastTextarea(outOfScopeSectionRef)
  }
  const updateOutOfScope = (id: string, patch: Partial<PRDOutOfScopeItem>) =>
    update({
      outOfScope: form.outOfScope.map(o =>
        o.id === id ? { ...o, ...patch } : o
      ),
    })
  const removeOutOfScope = (id: string) =>
    update({ outOfScope: form.outOfScope.filter(o => o.id !== id) })

  // Timeline phases
  const addPhase = () => {
    const phaseNum = form.timeline.length + 1
    update({
      timeline: [
        ...form.timeline,
        {
          id: uuidv4(),
          name: `Phase ${phaseNum}`,
          dates: '',
          deliverables: '',
          dependencies: '',
        },
      ],
    })
  }
  const updatePhase = (id: string, patch: Partial<PRDTimelinePhase>) =>
    update({
      timeline: form.timeline.map(p => (p.id === id ? { ...p, ...patch } : p)),
    })
  const removePhase = (id: string) =>
    update({ timeline: form.timeline.filter(p => p.id !== id) })

  // Open questions
  const addQuestion = (focusNew = false) => {
    update({
      openQuestions: [...form.openQuestions, { id: uuidv4(), question: '' }],
    })
    if (focusNew) focusLastTextarea(questionsSectionRef)
  }
  const updateQuestion = (id: string, patch: Partial<PRDOpenQuestion>) =>
    update({
      openQuestions: form.openQuestions.map(q =>
        q.id === id ? { ...q, ...patch } : q
      ),
    })
  const removeQuestion = (id: string) =>
    update({ openQuestions: form.openQuestions.filter(q => q.id !== id) })

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{loadError}</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
          >
            ← Home
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">PRD</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div>
          <input
            type="text"
            value={form.title}
            onChange={e => update({ title: e.target.value })}
            placeholder="PRD title…"
            className="w-full text-2xl font-semibold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 print:placeholder-transparent"
          />
        </div>

        {/* Metadata — editable, hidden in print */}
        <div className="border border-gray-200 rounded-lg p-4 print:hidden">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {(
              [
                ['Author', 'author', 'Product Manager name'],
                ['Version', 'version', 'e.g. 1.0'],
                ['Product Area', 'productArea', 'e.g. Payments / Checkout'],
                ['Dev Lead', 'engineeringLead', 'Name'],
                ['Design Lead', 'designLead', 'Name'],
                ['PMM', 'pmm', 'Name'],
                ['Target Launch', 'targetLaunch', 'e.g. Q2 2026'],
              ] as [string, keyof PRDMeta, string][]
            ).map(([label, field, placeholder]) => (
              <div key={field}>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {label}
                </label>
                <input
                  type="text"
                  value={form.meta[field] as string}
                  onChange={e =>
                    update({ meta: { ...form.meta, [field]: e.target.value } })
                  }
                  placeholder={placeholder}
                  className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Status
              </label>
              <select
                value={form.meta.status}
                onChange={e =>
                  update({
                    meta: {
                      ...form.meta,
                      status: e.target.value as PRDMeta['status'],
                    },
                  })
                }
                className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1"
              >
                <option>Draft</option>
                <option>In Review</option>
                <option>Approved</option>
              </select>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Key Stakeholders
              </label>
              <input
                type="text"
                value={form.meta.stakeholders}
                onChange={e =>
                  update({
                    meta: { ...form.meta, stakeholders: e.target.value },
                  })
                }
                placeholder="e.g. Alice — Eng Lead, Bob — Design, Carol — CEO"
                className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Doc Link
              </label>
              <input
                type="text"
                value={form.meta.docLink}
                onChange={e =>
                  update({ meta: { ...form.meta, docLink: e.target.value } })
                }
                placeholder="Confluence or Drive link"
                className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Metadata — print only */}
        {(() => {
          const fmt = (iso: string) =>
            new Date(iso).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          const pairs: [string, string, string, string][] = (
            [
              ['Product Manager', form.meta.author, 'Status', form.meta.status],
              [
                'Created',
                createdAt ? fmt(createdAt) : '',
                'Last Updated',
                modifiedAt ? fmt(modifiedAt) : '',
              ],
              [
                'Version',
                form.meta.version,
                'Target Launch',
                form.meta.targetLaunch,
              ],
              [
                'Product Area',
                form.meta.productArea,
                'Dev Lead',
                form.meta.engineeringLead,
              ],
              ['Design Lead', form.meta.designLead, 'PMM', form.meta.pmm],
            ] as [string, string, string, string][]
          ).filter(([, lv, , rv]) => lv || rv)

          const singles: [string, string][] = (
            [
              ['Key Stakeholders', form.meta.stakeholders],
              ['Doc Link', form.meta.docLink],
            ] as [string, string][]
          ).filter(([, v]) => v)

          if (pairs.length === 0 && singles.length === 0) return null

          return (
            <table className="hidden print:table w-full text-sm border-collapse mb-6">
              <tbody>
                {pairs.map(([ll, lv, rl, rv]) => (
                  <tr key={ll} className="border border-gray-300">
                    <td className="border border-gray-300 px-3 py-1 font-semibold text-gray-600 whitespace-nowrap w-32">
                      {ll}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-gray-800 w-[28%]">
                      {lv}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 font-semibold text-gray-600 whitespace-nowrap w-32">
                      {rl}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-gray-800">
                      {rv}
                    </td>
                  </tr>
                ))}
                {singles.map(([label, value]) => (
                  <tr key={label} className="border border-gray-300">
                    <td className="border border-gray-300 px-3 py-1 font-semibold text-gray-600 whitespace-nowrap">
                      {label}
                    </td>
                    <td
                      className="border border-gray-300 px-3 py-1 text-gray-800"
                      colSpan={3}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        })()}

        {/* Quick Tips */}
        <div className="print:hidden">
          <button
            onClick={() => setTipsOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span
              className={`transition-transform ${tipsOpen ? 'rotate-90' : ''}`}
            >
              ›
            </span>
            Quick Tips
          </button>
          {tipsOpen && (
            <ul className="mt-2 space-y-1.5 pl-5 border-l-2 border-gray-100">
              {TIPS.map((tip, i) => (
                <li key={i} className="text-sm text-gray-500">
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Export bar */}
        <div className="space-y-2 print:hidden">
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-sm ${statusColor} min-w-[140px]`}>
              {statusText}
            </span>
            <AIEnhanceDropdown
              isEnhancing={isEnhancing}
              onEnhance={handleEnhance}
              onCopyPrompt={handleCopyPrompt}
              onPasteResponse={() => setShowPasteModal(true)}
            />
            <button
              onClick={handleCopyMarkdown}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
            >
              {copied ? '✓ Copied' : 'Copy Markdown'}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
            >
              Print to PDF
            </button>
            <button
              onClick={handleDocx}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
            >
              Download .docx
            </button>
          </div>
          <p className="text-xs text-gray-400">
            For a clean PDF, uncheck <strong>Headers and Footers</strong> in the
            browser print dialog.
          </p>
          {promptCopied && (
            <p className="text-sm text-green-600">
              ✓ Prompt copied — paste into your AI tool, then use "Paste AI
              response" to import the result.
            </p>
          )}
          {enhanceError && (
            <p className="text-sm text-red-500">{enhanceError}</p>
          )}
        </div>

        {/* Overview */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Overview
          </h2>
          <textarea
            value={form.overview}
            onChange={e => update({ overview: e.target.value })}
            placeholder="1–2 sentences describing what this feature or product is, so that everyone can understand what it is about."
            rows={3}
            className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
          />
        </section>

        {/* Problem Statement */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Problem Statement
          </h2>
          <textarea
            value={form.problemStatement}
            onChange={e => update({ problemStatement: e.target.value })}
            placeholder={`Target user: Who is experiencing this problem?\nProblem: What pain or challenge are they facing?\nBusiness impact: What does this cost the business if left unsolved?`}
            rows={5}
            className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
          />
        </section>

        {/* Goals */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Goals
          </h2>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Primary Objective
            </label>
            <textarea
              value={form.objective}
              onChange={e => update({ objective: e.target.value })}
              placeholder="The single most important outcome this feature must achieve."
              rows={2}
              className="mt-1 w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Success Metrics
            </label>
            <div className="mt-1 space-y-2" ref={metricsSectionRef}>
              {form.successMetrics.map(m => (
                <SectionRow key={m.id} onRemove={() => removeMetric(m.id)}>
                  <textarea
                    rows={1}
                    value={m.metric}
                    onChange={e =>
                      updateMetric(m.id, { metric: e.target.value })
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        addMetric(true)
                      }
                    }}
                    placeholder="e.g. Adoption rate >30% within first month"
                    className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none field-sizing-content"
                  />
                </SectionRow>
              ))}
            </div>
            <button
              onClick={() => addMetric(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
            >
              + Add metric
            </button>
          </div>
        </section>

        {/* How This Works */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            How This Works
          </h2>
          <div className="space-y-4" ref={scenariosSectionRef}>
            {form.scenarios.map(scenario => (
              <div
                key={scenario.id}
                className="group bg-white border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">
                    Scenario
                  </span>
                  <input
                    type="text"
                    value={scenario.title}
                    onChange={e =>
                      updateScenario(scenario.id, { title: e.target.value })
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        // focus the textarea in this card
                        const card = e.currentTarget.closest('.group')
                        card
                          ?.querySelector<HTMLTextAreaElement>('textarea')
                          ?.focus()
                      }
                    }}
                    placeholder="e.g. Happy Path, Alternative — Low Inventory, Error State"
                    className="flex-1 font-medium text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
                  />
                  <button
                    onClick={() => removeScenario(scenario.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 print:hidden"
                    aria-label="Remove scenario"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={scenario.content}
                  onChange={e =>
                    updateScenario(scenario.id, { content: e.target.value })
                  }
                  placeholder="Describe step by step: who the user is, what they're trying to do, what happens at each step, and the outcome."
                  rows={4}
                  className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
                />
              </div>
            ))}
          </div>
          <button
            onClick={addScenario}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add scenario
          </button>
        </section>

        {/* Requirements */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Requirements
            </h2>
            <button
              onClick={() => setShowImportModal(true)}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors print:hidden"
            >
              Import from Code Review
            </button>
          </div>
          <div className="space-y-2" ref={requirementsSectionRef}>
            {form.requirements.map(req => (
              <SectionRow
                key={req.id}
                onRemove={() => removeRequirement(req.id)}
              >
                <textarea
                  rows={1}
                  value={req.description}
                  onChange={e =>
                    updateRequirement(req.id, { description: e.target.value })
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      addRequirement(true)
                    }
                  }}
                  placeholder="Describe the requirement…"
                  className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none field-sizing-content"
                />
              </SectionRow>
            ))}
          </div>
          <button
            onClick={() => addRequirement(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add requirement
          </button>
        </section>

        {/* Out of Scope */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Out of Scope
          </h2>
          <div className="space-y-2" ref={outOfScopeSectionRef}>
            {form.outOfScope.map(item => (
              <SectionRow
                key={item.id}
                onRemove={() => removeOutOfScope(item.id)}
              >
                <textarea
                  rows={1}
                  value={item.description}
                  onChange={e =>
                    updateOutOfScope(item.id, { description: e.target.value })
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      addOutOfScope(true)
                    }
                  }}
                  placeholder="What is NOT included in this release?"
                  className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none field-sizing-content"
                />
              </SectionRow>
            ))}
          </div>
          <button
            onClick={() => addOutOfScope(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add out of scope item
          </button>
        </section>

        {/* Timeline */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Timeline
          </h2>

          {/* Timeline — print only table */}
          {form.timeline.length > 0 &&
            (() => {
              const hasDeps = form.timeline.some(p => p.dependencies)
              return (
                <table className="hidden print:table w-full text-sm border-collapse mb-2">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap w-24">
                        Phase
                      </th>
                      <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap w-32">
                        Dates
                      </th>
                      <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-gray-600">
                        What Ships
                      </th>
                      {hasDeps && (
                        <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-gray-600">
                          Dependencies
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {form.timeline.map(phase => (
                      <tr key={phase.id}>
                        <td className="border border-gray-300 px-3 py-1.5 text-gray-800 font-medium align-top">
                          {phase.name}
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5 text-gray-700 align-top">
                          {phase.dates}
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5 text-gray-700 align-top">
                          {phase.deliverables}
                        </td>
                        {hasDeps && (
                          <td className="border border-gray-300 px-3 py-1.5 text-gray-700 align-top">
                            {phase.dependencies}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })()}

          <div className="space-y-4 print:hidden">
            {form.timeline.map(phase => (
              <div
                key={phase.id}
                className="group bg-white border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={phase.name}
                    onChange={e =>
                      updatePhase(phase.id, { name: e.target.value })
                    }
                    placeholder="Phase name…"
                    className="flex-1 font-medium text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
                  />
                  <button
                    onClick={() => removePhase(phase.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 print:hidden"
                    aria-label="Remove phase"
                  >
                    ✕
                  </button>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Dates
                  </label>
                  <input
                    type="text"
                    value={phase.dates}
                    onChange={e =>
                      updatePhase(phase.id, { dates: e.target.value })
                    }
                    placeholder="e.g. March – April 2026"
                    className="mt-1 w-full text-sm text-gray-700 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    What ships
                  </label>
                  <textarea
                    value={phase.deliverables}
                    onChange={e =>
                      updatePhase(phase.id, { deliverables: e.target.value })
                    }
                    placeholder="List the features or outcomes that will be delivered in this phase."
                    rows={2}
                    className="mt-1 w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Dependencies & constraints
                  </label>
                  <textarea
                    value={phase.dependencies}
                    onChange={e =>
                      updatePhase(phase.id, { dependencies: e.target.value })
                    }
                    placeholder="Any blockers, external dependencies, or planning constraints for this phase."
                    rows={2}
                    className="mt-1 w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addPhase}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add phase
          </button>
        </section>

        {/* Open Questions */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Open Questions
          </h2>
          <div className="space-y-2" ref={questionsSectionRef}>
            {form.openQuestions.map(q => (
              <SectionRow key={q.id} onRemove={() => removeQuestion(q.id)}>
                <textarea
                  rows={1}
                  value={q.question}
                  onChange={e =>
                    updateQuestion(q.id, { question: e.target.value })
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      addQuestion(true)
                    }
                  }}
                  placeholder="An honest assessment of what remains unknown or unresolved."
                  className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none field-sizing-content"
                />
              </SectionRow>
            ))}
          </div>
          <button
            onClick={() => addQuestion(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add question
          </button>
        </section>

        {/* Notes */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Notes
          </h2>
          <textarea
            value={form.notes}
            onChange={e => update({ notes: e.target.value })}
            placeholder="Additional context, research findings, and business data relevant to this feature."
            rows={4}
            className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
          />
        </section>
      </main>

      {showImportModal && (
        <ImportFromReviewModal
          onImport={items => {
            update({ requirements: [...form.requirements, ...items] })
            setShowImportModal(false)
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showPasteModal && (
        <PasteAIResponseModal
          onSubmit={handlePasteResponse}
          onClose={() => setShowPasteModal(false)}
        />
      )}

      {enhanceResult && (
        <PRDEnhanceModal
          result={enhanceResult}
          form={form}
          onApply={applyPRDEnhancements}
          onClose={() => setEnhanceResult(null)}
        />
      )}
    </div>
  )
}

export default PRD
