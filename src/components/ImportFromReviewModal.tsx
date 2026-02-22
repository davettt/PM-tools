import { useState, useEffect, useRef } from 'react'
import type {
  SavedDocument,
  CodeReviewForm,
  PRDRequirementItem,
} from '../types'

interface ImportFromReviewModalProps {
  onImport: (items: PRDRequirementItem[]) => void
  onClose: () => void
}

const statusLabel: Record<string, string> = {
  VERIFIED: 'Verified',
  INCOMPLETE: 'Incomplete',
  MISSING: 'Missing',
}

const statusColor: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-700',
  INCOMPLETE: 'bg-yellow-100 text-yellow-700',
  MISSING: 'bg-red-100 text-red-700',
}

const ImportFromReviewModal = ({
  onImport,
  onClose,
}: ImportFromReviewModalProps) => {
  const [reviews, setReviews] = useState<SavedDocument[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/reviews')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((docs: SavedDocument[]) => {
        setReviews(
          [...docs].sort(
            (a, b) =>
              new Date(b.modifiedAt).getTime() -
              new Date(a.modifiedAt).getTime()
          )
        )
      })
      .catch(() => setLoadError('Could not load code reviews.'))
  }, [])

  // Auto-focus and keyboard handling
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

  const selectedReview = reviews.find(r => r.id === selectedReviewId)
  const selectedForm = selectedReview?.data as CodeReviewForm | undefined
  const requirements = selectedForm?.requirements ?? []

  const handleSelectReview = (id: string) => {
    setSelectedReviewId(id)
    const doc = reviews.find(r => r.id === id)
    const reqs = (doc?.data as CodeReviewForm)?.requirements ?? []
    const initChecked: Record<string, boolean> = {}
    for (const req of reqs) {
      initChecked[req.id] = true
    }
    setChecked(initChecked)
  }

  const toggleCheck = (id: string) =>
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))

  const handleImport = () => {
    const items: PRDRequirementItem[] = requirements
      .filter(r => checked[r.id])
      .map(r => ({
        id: crypto.randomUUID(),
        description: r.description,
        sourceReviewId: selectedReviewId ?? undefined,
      }))
    onImport(items)
  }

  const selectedCount = Object.values(checked).filter(Boolean).length

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2
            id="import-modal-title"
            className="text-base font-semibold text-gray-900"
          >
            Import Requirements from Code Review
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loadError && <p className="text-red-600 text-sm">{loadError}</p>}

          {!loadError && reviews.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">
              No saved code reviews found.
            </p>
          )}

          {!selectedReviewId && reviews.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">
                Select a code review to import requirements from:
              </p>
              {reviews.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectReview(doc.id)}
                  className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <p className="font-medium text-gray-900 text-sm">
                    {doc.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Modified {formatDate(doc.modifiedAt)}
                  </p>
                </button>
              ))}
            </div>
          )}

          {selectedReviewId && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setSelectedReviewId(null)}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ← Back
                </button>
                <span className="text-sm text-gray-500">
                  {selectedReview?.title || 'Untitled'}
                </span>
              </div>

              {requirements.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">
                  This review has no requirements.
                </p>
              )}

              {requirements.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 mb-3">
                    Select which requirements to import:
                  </p>
                  {requirements.map(req => (
                    <label
                      key={req.id}
                      className="flex gap-3 items-start px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked[req.id] ?? false}
                        onChange={() => toggleCheck(req.id)}
                        className="mt-0.5 shrink-0 accent-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <span
                          className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium mr-2 ${statusColor[req.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {statusLabel[req.status] ?? req.status}
                        </span>
                        <span className="text-sm text-gray-800">
                          {req.description}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
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
          {selectedReviewId && (
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {selectedCount === 0
                ? 'Nothing selected'
                : `Import ${selectedCount} requirement${selectedCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportFromReviewModal
