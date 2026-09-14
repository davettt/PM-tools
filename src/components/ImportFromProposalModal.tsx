import { useState, useEffect, useRef } from 'react';
import type { SavedDocument, ProposalForm } from '../types';

export interface ProposalImportData {
  problemStatement: string;
  proposedSolution: string;
  successCriteria: { id: string; description: string }[];
  inScope: { id: string; description: string }[];
  outOfScope: { id: string; description: string }[];
  openQuestions: { id: string; question: string }[];
  customSections: { title: string; content: string }[];
}

interface ImportFromProposalModalProps {
  onImport: (data: ProposalImportData) => void;
  onClose: () => void;
}

type FieldKey =
  | 'problemStatement'
  | 'proposedSolution'
  | `criterion-${string}`
  | `in-${string}`
  | `out-${string}`
  | `q-${string}`
  | `custom-${string}`;

const ImportFromProposalModal = ({ onImport, onClose }: ImportFromProposalModalProps) => {
  const [proposals, setProposals] = useState<SavedDocument[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/proposals')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((docs: SavedDocument[]) => {
        setProposals(
          docs
            .filter(d => !d.deletedAt)
            .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
        );
      })
      .catch(() => setLoadError('Could not load proposals.'));
  }, []);

  useEffect(() => {
    const focusable = () =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input[type="checkbox"]:not([disabled])'
        ) ?? []
      );
    focusable()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const els = focusable();
        if (els.length === 0) return;
        const first = els[0]!;
        const last = els[els.length - 1]!;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const selectedDoc = proposals.find(p => p.id === selectedId);
  const selectedForm = selectedDoc?.data as ProposalForm | undefined;

  const handleSelectProposal = (id: string) => {
    setSelectedId(id);
    const doc = proposals.find(p => p.id === id);
    const form = doc?.data as ProposalForm | undefined;
    if (!form) return;

    const init: Record<string, boolean> = {};
    if (form.problemStatement) init['problemStatement'] = true;
    if (form.proposedSolution) init['proposedSolution'] = true;
    for (const c of form.successCriteria) {
      if (c.description) init[`criterion-${c.id}`] = true;
    }
    for (const s of form.inScope) {
      if (s.description) init[`in-${s.id}`] = true;
    }
    for (const s of form.outOfScope) {
      if (s.description) init[`out-${s.id}`] = true;
    }
    for (const q of form.openQuestions) {
      if (q.question) init[`q-${q.id}`] = true;
    }
    for (const section of form.customSections ?? []) {
      if (section.title || section.content) init[`custom-${section.id}`] = true;
    }
    setChecked(init);
  };

  const toggleCheck = (key: FieldKey) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));

  const handleImport = () => {
    if (!selectedForm) return;

    const data: ProposalImportData = {
      problemStatement: checked['problemStatement'] ? selectedForm.problemStatement : '',
      proposedSolution: checked['proposedSolution'] ? selectedForm.proposedSolution : '',
      successCriteria: selectedForm.successCriteria
        .filter(c => checked[`criterion-${c.id}`])
        .map(c => ({ id: crypto.randomUUID(), description: c.description })),
      inScope: selectedForm.inScope
        .filter(s => checked[`in-${s.id}`])
        .map(s => ({ id: crypto.randomUUID(), description: s.description })),
      outOfScope: selectedForm.outOfScope
        .filter(s => checked[`out-${s.id}`])
        .map(s => ({ id: crypto.randomUUID(), description: s.description })),
      openQuestions: selectedForm.openQuestions
        .filter(q => checked[`q-${q.id}`])
        .map(q => ({ id: crypto.randomUUID(), question: q.question })),
      customSections: (selectedForm.customSections ?? [])
        .filter(section => checked[`custom-${section.id}`])
        .map(section => ({ title: section.title, content: section.content })),
    };

    onImport(data);
  };

  const selectedCount = Object.values(checked).filter(Boolean).length;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const renderCheckItem = (key: FieldKey, label: string, value: string) => {
    if (!value) return null;
    return (
      <label
        key={key}
        className="flex gap-3 items-start px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
      >
        <input
          type="checkbox"
          checked={checked[key] ?? false}
          onChange={() => toggleCheck(key)}
          className="mt-0.5 shrink-0 accent-blue-600"
        />
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-medium">{label}</p>
          <p className="text-sm text-gray-800 line-clamp-3">{value}</p>
        </div>
      </label>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-proposal-modal-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 id="import-proposal-modal-title" className="text-base font-semibold text-gray-900">
            Import from Proposal
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loadError && <p className="text-red-600 text-sm">{loadError}</p>}

          {!loadError && proposals.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No saved proposals found.</p>
          )}

          {!selectedId && proposals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">Select a proposal to import from:</p>
              {proposals.map(doc => {
                const form = doc.data as ProposalForm;
                const status = form.meta?.status;
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectProposal(doc.id)}
                    className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm">
                        {doc.title || 'Untitled Proposal'}
                      </p>
                      {status && status !== 'Draft' && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            status === 'Approved'
                              ? 'bg-green-100 text-green-700'
                              : status === 'Rejected'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Modified {formatDate(doc.modifiedAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {selectedId && selectedForm && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  &larr; Back
                </button>
                <span className="text-sm text-gray-500">
                  {selectedDoc?.title || 'Untitled Proposal'}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-3">
                Select which sections to import into your PRD:
              </p>

              <div className="space-y-1">
                {renderCheckItem(
                  'problemStatement',
                  'Problem Statement → PRD Overview',
                  selectedForm.problemStatement
                )}
                {renderCheckItem(
                  'proposedSolution',
                  'Proposed Solution → PRD Overview',
                  selectedForm.proposedSolution
                )}

                {selectedForm.successCriteria.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide px-3 mb-1">
                      Success Criteria &rarr; PRD Success Metrics
                    </p>
                    {selectedForm.successCriteria.map(c =>
                      renderCheckItem(`criterion-${c.id}`, '', c.description)
                    )}
                  </div>
                )}

                {selectedForm.inScope.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide px-3 mb-1">
                      In Scope &rarr; PRD Requirements
                    </p>
                    {selectedForm.inScope.map(s =>
                      renderCheckItem(`in-${s.id}`, '', s.description)
                    )}
                  </div>
                )}

                {selectedForm.outOfScope.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide px-3 mb-1">
                      Out of Scope
                    </p>
                    {selectedForm.outOfScope.map(s =>
                      renderCheckItem(`out-${s.id}`, '', s.description)
                    )}
                  </div>
                )}

                {selectedForm.openQuestions.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide px-3 mb-1">
                      Open Questions
                    </p>
                    {selectedForm.openQuestions.map(q =>
                      renderCheckItem(`q-${q.id}`, '', q.question)
                    )}
                  </div>
                )}

                {(selectedForm.customSections ?? []).length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide px-3 mb-1">
                      Additional Sections &rarr; PRD Overview
                    </p>
                    {selectedForm.customSections.map(section =>
                      renderCheckItem(
                        `custom-${section.id}`,
                        section.title || 'Untitled section',
                        section.content
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          {selectedId && (
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {selectedCount === 0
                ? 'Nothing selected'
                : `Import ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportFromProposalModal;
