import { useState, useEffect, useRef } from 'react'
import type {
  PRDForm,
  PRDEnhancementResult,
  PRDItemImprovement,
} from '../types'

interface PRDEnhanceModalProps {
  result: PRDEnhancementResult
  form: PRDForm
  onApply: (accepted: PRDAcceptedChanges) => void
  onClose: () => void
}

export interface PRDAcceptedChanges {
  sections: Record<string, string> // key → improved text (with optional flags appended)
  successMetrics: Record<string, string>
  requirements: Record<string, string>
  outOfScope: Record<string, string>
  openQuestions: Record<string, string>
  scenarios: Record<string, string>
}

const SECTION_LABELS: Record<string, string> = {
  overview: 'Overview',
  problemStatement: 'Problem Statement',
  objective: 'Primary Objective',
  notes: 'Notes',
}

const flagKey = (itemKey: string, i: number) => `${itemKey}-f${i}`

const PRDEnhanceModal = ({
  result,
  form,
  onApply,
  onClose,
}: PRDEnhanceModalProps) => {
  // Build originals for comparison
  const originalSections: Record<string, string> = {
    overview: form.overview,
    problemStatement: form.problemStatement,
    objective: form.objective,
    notes: form.notes,
  }
  const originalMetrics = Object.fromEntries(
    form.successMetrics.map(m => [m.id, m.metric])
  )
  const originalReqs = Object.fromEntries(
    form.requirements.map(r => [r.id, r.description])
  )
  const originalOutOfScope = Object.fromEntries(
    form.outOfScope.map(o => [o.id, o.description])
  )
  const originalQuestions = Object.fromEntries(
    form.openQuestions.map(q => [q.id, q.question])
  )
  const originalScenarios = Object.fromEntries(
    form.scenarios.map(s => [s.id, s.content])
  )

  const initChecked = () => {
    const checked: Record<string, boolean> = {}
    // Text sections
    for (const [key, improvement] of Object.entries(result.sections)) {
      if (improvement) {
        checked[`section-${key}`] =
          improvement.improved !== (originalSections[key] ?? '')
      }
    }
    // List items
    const listGroups: [string, PRDItemImprovement[], Record<string, string>][] =
      [
        ['metric', result.successMetrics, originalMetrics],
        ['req', result.requirements, originalReqs],
        ['oos', result.outOfScope, originalOutOfScope],
        ['q', result.openQuestions, originalQuestions],
        ['scenario', result.scenarios, originalScenarios],
      ]
    for (const [prefix, items, originals] of listGroups) {
      for (const item of items) {
        checked[`${prefix}-${item.id}`] =
          item.improved !== (originals[item.id] ?? '')
      }
    }
    return checked
  }

  const [checked, setChecked] = useState<Record<string, boolean>>(initChecked)
  const [flagChecked, setFlagChecked] = useState<Record<string, boolean>>({})
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const focusable = () =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input[type="checkbox"]:not([disabled])'
        ) ?? []
      )
    focusable()[0]?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const els = focusable()
        if (els.length === 0) return
        const first = els[0]!
        const last = els[els.length - 1]!
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const toggle = (key: string) =>
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleFlag = (key: string) =>
    setFlagChecked(prev => ({ ...prev, [key]: !prev[key] }))

  const totalSelected = Object.values(checked).filter(Boolean).length

  const buildText = (
    itemKey: string,
    base: string,
    flags: string[]
  ): string => {
    const selectedFlags = flags.filter(
      (_, i) => flagChecked[flagKey(itemKey, i)]
    )
    if (selectedFlags.length === 0) return base
    return `${base} [TODO: ${selectedFlags.join('; ')}]`
  }

  const handleApply = () => {
    const accepted: PRDAcceptedChanges = {
      sections: {},
      successMetrics: {},
      requirements: {},
      outOfScope: {},
      openQuestions: {},
      scenarios: {},
    }

    for (const [key, improvement] of Object.entries(result.sections)) {
      if (improvement && checked[`section-${key}`]) {
        accepted.sections[key] = buildText(
          `section-${key}`,
          improvement.improved,
          improvement.flags
        )
      }
    }

    for (const item of result.successMetrics) {
      if (checked[`metric-${item.id}`]) {
        accepted.successMetrics[item.id] = buildText(
          `metric-${item.id}`,
          item.improved,
          item.flags
        )
      }
    }
    for (const item of result.requirements) {
      if (checked[`req-${item.id}`]) {
        accepted.requirements[item.id] = buildText(
          `req-${item.id}`,
          item.improved,
          item.flags
        )
      }
    }
    for (const item of result.outOfScope) {
      if (checked[`oos-${item.id}`]) {
        accepted.outOfScope[item.id] = buildText(
          `oos-${item.id}`,
          item.improved,
          item.flags
        )
      }
    }
    for (const item of result.openQuestions) {
      if (checked[`q-${item.id}`]) {
        accepted.openQuestions[item.id] = buildText(
          `q-${item.id}`,
          item.improved,
          item.flags
        )
      }
    }
    for (const item of result.scenarios) {
      if (checked[`scenario-${item.id}`]) {
        accepted.scenarios[item.id] = buildText(
          `scenario-${item.id}`,
          item.improved,
          item.flags
        )
      }
    }

    onApply(accepted)
  }

  const renderItem = (
    itemKey: string,
    improved: string,
    original: string,
    flags: string[]
  ) => {
    const hasTextChange = improved !== original
    const isActionable = hasTextChange || flags.length > 0
    const isChecked = checked[itemKey] ?? false

    return (
      <div className={`py-3 ${!isActionable ? 'opacity-40' : ''}`}>
        <label
          className={`flex gap-3 ${isActionable ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <input
            type="checkbox"
            checked={isChecked}
            disabled={!isActionable}
            onChange={() => toggle(itemKey)}
            className="mt-0.5 shrink-0 accent-blue-600"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {improved}
            </p>
            {hasTextChange && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                was: &ldquo;{original}&rdquo;
              </p>
            )}
          </div>
        </label>
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-6">
            {flags.map((flag, i) => {
              const fk = flagKey(itemKey, i)
              const isFlagChecked = flagChecked[fk] ?? false
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleFlag(fk)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    isFlagChecked
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-600'
                  }`}
                  title={
                    isFlagChecked
                      ? 'Click to deselect — will not be added as TODO'
                      : 'Click to select — will append [TODO: …] to this field'
                  }
                >
                  ⚑ {flag}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Determine if there's anything actionable to show
  const hasAnySectionChange = Object.entries(result.sections).some(
    ([key, imp]) => imp && imp.improved !== (originalSections[key] ?? '')
  )
  const hasAnySectionFlag = Object.values(result.sections).some(
    imp => imp && imp.flags.length > 0
  )
  const hasAnyListChange = [
    ...result.successMetrics,
    ...result.requirements,
    ...result.outOfScope,
    ...result.openQuestions,
    ...result.scenarios,
  ].some(
    item =>
      item.improved !==
        (originalMetrics[item.id] ??
          originalReqs[item.id] ??
          originalOutOfScope[item.id] ??
          originalQuestions[item.id] ??
          originalScenarios[item.id] ??
          '') || item.flags.length > 0
  )

  const hasAnything =
    hasAnySectionChange ||
    hasAnySectionFlag ||
    hasAnyListChange ||
    result.missingSections.length > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prd-enhance-modal-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2
            id="prd-enhance-modal-title"
            className="text-base font-semibold text-gray-900"
          >
            PRD Review
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {!hasAnything && (
            <div className="py-8 text-center text-gray-400 text-sm">
              This PRD looks good — no improvements suggested.
            </div>
          )}

          {/* Text section improvements */}
          {(hasAnySectionChange || hasAnySectionFlag) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Section Content
              </h3>
              <div className="divide-y divide-gray-100">
                {Object.entries(result.sections).map(([key, improvement]) => {
                  if (!improvement) return null
                  return (
                    <div key={key}>
                      <p className="text-xs text-gray-400 pt-3 font-medium">
                        {SECTION_LABELS[key] ?? key}
                      </p>
                      {renderItem(
                        `section-${key}`,
                        improvement.improved,
                        originalSections[key] ?? '',
                        improvement.flags
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Success Metrics */}
          {result.successMetrics.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Success Metrics
              </h3>
              <div className="divide-y divide-gray-100">
                {result.successMetrics.map(item =>
                  renderItem(
                    `metric-${item.id}`,
                    item.improved,
                    originalMetrics[item.id] ?? '',
                    item.flags
                  )
                )}
              </div>
            </section>
          )}

          {/* Scenarios */}
          {result.scenarios.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                How This Works — Scenarios
              </h3>
              <div className="divide-y divide-gray-100">
                {result.scenarios.map(item => {
                  const scenario = form.scenarios.find(s => s.id === item.id)
                  return (
                    <div key={item.id}>
                      {scenario?.title && (
                        <p className="text-xs text-gray-400 pt-3 font-medium">
                          {scenario.title}
                        </p>
                      )}
                      {renderItem(
                        `scenario-${item.id}`,
                        item.improved,
                        originalScenarios[item.id] ?? '',
                        item.flags
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Requirements */}
          {result.requirements.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Requirements
              </h3>
              <div className="divide-y divide-gray-100">
                {result.requirements.map(item =>
                  renderItem(
                    `req-${item.id}`,
                    item.improved,
                    originalReqs[item.id] ?? '',
                    item.flags
                  )
                )}
              </div>
            </section>
          )}

          {/* Out of Scope */}
          {result.outOfScope.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Out of Scope
              </h3>
              <div className="divide-y divide-gray-100">
                {result.outOfScope.map(item =>
                  renderItem(
                    `oos-${item.id}`,
                    item.improved,
                    originalOutOfScope[item.id] ?? '',
                    item.flags
                  )
                )}
              </div>
            </section>
          )}

          {/* Open Questions */}
          {result.openQuestions.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Open Questions
              </h3>
              <div className="divide-y divide-gray-100">
                {result.openQuestions.map(item =>
                  renderItem(
                    `q-${item.id}`,
                    item.improved,
                    originalQuestions[item.id] ?? '',
                    item.flags
                  )
                )}
              </div>
            </section>
          )}

          {/* Missing sections — awareness only */}
          {result.missingSections.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Attention Required
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                These sections need your attention — they cannot be filled in
                automatically.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg divide-y divide-amber-100">
                {result.missingSections.map((note, i) => (
                  <div key={i} className="px-4 py-3 flex gap-3">
                    <span className="text-amber-500 shrink-0">⚑</span>
                    <span className="text-sm text-amber-800">{note}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={totalSelected === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {totalSelected === 0
              ? 'Nothing selected'
              : `Apply ${totalSelected} improvement${totalSelected !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PRDEnhanceModal
