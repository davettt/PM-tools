import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useReviewStore } from '../stores/reviewStore'
import StatusDropdown from '../components/StatusDropdown'
import SectionRow from '../components/SectionRow'
import ExportBar from '../components/ExportBar'
import type {
  CodeReviewForm,
  RequirementItem,
  GapItem,
  RecommendationItem,
  OutOfScopeItem,
  StatusOption,
  SavedDocument,
} from '../types'

const emptyForm = (): CodeReviewForm => ({
  title: '',
  requirements: [],
  gaps: [],
  recommendations: [],
  outOfScope: [],
})

const CodeReview = () => {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { saveDocument, updateDocument } = useReviewStore()

  const [form, setForm] = useState<CodeReviewForm>(emptyForm())
  const [docId, setDocId] = useState<string>('')
  const [createdAt, setCreatedAt] = useState<string>('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) {
      setDocId(uuidv4())
      setCreatedAt(new Date().toISOString())
      setIsDirty(true)
      return
    }
    if (!id) return
    fetch(`/api/reviews/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((doc: SavedDocument) => {
        setForm(doc.data)
        setDocId(doc.id)
        setCreatedAt(doc.createdAt)
        setIsDirty(false)
      })
      .catch(() => setLoadError('Could not load review.'))
  }, [id, isNew])

  const update = useCallback((patch: Partial<CodeReviewForm>) => {
    setForm(prev => ({ ...prev, ...patch }))
    setIsDirty(true)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const doc: SavedDocument = {
        id: docId,
        type: 'code-review',
        title: form.title || 'Untitled',
        createdAt: createdAt || now,
        modifiedAt: now,
        data: form,
      }
      if (isNew) {
        await saveDocument(doc)
        setIsDirty(false)
        navigate(`/code-review/${docId}`, { replace: true })
      } else {
        await updateDocument(doc)
        setIsDirty(false)
      }
    } catch {
      alert('Failed to save. Is the local server running?')
    } finally {
      setIsSaving(false)
    }
  }

  // Requirements
  const addRequirement = () =>
    update({
      requirements: [
        ...form.requirements,
        { id: uuidv4(), status: 'INCOMPLETE', description: '' },
      ],
    })
  const updateRequirement = (id: string, patch: Partial<RequirementItem>) =>
    update({
      requirements: form.requirements.map(r =>
        r.id === id ? { ...r, ...patch } : r
      ),
    })
  const removeRequirement = (id: string) =>
    update({ requirements: form.requirements.filter(r => r.id !== id) })

  // Gaps
  const addGap = () =>
    update({ gaps: [...form.gaps, { id: uuidv4(), description: '' }] })
  const updateGap = (id: string, patch: Partial<GapItem>) =>
    update({ gaps: form.gaps.map(g => (g.id === id ? { ...g, ...patch } : g)) })
  const removeGap = (id: string) =>
    update({ gaps: form.gaps.filter(g => g.id !== id) })

  // Recommendations
  const addRecommendation = () =>
    update({
      recommendations: [
        ...form.recommendations,
        { id: uuidv4(), description: '' },
      ],
    })
  const updateRecommendation = (
    id: string,
    patch: Partial<RecommendationItem>
  ) =>
    update({
      recommendations: form.recommendations.map(r =>
        r.id === id ? { ...r, ...patch } : r
      ),
    })
  const removeRecommendation = (id: string) =>
    update({
      recommendations: form.recommendations.filter(r => r.id !== id),
    })

  // Out of scope
  const addOutOfScope = () =>
    update({
      outOfScope: [
        ...form.outOfScope,
        { id: uuidv4(), title: '', acceptanceCriteria: '' },
      ],
    })
  const updateOutOfScope = (id: string, patch: Partial<OutOfScopeItem>) =>
    update({
      outOfScope: form.outOfScope.map(o =>
        o.id === id ? { ...o, ...patch } : o
      ),
    })
  const removeOutOfScope = (id: string) =>
    update({ outOfScope: form.outOfScope.filter(o => o.id !== id) })

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{loadError}</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
          >
            ← Home
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Code Review</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div>
          <input
            type="text"
            value={form.title}
            onChange={e => update({ title: e.target.value })}
            placeholder="Review title…"
            className="w-full text-2xl font-semibold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 print:placeholder-transparent"
          />
        </div>

        {/* Export bar */}
        <ExportBar
          form={form}
          onSave={handleSave}
          isSaving={isSaving}
          isDirty={isDirty}
        />

        {/* Requirements Coverage */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3 uppercase tracking-wide text-sm">
            Requirements Coverage
          </h2>
          <div className="space-y-2">
            {form.requirements.map(req => (
              <SectionRow key={req.id} onRemove={() => removeRequirement(req.id)}>
                <StatusDropdown
                  value={req.status}
                  onChange={(val: StatusOption) =>
                    updateRequirement(req.id, { status: val })
                  }
                />
                <input
                  type="text"
                  value={req.description}
                  onChange={e =>
                    updateRequirement(req.id, { description: e.target.value })
                  }
                  placeholder="Describe the requirement…"
                  className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
                />
              </SectionRow>
            ))}
          </div>
          <button
            onClick={addRequirement}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add requirement
          </button>
        </section>

        {/* Gaps Identified */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3 uppercase tracking-wide text-sm">
            Gaps Identified
          </h2>
          <div className="space-y-2">
            {form.gaps.map(gap => (
              <SectionRow key={gap.id} onRemove={() => removeGap(gap.id)}>
                <input
                  type="text"
                  value={gap.description}
                  onChange={e => updateGap(gap.id, { description: e.target.value })}
                  placeholder="Describe the gap…"
                  className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
                />
              </SectionRow>
            ))}
          </div>
          <button
            onClick={addGap}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add gap
          </button>
        </section>

        {/* Recommendations */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3 uppercase tracking-wide text-sm">
            Recommendations
          </h2>
          <div className="space-y-2">
            {form.recommendations.map(rec => (
              <SectionRow
                key={rec.id}
                onRemove={() => removeRecommendation(rec.id)}
              >
                <span className="text-gray-400 text-sm mt-1 shrink-0">☐</span>
                <input
                  type="text"
                  value={rec.description}
                  onChange={e =>
                    updateRecommendation(rec.id, { description: e.target.value })
                  }
                  placeholder="Describe the recommendation…"
                  className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
                />
              </SectionRow>
            ))}
          </div>
          <button
            onClick={addRecommendation}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add recommendation
          </button>
        </section>

        {/* Out of Scope */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3 uppercase tracking-wide text-sm">
            Out of Scope / Follow-up
          </h2>
          <div className="space-y-4">
            {form.outOfScope.map(item => (
              <div key={item.id} className="group bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    value={item.title}
                    onChange={e =>
                      updateOutOfScope(item.id, { title: e.target.value })
                    }
                    placeholder="Item title…"
                    className="flex-1 font-medium text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
                  />
                  <button
                    onClick={() => removeOutOfScope(item.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-1 print:hidden"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Acceptance Criteria
                  </label>
                  <textarea
                    value={item.acceptanceCriteria}
                    onChange={e =>
                      updateOutOfScope(item.id, {
                        acceptanceCriteria: e.target.value,
                      })
                    }
                    placeholder="Define what done looks like for this item…"
                    rows={3}
                    className="mt-1 w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addOutOfScope}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add out of scope item
          </button>
        </section>
      </main>
    </div>
  )
}

export default CodeReview
