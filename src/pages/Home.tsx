import { useEffect, useState } from 'react'
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
    softDeleteDocument: softDeleteReview,
    restoreDocument: restoreReview,
    deleteDocument: deleteReview,
  } = useReviewStore()

  const {
    documents: prds,
    loading: prdsLoading,
    error: prdsError,
    fetchDocuments: fetchPRDs,
    softDeleteDocument: softDeletePRD,
    restoreDocument: restorePRD,
    deleteDocument: deletePRD,
  } = usePRDStore()

  useEffect(() => {
    fetchReviews()
    fetchPRDs()
  }, [fetchReviews, fetchPRDs])

  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [confirmingPermanent, setConfirmingPermanent] = useState<string | null>(
    null
  )
  const [deletedOpen, setDeletedOpen] = useState(false)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const daysUntilPurge = (deletedAt: string) => {
    const deleteDate = new Date(deletedAt)
    const purgeDate = new Date(deleteDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    purgeDate.setHours(0, 0, 0, 0)
    const diff = purgeDate.getTime() - today.getTime()
    return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)))
  }

  const sortByModified = (docs: SavedDocument[]) =>
    [...docs].sort(
      (a, b) =>
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    )

  const activePRDs = prds.filter(d => !d.deletedAt)
  const activeReviews = reviews.filter(d => !d.deletedAt)
  const deletedDocs = [
    ...prds.filter(d => d.deletedAt),
    ...reviews.filter(d => d.deletedAt),
  ].sort(
    (a, b) =>
      new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()
  )

  const loading = reviewsLoading || prdsLoading
  const bothEmpty = activePRDs.length === 0 && activeReviews.length === 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">PM Tools</h1>
          <div className="flex items-center gap-2">
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
              + New Acceptance Review
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <button
              onClick={() => navigate('/settings')}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              title="Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                  clipRule="evenodd"
                />
              </svg>
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
              Create a PRD or Acceptance Review to get started
            </p>
          </div>
        )}

        {/* PRDs */}
        {!prdsError && (activePRDs.length > 0 || !loading) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                PRDs
              </h2>
              {activePRDs.length === 0 && !loading && (
                <button
                  onClick={() => navigate('/prd/new')}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  + New PRD
                </button>
              )}
            </div>
            {activePRDs.length === 0 && !loading ? (
              <p className="text-sm text-gray-400">No PRDs yet.</p>
            ) : (
              <div className="space-y-2">
                {sortByModified(activePRDs).map(doc => (
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
                    {confirmingDelete === doc.id ? (
                      <span className="flex items-center gap-2 ml-4">
                        <button
                          onClick={async () => {
                            await softDeletePRD(doc.id)
                            setConfirmingDelete(null)
                          }}
                          className="text-xs text-red-500 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingDelete(doc.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors ml-4 text-sm"
                        aria-label="Delete PRD"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Acceptance Reviews */}
        {!reviewsError && (activeReviews.length > 0 || !loading) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Acceptance Reviews
              </h2>
              {activeReviews.length === 0 && !loading && (
                <button
                  onClick={() => navigate('/code-review/new')}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  + New Acceptance Review
                </button>
              )}
            </div>
            {activeReviews.length === 0 && !loading ? (
              <p className="text-sm text-gray-400">
                No acceptance reviews yet.
              </p>
            ) : (
              <div className="space-y-2">
                {sortByModified(activeReviews).map(doc => (
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
                    {confirmingDelete === doc.id ? (
                      <span className="flex items-center gap-2 ml-4">
                        <button
                          onClick={async () => {
                            await softDeleteReview(doc.id)
                            setConfirmingDelete(null)
                          }}
                          className="text-xs text-red-500 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingDelete(doc.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors ml-4 text-sm"
                        aria-label="Delete review"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recently deleted documents */}
        {deletedDocs.length > 0 && (
          <div>
            <button
              onClick={() => setDeletedOpen(prev => !prev)}
              className="flex items-center gap-2 text-sm font-medium text-gray-400 uppercase tracking-wide hover:text-gray-500 transition-colors"
            >
              <span
                className="inline-block transition-transform text-xs"
                style={{
                  transform: deletedOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              >
                ▶
              </span>
              Recently Deleted ({deletedDocs.length})
            </button>
            {deletedOpen && (
              <div className="space-y-2 mt-4">
                {deletedDocs.map(doc => {
                  const days = daysUntilPurge(doc.deletedAt!)
                  const restore =
                    doc.type === 'prd' ? restorePRD : restoreReview
                  const permanentDelete =
                    doc.type === 'prd' ? deletePRD : deleteReview
                  return (
                    <div
                      key={doc.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between opacity-60"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-600">
                          {doc.title || 'Untitled'}
                          <span className="ml-2 text-xs font-normal text-gray-400">
                            {doc.type === 'prd' ? 'PRD' : 'Review'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Permanently deleted in {days}{' '}
                          {days === 1 ? 'day' : 'days'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <button
                          onClick={async () => {
                            await restore(doc.id)
                          }}
                          className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                        >
                          Restore
                        </button>
                        {confirmingPermanent === doc.id ? (
                          <span className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                await permanentDelete(doc.id)
                                setConfirmingPermanent(null)
                              }}
                              className="text-xs text-red-500 hover:text-red-600 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmingPermanent(null)}
                              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmingPermanent(doc.id)}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          >
                            Delete now
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Home
