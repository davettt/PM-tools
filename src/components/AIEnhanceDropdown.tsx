import { useState, useRef, useEffect } from 'react'

interface AIEnhanceDropdownProps {
  isEnhancing: boolean
  onEnhance: () => void
  onCopyPrompt: () => void
  onPasteResponse: () => void
}

const AIEnhanceDropdown = ({
  isEnhancing,
  onEnhance,
  onCopyPrompt,
  onPasteResponse,
}: AIEnhanceDropdownProps) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !isEnhancing && setOpen(o => !o)}
        disabled={isEnhancing}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors border border-gray-300 flex items-center gap-1.5"
      >
        {isEnhancing ? (
          <>
            <svg
              className="animate-spin h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Reviewing…
          </>
        ) : (
          <>
            AI Enhance
            <svg
              className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
          <button
            type="button"
            onClick={() => {
              onEnhance()
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Enhance with AI
            <span className="block text-xs text-gray-400 font-normal">
              Uses your API key
            </span>
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            type="button"
            onClick={() => {
              onCopyPrompt()
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Copy prompt
            <span className="block text-xs text-gray-400 font-normal">
              Paste into any AI tool
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              onPasteResponse()
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Paste AI response
            <span className="block text-xs text-gray-400 font-normal">
              Import JSON from external AI
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

export default AIEnhanceDropdown
