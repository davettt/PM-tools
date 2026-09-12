import { create } from 'zustand';
import type { SavedDocument } from '../types';
import { proposalsDB } from '../utils/db';

interface ProposalStore {
  documents: SavedDocument[];
  loading: boolean;
  error: string | null;
  fetchDocuments: () => Promise<void>;
  saveDocument: (doc: SavedDocument) => Promise<SavedDocument>;
  updateDocument: (doc: SavedDocument) => Promise<SavedDocument>;
  softDeleteDocument: (id: string) => Promise<void>;
  restoreDocument: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}

export const useProposalStore = create<ProposalStore>((set, get) => ({
  documents: [],
  loading: false,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null });

    try {
      const cached = await proposalsDB.getAll();
      if (cached.length > 0) {
        set({ documents: cached });
      }
    } catch {
      // Cache miss or error
    }

    try {
      const res = await fetch('/api/proposals');
      if (!res.ok) throw new Error('Failed to fetch proposals');
      const docs: SavedDocument[] = await res.json();
      await proposalsDB.putAll(docs);
      set({ documents: docs, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  saveDocument: async (doc: SavedDocument) => {
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new Error('Failed to save proposal');
    const saved: SavedDocument = await res.json();
    await proposalsDB.put(saved);
    set({ documents: [...get().documents, saved] });
    return saved;
  },

  updateDocument: async (doc: SavedDocument) => {
    const res = await fetch(`/api/proposals/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new Error('Failed to update proposal');
    const updated: SavedDocument = await res.json();
    await proposalsDB.put(updated);
    set({
      documents: get().documents.map(d => (d.id === updated.id ? updated : d)),
    });
    return updated;
  },

  softDeleteDocument: async (id: string) => {
    const res = await fetch(`/api/proposals/${id}/soft-delete`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to delete proposal');
    const updated: SavedDocument = await res.json();
    await proposalsDB.put(updated);
    set({
      documents: get().documents.map(d => (d.id === id ? updated : d)),
    });
  },

  restoreDocument: async (id: string) => {
    const res = await fetch(`/api/proposals/${id}/restore`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to restore proposal');
    const updated: SavedDocument = await res.json();
    await proposalsDB.put(updated);
    set({
      documents: get().documents.map(d => (d.id === id ? updated : d)),
    });
  },

  deleteDocument: async (id: string) => {
    const res = await fetch(`/api/proposals/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete proposal');
    await proposalsDB.delete(id);
    set({ documents: get().documents.filter(d => d.id !== id) });
  },
}));
