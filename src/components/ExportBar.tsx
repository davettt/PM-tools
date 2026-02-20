import { useState } from 'react'
import type { CodeReviewForm } from '../types'
import { copyMarkdownToClipboard } from '../utils/exportMarkdown'
import { downloadDocx } from '../utils/exportDocx'
import { printDocument } from '../utils/exportPrint'

interface ExportBarProps {
  form: CodeReviewForm
  onSave: () => Promise<void>
  isSaving: boolean
  isDirty: boolean
}

const ExportBar = ({ form, onSave, isSaving, isDirty }: ExportBarProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopyMarkdown = async () => {
    await copyMarkdownToClipboard(form)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-wrap gap-2 items-center print:hidden">
      <button
        onClick={onSave}
        disabled={isSaving || !isDirty}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
      >
        {isSaving ? 'Saving…' : isDirty ? 'Save' : 'Saved'}
      </button>

      <button
        onClick={handleCopyMarkdown}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
      >
        {copied ? '✓ Copied' : 'Copy Markdown'}
      </button>

      <button
        onClick={printDocument}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
      >
        Print to PDF
      </button>

      <button
        onClick={() => downloadDocx(form)}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
      >
        Download .docx
      </button>
    </div>
  )
}

export default ExportBar
