import { create } from 'zustand'
import type { SavedDocument } from '../types'

interface PRDStore {
  documents: SavedDocument[]
  loading: boolean
  error: string | null
  fetchDocuments: () => Promise<void>
  saveDocument: (doc: SavedDocument) => Promise<SavedDocument>
  updateDocument: (doc: SavedDocument) => Promise<SavedDocument>
  deleteDocument: (id: string) => Promise<void>
}

export const usePRDStore = create<PRDStore>((set, get) => ({
  documents: [],
  loading: false,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/prds')
      if (!res.ok) throw new Error('Failed to fetch PRDs')
      const docs: SavedDocument[] = await res.json()
      set({ documents: docs, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  saveDocument: async (doc: SavedDocument) => {
    const res = await fetch('/api/prds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    })
    if (!res.ok) throw new Error('Failed to save PRD')
    const saved: SavedDocument = await res.json()
    set({ documents: [...get().documents, saved] })
    return saved
  },

  updateDocument: async (doc: SavedDocument) => {
    const res = await fetch(`/api/prds/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    })
    if (!res.ok) throw new Error('Failed to update PRD')
    const updated: SavedDocument = await res.json()
    set({
      documents: get().documents.map(d => (d.id === updated.id ? updated : d)),
    })
    return updated
  },

  deleteDocument: async (id: string) => {
    const res = await fetch(`/api/prds/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete PRD')
    set({ documents: get().documents.filter(d => d.id !== id) })
  },
}))
