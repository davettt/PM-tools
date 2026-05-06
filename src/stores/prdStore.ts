import { create } from 'zustand'
import type { SavedDocument } from '../types'
import { prdsDB } from '../utils/db'

interface PRDStore {
  documents: SavedDocument[]
  loading: boolean
  error: string | null
  fetchDocuments: () => Promise<void>
  saveDocument: (doc: SavedDocument) => Promise<SavedDocument>
  updateDocument: (doc: SavedDocument) => Promise<SavedDocument>
  softDeleteDocument: (id: string) => Promise<void>
  restoreDocument: (id: string) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
}

export const usePRDStore = create<PRDStore>((set, get) => ({
  documents: [],
  loading: false,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null })

    try {
      const cached = await prdsDB.getAll()
      if (cached.length > 0) {
        set({ documents: cached })
      }
    } catch {
      // Cache miss or error — continue to API fetch
    }

    try {
      const res = await fetch('/api/prds')
      if (!res.ok) throw new Error('Failed to fetch PRDs')
      const docs: SavedDocument[] = await res.json()
      await prdsDB.putAll(docs)
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
    await prdsDB.put(saved)
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
    await prdsDB.put(updated)
    set({
      documents: get().documents.map(d => (d.id === updated.id ? updated : d)),
    })
    return updated
  },

  softDeleteDocument: async (id: string) => {
    const res = await fetch(`/api/prds/${id}/soft-delete`, { method: 'PATCH' })
    if (!res.ok) throw new Error('Failed to delete PRD')
    const updated: SavedDocument = await res.json()
    await prdsDB.put(updated)
    set({
      documents: get().documents.map(d => (d.id === id ? updated : d)),
    })
  },

  restoreDocument: async (id: string) => {
    const res = await fetch(`/api/prds/${id}/restore`, { method: 'PATCH' })
    if (!res.ok) throw new Error('Failed to restore PRD')
    const updated: SavedDocument = await res.json()
    await prdsDB.put(updated)
    set({
      documents: get().documents.map(d => (d.id === id ? updated : d)),
    })
  },

  deleteDocument: async (id: string) => {
    const res = await fetch(`/api/prds/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete PRD')
    await prdsDB.delete(id)
    set({ documents: get().documents.filter(d => d.id !== id) })
  },
}))
