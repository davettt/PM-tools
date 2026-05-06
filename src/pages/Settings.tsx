import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReviewStore } from '../stores/reviewStore'
import { usePRDStore } from '../stores/prdStore'

interface ImportResult {
  added: number
  updated: number
  unchanged: number
}

const Settings = () => {
  const navigate = useNavigate()
  const { documents: reviews, fetchDocuments: fetchReviews } = useReviewStore()
  const { documents: prds, fetchDocuments: fetchPRDs } = usePRDStore()

  useEffect(() => {
    fetchReviews()
    fetchPRDs()
  }, [fetchReviews, fetchPRDs])

  const [prdImportResult, setPrdImportResult] = useState<ImportResult | null>(
    null
  )
  const [reviewImportResult, setReviewImportResult] =
    useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const prdFileRef = useRef<HTMLInputElement>(null)
  const reviewFileRef = useRef<HTMLInputElement>(null)

  const activePRDs = prds.filter(d => !d.deletedAt)
  const activeReviews = reviews.filter(d => !d.deletedAt)

  const downloadJSON = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const dateStamp = () => new Date().toISOString().slice(0, 10)

  const handleExportPRDs = () =>
    downloadJSON(activePRDs, `pm-tools-prds-${dateStamp()}.json`)

  const handleExportReviews = () =>
    downloadJSON(activeReviews, `pm-tools-reviews-${dateStamp()}.json`)

  const handleImportFile = async (
    file: File,
    endpoint: string,
    setResult: (r: ImportResult) => void,
    refreshStore: () => void
  ) => {
    setImportError(null)
    setPrdImportResult(null)
    setReviewImportResult(null)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!Array.isArray(data)) {
        setImportError(
          'Invalid file — expected a JSON array of documents. Use a file exported from PM Tools.'
        )
        return
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Import failed')
      const result: ImportResult = await res.json()
      setResult(result)
      refreshStore()
    } catch {
      setImportError(
        'Could not import file. Make sure it is a valid PM Tools backup JSON.'
      )
    }
  }

  const handlePRDImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file)
      handleImportFile(file, '/api/prds/import', setPrdImportResult, fetchPRDs)
    e.target.value = ''
  }

  const handleReviewImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file)
      handleImportFile(
        file,
        '/api/reviews/import',
        setReviewImportResult,
        fetchReviews
      )
    e.target.value = ''
  }

  const formatResult = (r: ImportResult) => {
    const parts: string[] = []
    if (r.added > 0) parts.push(`${r.added} added`)
    if (r.updated > 0) parts.push(`${r.updated} updated`)
    if (r.unchanged > 0) parts.push(`${r.unchanged} unchanged`)
    return parts.join(', ')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-10">
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
            Backup &amp; Restore
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Export downloads a JSON backup of all active documents. Import
            merges a backup into your current data — new documents are added,
            newer versions replace older ones, and nothing is deleted.
          </p>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">PRDs</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activePRDs.length}{' '}
                    {activePRDs.length === 1 ? 'document' : 'documents'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportPRDs}
                    disabled={activePRDs.length === 0}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => prdFileRef.current?.click()}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
                  >
                    Import
                  </button>
                  <input
                    ref={prdFileRef}
                    type="file"
                    accept=".json"
                    onChange={handlePRDImport}
                    className="hidden"
                  />
                </div>
              </div>
              {prdImportResult && (
                <p className="text-xs text-green-600 mt-2">
                  Import complete: {formatResult(prdImportResult)}.
                </p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    Acceptance Reviews
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeReviews.length}{' '}
                    {activeReviews.length === 1 ? 'document' : 'documents'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportReviews}
                    disabled={activeReviews.length === 0}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => reviewFileRef.current?.click()}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
                  >
                    Import
                  </button>
                  <input
                    ref={reviewFileRef}
                    type="file"
                    accept=".json"
                    onChange={handleReviewImport}
                    className="hidden"
                  />
                </div>
              </div>
              {reviewImportResult && (
                <p className="text-xs text-green-600 mt-2">
                  Import complete: {formatResult(reviewImportResult)}.
                </p>
              )}
            </div>

            {importError && (
              <p className="text-sm text-red-500">{importError}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Settings
