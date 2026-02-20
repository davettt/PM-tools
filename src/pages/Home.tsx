import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReviewStore } from '../stores/reviewStore'

const Home = () => {
  const navigate = useNavigate()
  const { documents, loading, error, fetchDocuments, deleteDocument } =
    useReviewStore()

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    await deleteDocument(id)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">PM Tools</h1>
          <button
            onClick={() => navigate('/code-review/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            + New Code Review
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading && (
          <p className="text-gray-500 text-sm">Loading…</p>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
            Could not connect to local server. Make sure{' '}
            <code className="font-mono">npm run dev</code> is running.
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">No reviews yet</p>
            <p className="text-sm">Create your first PM code review above</p>
          </div>
        )}

        {documents.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Code Reviews
            </h2>
            {[...documents]
              .sort(
                (a, b) =>
                  new Date(b.modifiedAt).getTime() -
                  new Date(a.modifiedAt).getTime()
              )
              .map(doc => (
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
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="text-gray-300 hover:text-red-500 transition-colors ml-4 text-sm"
                    aria-label="Delete review"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Home
