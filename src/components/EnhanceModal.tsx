import { useState, useEffect, useRef } from 'react'
import type {
  CodeReviewForm,
  EnhancementResult,
  EnhancementItem,
  AcceptedChanges,
} from '../types'

interface EnhanceModalProps {
  result: EnhancementResult
  form: CodeReviewForm
  onApply: (accepted: AcceptedChanges) => void
  onClose: () => void
}

// Flag key: `{itemKey}-f{flagIndex}` e.g. `req-abc123-f0`
const flagKey = (itemKey: string, i: number) => `${itemKey}-f${i}`

const EnhanceModal = ({
  result,
  form,
  onApply,
  onClose,
}: EnhanceModalProps) => {
  const originalReqs = Object.fromEntries(
    form.requirements.map(r => [r.id, r.description])
  )
  const originalGaps = Object.fromEntries(
    form.gaps.map(g => [g.id, g.description])
  )
  const originalRecs = Object.fromEntries(
    form.recommendations.map(r => [r.id, r.description])
  )

  const initChecked = () => {
    const checked: Record<string, boolean> = {}
    for (const item of result.requirements) {
      checked[`req-${item.id}`] =
        item.improved !== (originalReqs[item.id] ?? '')
    }
    for (const item of result.gaps) {
      checked[`gap-${item.id}`] =
        item.improved !== (originalGaps[item.id] ?? '')
    }
    for (const item of result.recommendations) {
      checked[`rec-${item.id}`] =
        item.improved !== (originalRecs[item.id] ?? '')
    }
    return checked
  }

  // Item checkboxes
  const [checked, setChecked] = useState<Record<string, boolean>>(initChecked)
  // Per-flag checkboxes: all unchecked by default (opt-in)
  const [flagChecked, setFlagChecked] = useState<Record<string, boolean>>({})
  // Missing coverage: all checked by default
  const [coverageChecked, setCoverageChecked] = useState<
    Record<number, boolean>
  >(() => Object.fromEntries(result.missingCoverage.map((_, i) => [i, true])))

  const modalRef = useRef<HTMLDivElement>(null)

  // Auto-focus and Escape + focus trap
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

  const hasAnyActionable =
    result.requirements.some(
      i => i.improved !== (originalReqs[i.id] ?? '') || i.flags.length > 0
    ) ||
    result.gaps.some(
      i => i.improved !== (originalGaps[i.id] ?? '') || i.flags.length > 0
    ) ||
    result.recommendations.some(
      i => i.improved !== (originalRecs[i.id] ?? '') || i.flags.length > 0
    ) ||
    result.missingCoverage.length > 0

  const toggle = (key: string) =>
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))

  const toggleFlag = (key: string) =>
    setFlagChecked(prev => ({ ...prev, [key]: !prev[key] }))

  const toggleCoverage = (i: number) =>
    setCoverageChecked(prev => ({ ...prev, [i]: !prev[i] }))

  const totalImprovements = Object.values(checked).filter(Boolean).length
  const totalNewGaps = Object.values(coverageChecked).filter(Boolean).length

  const applyLabel = () => {
    const parts: string[] = []
    if (totalImprovements > 0)
      parts.push(
        `${totalImprovements} improvement${totalImprovements !== 1 ? 's' : ''}`
      )
    if (totalNewGaps > 0)
      parts.push(`${totalNewGaps} gap${totalNewGaps !== 1 ? 's' : ''}`)
    return parts.length > 0 ? `Apply ${parts.join(' + ')}` : 'Nothing selected'
  }

  const buildDescription = (
    item: EnhancementItem,
    itemKey: string,
    base: string
  ) => {
    const selectedFlags = item.flags.filter(
      (_, i) => flagChecked[flagKey(itemKey, i)]
    )
    if (selectedFlags.length === 0) return base
    return `${base} [TODO: ${selectedFlags.join('; ')}]`
  }

  const handleApply = () => {
    const accepted: AcceptedChanges = {
      requirements: {},
      gaps: {},
      recommendations: {},
      newGaps: [],
    }

    for (const item of result.requirements) {
      const key = `req-${item.id}`
      if (checked[key]) {
        accepted.requirements[item.id] = buildDescription(
          item,
          key,
          item.improved
        )
      }
    }
    for (const item of result.gaps) {
      const key = `gap-${item.id}`
      if (checked[key]) {
        accepted.gaps[item.id] = buildDescription(item, key, item.improved)
      }
    }
    for (const item of result.recommendations) {
      const key = `rec-${item.id}`
      if (checked[key]) {
        accepted.recommendations[item.id] = buildDescription(
          item,
          key,
          item.improved
        )
      }
    }

    accepted.newGaps = result.missingCoverage.filter(
      (_, i) => coverageChecked[i]
    )

    onApply(accepted)
  }

  const renderItem = (item: EnhancementItem, key: string, original: string) => {
    const hasTextChange = item.improved !== original
    const isActionable = hasTextChange || item.flags.length > 0
    const isChecked = checked[key] ?? false
    return (
      <div key={key} className={`py-3 ${!isActionable ? 'opacity-40' : ''}`}>
        <label
          className={`flex gap-3 ${isActionable ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <input
            type="checkbox"
            checked={isChecked}
            disabled={!isActionable}
            onChange={() => toggle(key)}
            className="mt-0.5 shrink-0 accent-blue-600"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">{item.improved}</p>
            {hasTextChange && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                was: &ldquo;{original}&rdquo;
              </p>
            )}
          </div>
        </label>
        {item.flags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-6">
            {item.flags.map((flag, i) => {
              const fk = flagKey(key, i)
              const isFlag = flagChecked[fk] ?? false
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleFlag(fk)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    isFlag
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-600'
                  }`}
                  title={
                    isFlag
                      ? 'Click to deselect — will not be added as TODO'
                      : 'Click to select — will append [TODO: …] to description'
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enhance-modal-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2
            id="enhance-modal-title"
            className="text-base font-semibold text-gray-900"
          >
            AI Review Enhancement
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
          {!hasAnyActionable && (
            <div className="py-8 text-center text-gray-400 text-sm">
              No improvements found — this review looks good as-is.
            </div>
          )}
          {result.requirements.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Requirements
              </h3>
              <div className="divide-y divide-gray-100">
                {result.requirements.map(item =>
                  renderItem(
                    item,
                    `req-${item.id}`,
                    originalReqs[item.id] ?? ''
                  )
                )}
              </div>
            </section>
          )}

          {result.gaps.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Gaps
              </h3>
              <div className="divide-y divide-gray-100">
                {result.gaps.map(item =>
                  renderItem(
                    item,
                    `gap-${item.id}`,
                    originalGaps[item.id] ?? ''
                  )
                )}
              </div>
            </section>
          )}

          {result.recommendations.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Recommendations
              </h3>
              <div className="divide-y divide-gray-100">
                {result.recommendations.map(item =>
                  renderItem(
                    item,
                    `rec-${item.id}`,
                    originalRecs[item.id] ?? ''
                  )
                )}
              </div>
            </section>
          )}

          {result.missingCoverage.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Missing Coverage
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                Selected items will be added as new gaps.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg divide-y divide-amber-100">
                {result.missingCoverage.map((note, i) => (
                  <label
                    key={i}
                    className="flex gap-3 px-4 py-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={coverageChecked[i] ?? true}
                      onChange={() => toggleCoverage(i)}
                      className="mt-0.5 shrink-0 accent-amber-600"
                    />
                    <span className="text-sm text-amber-800">{note}</span>
                  </label>
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
            disabled={totalImprovements === 0 && totalNewGaps === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {applyLabel()}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EnhanceModal
