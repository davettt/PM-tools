import { useState } from 'react'
import type { CodeReviewForm } from '../types'
import { copyMarkdownToClipboard } from '../utils/exportMarkdown'
import { downloadDocx } from '../utils/exportDocx'
import { printDocument } from '../utils/exportPrint'

interface ExportBarProps {
  form: CodeReviewForm
  saveNow: () => Promise<void>
  isSaving: boolean
  isDirty: boolean
  saveError: string | null
}

const ExportBar = ({
  form,
  saveNow,
  isSaving,
  isDirty,
  saveError,
}: ExportBarProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopyMarkdown = async () => {
    await saveNow()
    await copyMarkdownToClipboard(form)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = async () => {
    await saveNow()
    printDocument()
  }

  const handleDocx = async () => {
    await saveNow()
    downloadDocx(form)
  }

  const statusText = () => {
    if (saveError) return saveError
    if (isSaving) return 'Saving…'
    if (isDirty) return 'Unsaved changes'
    return 'All changes saved'
  }

  const statusColor = saveError
    ? 'text-red-500'
    : isDirty || isSaving
      ? 'text-amber-500'
      : 'text-gray-400'

  return (
    <div className="space-y-2 print:hidden">
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`text-sm ${statusColor} min-w-[140px]`}>
          {statusText()}
        </span>

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
    </div>
  )
}

export default ExportBar
