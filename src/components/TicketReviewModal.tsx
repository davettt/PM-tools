import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { PRDTicket, PRDTicketSuggestion } from '../types';

interface TicketReviewModalProps {
  suggestions: PRDTicketSuggestion[];
  onAccept: (tickets: PRDTicket[]) => void;
  onClose: () => void;
}

const TicketReviewModal = ({ suggestions, onAccept, onClose }: TicketReviewModalProps) => {
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (let i = 0; i < suggestions.length; i++) {
      init[i] = true;
    }
    return init;
  });

  const [edits, setEdits] = useState<PRDTicketSuggestion[]>(() => suggestions.map(s => ({ ...s })));

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focusable = () =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled])'
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

  const toggle = (i: number) => setChecked(prev => ({ ...prev, [i]: !prev[i] }));

  const updateEdit = (i: number, patch: Partial<PRDTicketSuggestion>) => {
    setEdits(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const totalSelected = Object.values(checked).filter(Boolean).length;

  const handleAccept = () => {
    const tickets: PRDTicket[] = edits
      .filter((_, i) => checked[i])
      .map(s => ({
        id: uuidv4(),
        title: s.title,
        description: s.description,
        acceptanceCriteria: s.acceptanceCriteria,
        jiraUrl: '',
        sourceRequirementIds: s.sourceRequirementIds,
      }));
    onAccept(tickets);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-review-modal-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 id="ticket-review-modal-title" className="text-base font-semibold text-gray-900">
            Review Generated Tickets
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {suggestions.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">
              No tickets were suggested. Try adding more requirements first.
            </p>
          )}

          {edits.map((ticket, i) => {
            const isChecked = checked[i] ?? false;
            return (
              <div
                key={i}
                className={`border rounded-lg p-4 space-y-3 transition-colors ${
                  isChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 opacity-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(i)}
                    className="mt-1 shrink-0 accent-blue-600"
                  />
                  <div className="flex-1 min-w-0 space-y-3">
                    <input
                      type="text"
                      value={ticket.title}
                      onChange={e => updateEdit(i, { title: e.target.value })}
                      placeholder="Ticket title"
                      className="w-full text-sm font-medium text-gray-900 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
                    />
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Description
                      </label>
                      <textarea
                        value={ticket.description}
                        onChange={e => updateEdit(i, { description: e.target.value })}
                        placeholder="What to build and why"
                        rows={2}
                        className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Acceptance Criteria
                      </label>
                      <textarea
                        value={ticket.acceptanceCriteria}
                        onChange={e => updateEdit(i, { acceptanceCriteria: e.target.value })}
                        placeholder="- Should ...&#10;- Given ... When ... Then ..."
                        rows={3}
                        className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={totalSelected === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {totalSelected === 0
              ? 'Nothing selected'
              : `Accept ${totalSelected} ticket${totalSelected !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketReviewModal;
