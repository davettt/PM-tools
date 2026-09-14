import { useState, useEffect, useRef } from 'react';
import type { ProposalForm, ProposalEnhancementResult, ProposalItemImprovement } from '../types';

interface ProposalEnhanceModalProps {
  result: ProposalEnhancementResult;
  form: ProposalForm;
  onApply: (accepted: ProposalAcceptedChanges) => void;
  onClose: () => void;
}

export interface ProposalAcceptedChanges {
  sections: Record<string, string>;
  successCriteria: Record<string, string>;
  inScope: Record<string, string>;
  outOfScope: Record<string, string>;
  risks: Record<string, { risk: string; mitigation: string }>;
  openQuestions: Record<string, string>;
  customSections: Record<string, string>;
}

const SECTION_LABELS: Record<string, string> = {
  problemStatement: 'Problem Statement',
  opportunity: 'Opportunity',
  proposedSolution: 'Proposed Solution',
  resourceEstimate: 'Resource Estimate',
  notes: 'Notes',
};

const flagKey = (itemKey: string, i: number) => `${itemKey}-f${i}`;

const ProposalEnhanceModal = ({ result, form, onApply, onClose }: ProposalEnhanceModalProps) => {
  const originalSections: Record<string, string> = {
    problemStatement: form.problemStatement,
    opportunity: form.opportunity,
    proposedSolution: form.proposedSolution,
    resourceEstimate: form.resourceEstimate,
    notes: form.notes,
  };
  const originalCriteria = Object.fromEntries(form.successCriteria.map(c => [c.id, c.description]));
  const originalInScope = Object.fromEntries(form.inScope.map(s => [s.id, s.description]));
  const originalOutOfScope = Object.fromEntries(form.outOfScope.map(s => [s.id, s.description]));
  const originalRisks = Object.fromEntries(
    form.risks.map(r => [r.id, { risk: r.risk, mitigation: r.mitigation }])
  );
  const originalQuestions = Object.fromEntries(form.openQuestions.map(q => [q.id, q.question]));
  const originalCustomSections = Object.fromEntries(
    form.customSections.map(section => [section.id, section.content])
  );

  const initChecked = () => {
    const checked: Record<string, boolean> = {};
    for (const [key, improvement] of Object.entries(result.sections)) {
      if (improvement) {
        checked[`section-${key}`] = improvement.improved !== (originalSections[key] ?? '');
      }
    }
    const listGroups: [string, ProposalItemImprovement[], Record<string, string>][] = [
      ['criterion', result.successCriteria, originalCriteria],
      ['in', result.inScope, originalInScope],
      ['out', result.outOfScope, originalOutOfScope],
      ['q', result.openQuestions, originalQuestions],
      ['custom', result.customSections, originalCustomSections],
    ];
    for (const [prefix, items, originals] of listGroups) {
      for (const item of items) {
        checked[`${prefix}-${item.id}`] = item.improved !== (originals[item.id] ?? '');
      }
    }
    for (const r of result.risks) {
      const orig = originalRisks[r.id];
      checked[`risk-${r.id}`] =
        r.improvedRisk !== (orig?.risk ?? '') || r.improvedMitigation !== (orig?.mitigation ?? '');
    }
    return checked;
  };

  const [checked, setChecked] = useState<Record<string, boolean>>(initChecked);
  const [flagChecked, setFlagChecked] = useState<Record<string, boolean>>({});
  const modalRef = useRef<HTMLDivElement>(null);

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

  const toggle = (key: string) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleFlag = (key: string) => setFlagChecked(prev => ({ ...prev, [key]: !prev[key] }));

  const totalSelected = Object.values(checked).filter(Boolean).length;

  const buildText = (itemKey: string, base: string, flags: string[]): string => {
    const selectedFlags = flags.filter((_, i) => flagChecked[flagKey(itemKey, i)]);
    if (selectedFlags.length === 0) return base;
    return `${base} [TODO: ${selectedFlags.join('; ')}]`;
  };

  const handleApply = () => {
    const accepted: ProposalAcceptedChanges = {
      sections: {},
      successCriteria: {},
      inScope: {},
      outOfScope: {},
      risks: {},
      openQuestions: {},
      customSections: {},
    };

    for (const [key, improvement] of Object.entries(result.sections)) {
      if (improvement && checked[`section-${key}`]) {
        accepted.sections[key] = buildText(
          `section-${key}`,
          improvement.improved,
          improvement.flags
        );
      }
    }

    for (const item of result.successCriteria) {
      if (checked[`criterion-${item.id}`]) {
        accepted.successCriteria[item.id] = buildText(
          `criterion-${item.id}`,
          item.improved,
          item.flags
        );
      }
    }
    for (const item of result.inScope) {
      if (checked[`in-${item.id}`]) {
        accepted.inScope[item.id] = buildText(`in-${item.id}`, item.improved, item.flags);
      }
    }
    for (const item of result.outOfScope) {
      if (checked[`out-${item.id}`]) {
        accepted.outOfScope[item.id] = buildText(`out-${item.id}`, item.improved, item.flags);
      }
    }
    for (const r of result.risks) {
      if (checked[`risk-${r.id}`]) {
        const selectedFlags = r.flags.filter((_, i) => flagChecked[flagKey(`risk-${r.id}`, i)]);
        const suffix = selectedFlags.length > 0 ? ` [TODO: ${selectedFlags.join('; ')}]` : '';
        accepted.risks[r.id] = {
          risk: r.improvedRisk + suffix,
          mitigation: r.improvedMitigation,
        };
      }
    }
    for (const item of result.openQuestions) {
      if (checked[`q-${item.id}`]) {
        accepted.openQuestions[item.id] = buildText(`q-${item.id}`, item.improved, item.flags);
      }
    }
    for (const item of result.customSections) {
      if (checked[`custom-${item.id}`]) {
        accepted.customSections[item.id] = buildText(
          `custom-${item.id}`,
          item.improved,
          item.flags
        );
      }
    }

    onApply(accepted);
  };

  const renderItem = (itemKey: string, improved: string, original: string, flags: string[]) => {
    const hasTextChange = improved !== original;
    const isActionable = hasTextChange || flags.length > 0;
    const isChecked = checked[itemKey] ?? false;

    return (
      <div className={`py-3 ${!isActionable ? 'opacity-40' : ''}`}>
        <label className={`flex gap-3 ${isActionable ? 'cursor-pointer' : 'cursor-default'}`}>
          <input
            type="checkbox"
            checked={isChecked}
            disabled={!isActionable}
            onChange={() => toggle(itemKey)}
            className="mt-0.5 shrink-0 accent-blue-600"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{improved}</p>
            {hasTextChange && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                was: &ldquo;{original}&rdquo;
              </p>
            )}
          </div>
        </label>
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-6">
            {flags.map((flag, i) => {
              const fk = flagKey(itemKey, i);
              const isFlagChecked = flagChecked[fk] ?? false;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleFlag(fk)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    isFlagChecked
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-600'
                  }`}
                  title={
                    isFlagChecked
                      ? 'Click to deselect — will not be added as TODO'
                      : 'Click to select — will append [TODO: …] to this field'
                  }
                >
                  &#9873; {flag}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderRiskItem = (
    riskId: string,
    improvedRisk: string,
    improvedMitigation: string,
    origRisk: string,
    origMitigation: string,
    flags: string[]
  ) => {
    const hasChange = improvedRisk !== origRisk || improvedMitigation !== origMitigation;
    const isActionable = hasChange || flags.length > 0;
    const itemKey = `risk-${riskId}`;
    const isChecked = checked[itemKey] ?? false;

    return (
      <div className={`py-3 ${!isActionable ? 'opacity-40' : ''}`}>
        <label className={`flex gap-3 ${isActionable ? 'cursor-pointer' : 'cursor-default'}`}>
          <input
            type="checkbox"
            checked={isChecked}
            disabled={!isActionable}
            onChange={() => toggle(itemKey)}
            className="mt-0.5 shrink-0 accent-blue-600"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm text-gray-800">
              <span className="font-medium">Risk:</span> {improvedRisk}
            </p>
            <p className="text-sm text-gray-800">
              <span className="font-medium">Mitigation:</span> {improvedMitigation}
            </p>
            {hasChange && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                was: &ldquo;{origRisk}&rdquo; / &ldquo;{origMitigation}&rdquo;
              </p>
            )}
          </div>
        </label>
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-6">
            {flags.map((flag, i) => {
              const fk = flagKey(itemKey, i);
              const isFlagChecked = flagChecked[fk] ?? false;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleFlag(fk)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    isFlagChecked
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  &#9873; {flag}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const hasAnySectionChange = Object.entries(result.sections).some(
    ([key, imp]) => imp && imp.improved !== (originalSections[key] ?? '')
  );
  const hasAnySectionFlag = Object.values(result.sections).some(imp => imp && imp.flags.length > 0);
  const hasAnyListChange = [
    ...result.successCriteria,
    ...result.inScope,
    ...result.outOfScope,
    ...result.openQuestions,
    ...result.customSections,
  ].some(
    item =>
      item.improved !==
        (originalCriteria[item.id] ??
          originalInScope[item.id] ??
          originalOutOfScope[item.id] ??
          originalQuestions[item.id] ??
          '') || item.flags.length > 0
  );
  const hasAnyRiskChange = result.risks.some(r => {
    const orig = originalRisks[r.id];
    return (
      r.improvedRisk !== (orig?.risk ?? '') ||
      r.improvedMitigation !== (orig?.mitigation ?? '') ||
      r.flags.length > 0
    );
  });

  const hasAnything =
    hasAnySectionChange ||
    hasAnySectionFlag ||
    hasAnyListChange ||
    hasAnyRiskChange ||
    result.missingSections.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-enhance-modal-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 id="proposal-enhance-modal-title" className="text-base font-semibold text-gray-900">
            Proposal Review
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {!hasAnything && (
            <div className="py-8 text-center text-gray-400 text-sm">
              This proposal looks good — no improvements suggested.
            </div>
          )}

          {(hasAnySectionChange || hasAnySectionFlag) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Section Content
              </h3>
              <div className="divide-y divide-gray-100">
                {Object.entries(result.sections).map(([key, improvement]) => {
                  if (!improvement) return null;
                  return (
                    <div key={key}>
                      <p className="text-xs text-gray-400 pt-3 font-medium">
                        {SECTION_LABELS[key] ?? key}
                      </p>
                      {renderItem(
                        `section-${key}`,
                        improvement.improved,
                        originalSections[key] ?? '',
                        improvement.flags
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {result.successCriteria.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Success Criteria
              </h3>
              <div className="divide-y divide-gray-100">
                {result.successCriteria.map(item =>
                  renderItem(
                    `criterion-${item.id}`,
                    item.improved,
                    originalCriteria[item.id] ?? '',
                    item.flags
                  )
                )}
              </div>
            </section>
          )}

          {result.inScope.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                In Scope
              </h3>
              <div className="divide-y divide-gray-100">
                {result.inScope.map(item =>
                  renderItem(
                    `in-${item.id}`,
                    item.improved,
                    originalInScope[item.id] ?? '',
                    item.flags
                  )
                )}
              </div>
            </section>
          )}

          {result.outOfScope.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Out of Scope
              </h3>
              <div className="divide-y divide-gray-100">
                {result.outOfScope.map(item =>
                  renderItem(
                    `out-${item.id}`,
                    item.improved,
                    originalOutOfScope[item.id] ?? '',
                    item.flags
                  )
                )}
              </div>
            </section>
          )}

          {result.risks.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Risks &amp; Mitigations
              </h3>
              <div className="divide-y divide-gray-100">
                {result.risks.map(r => {
                  const orig = originalRisks[r.id] ?? { risk: '', mitigation: '' };
                  return renderRiskItem(
                    r.id,
                    r.improvedRisk,
                    r.improvedMitigation,
                    orig.risk,
                    orig.mitigation,
                    r.flags
                  );
                })}
              </div>
            </section>
          )}

          {result.openQuestions.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Open Questions
              </h3>
              <div className="divide-y divide-gray-100">
                {result.openQuestions.map(item =>
                  renderItem(
                    `q-${item.id}`,
                    item.improved,
                    originalQuestions[item.id] ?? '',
                    item.flags
                  )
                )}
              </div>
            </section>
          )}

          {result.customSections.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Additional Sections
              </h3>
              <div className="divide-y divide-gray-100">
                {result.customSections.map(item => {
                  const title = form.customSections.find(section => section.id === item.id)?.title;
                  return (
                    <div key={item.id}>
                      <p className="text-xs text-gray-400 pt-3 font-medium">
                        {title || 'Untitled section'}
                      </p>
                      {renderItem(
                        `custom-${item.id}`,
                        item.improved,
                        originalCustomSections[item.id] ?? '',
                        item.flags
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {result.missingSections.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Attention Required
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                These sections need your attention — they cannot be filled in automatically.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg divide-y divide-amber-100">
                {result.missingSections.map((note, i) => (
                  <div key={i} className="px-4 py-3 flex gap-3">
                    <span className="text-amber-500 shrink-0">&#9873;</span>
                    <span className="text-sm text-amber-800">{note}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={totalSelected === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {totalSelected === 0
              ? 'Nothing selected'
              : `Apply ${totalSelected} improvement${totalSelected !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalEnhanceModal;
