import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReviewStore } from '../stores/reviewStore'
import { usePRDStore } from '../stores/prdStore'
import type { SavedDocument } from '../types'

const Home = () => {
  const navigate = useNavigate()
  const {
    documents: reviews,
    loading: reviewsLoading,
    error: reviewsError,
    fetchDocuments: fetchReviews,
    deleteDocument: deleteReview,
  } = useReviewStore()

  const {
    documents: prds,
    loading: prdsLoading,
    error: prdsError,
    fetchDocuments: fetchPRDs,
    deleteDocument: deletePRD,
  } = usePRDStore()

  useEffect(() => {
    fetchReviews()
    fetchPRDs()
  }, [fetchReviews, fetchPRDs])

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

  const handleExportReviews = () =>
    downloadJSON(reviews, `pm-tools-reviews-${dateStamp()}.json`)

  const handleExportPRDs = () =>
    downloadJSON(prds, `pm-tools-prds-${dateStamp()}.json`)

  const handleDeleteReview = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    await deleteReview(id)
  }

  const handleDeletePRD = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    await deletePRD(id)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const sortByModified = (docs: SavedDocument[]) =>
    [...docs].sort(
      (a, b) =>
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    )

  const loading = reviewsLoading || prdsLoading
  const bothEmpty = prds.length === 0 && reviews.length === 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">PM Tools</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPRDs}
              disabled={prds.length === 0}
              title="Download a backup of all PRDs"
              className="px-3 py-2 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export PRDs
            </button>
            <button
              onClick={handleExportReviews}
              disabled={reviews.length === 0}
              title="Download a backup of all code reviews"
              className="px-3 py-2 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export Reviews
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <button
              onClick={() => navigate('/prd/new')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
            >
              + New PRD
            </button>
            <button
              onClick={() => navigate('/code-review/new')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
            >
              + New Code Review
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {loading && (
          <p className="text-gray-500 text-sm">Connecting to local server…</p>
        )}

        {(reviewsError || prdsError) && (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm space-y-2">
            <p>Failed to load documents. Try refreshing the page.</p>
            <button
              onClick={() => {
                fetchReviews()
                fetchPRDs()
              }}
              className="text-red-700 underline text-sm hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !reviewsError && !prdsError && bothEmpty && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">No documents yet</p>
            <p className="text-sm">
              Create a PRD or Code Review to get started
            </p>
          </div>
        )}

        {/* PRDs */}
        {!prdsError && (prds.length > 0 || !loading) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                PRDs
              </h2>
              {prds.length === 0 && !loading && (
                <button
                  onClick={() => navigate('/prd/new')}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  + New PRD
                </button>
              )}
            </div>
            {prds.length === 0 && !loading ? (
              <p className="text-sm text-gray-400">No PRDs yet.</p>
            ) : (
              <div className="space-y-2">
                {sortByModified(prds).map(doc => (
                  <div
                    key={doc.id}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between hover:border-gray-300 transition-colors"
                  >
                    <button
                      onClick={() => navigate(`/prd/${doc.id}`)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-gray-900">
                        {doc.title || 'Untitled PRD'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Modified {formatDate(doc.modifiedAt)}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeletePRD(doc.id, doc.title)}
                      className="text-gray-300 hover:text-red-500 transition-colors ml-4 text-sm"
                      aria-label="Delete PRD"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Code Reviews */}
        {!reviewsError && (reviews.length > 0 || !loading) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Code Reviews
              </h2>
              {reviews.length === 0 && !loading && (
                <button
                  onClick={() => navigate('/code-review/new')}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  + New Code Review
                </button>
              )}
            </div>
            {reviews.length === 0 && !loading ? (
              <p className="text-sm text-gray-400">No code reviews yet.</p>
            ) : (
              <div className="space-y-2">
                {sortByModified(reviews).map(doc => (
                  <div
                    key={doc.id}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between hover:border-gray-300 transition-colors"
                  >
                    <button
                      onClick={() => navigate(`/code-review/${doc.id}`)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-gray-900">
                        {doc.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Modified {formatDate(doc.modifiedAt)}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteReview(doc.id, doc.title)}
                      className="text-gray-300 hover:text-red-500 transition-colors ml-4 text-sm"
                      aria-label="Delete review"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Home
