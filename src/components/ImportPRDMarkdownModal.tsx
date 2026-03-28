import { useState, useEffect, useRef } from 'react'
import { parsePRDMarkdown } from '../utils/importPRDMarkdown'
import type { PRDForm } from '../types'

interface ImportPRDMarkdownModalProps {
  onImport: (parsed: Partial<PRDForm>) => void
  onClose: () => void
}

const ImportPRDMarkdownModal = ({
  onImport,
  onClose,
}: ImportPRDMarkdownModalProps) => {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const focusable = () =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea'
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

  const handleImport = () => {
    setError(null)
    const trimmed = text.trim()
    if (!trimmed.startsWith('# PRD [')) {
      setError(
        'This does not look like a pm-tools PRD export. Make sure you are pasting unmodified markdown copied from the "Copy Markdown" button.'
      )
      return
    }
    const parsed = parsePRDMarkdown(trimmed)
    onImport(parsed)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-md-modal-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2
              id="import-md-modal-title"
              className="text-base font-semibold text-gray-900"
            >
              Import from Markdown
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Only use this with markdown exported from pm-tools using the
              &ldquo;Copy Markdown&rdquo; button. Importing manually edited or
              externally generated markdown may produce unexpected results. This
              will create a new PRD document.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors ml-4"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-4">
          <textarea
            value={text}
            onChange={e => {
              setText(e.target.value)
              setError(null)
            }}
            placeholder="Paste pm-tools PRD markdown here…"
            rows={10}
            className="w-full text-sm text-gray-800 font-mono bg-gray-50 border border-gray-200 rounded p-3 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
          />
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={text.trim().length === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportPRDMarkdownModal
