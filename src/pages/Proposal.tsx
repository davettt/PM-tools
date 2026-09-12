import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useProposalStore } from '../stores/proposalStore';
import SectionRow from '../components/SectionRow';
import PasteAIResponseModal from '../components/PasteAIResponseModal';
import AIEnhanceDropdown from '../components/AIEnhanceDropdown';
import ProposalEnhanceModal from '../components/ProposalEnhanceModal';
import type { ProposalAcceptedChanges } from '../components/ProposalEnhanceModal';
import { copyProposalMarkdownToClipboard } from '../utils/exportProposalMarkdown';
import { downloadProposalDocx } from '../utils/exportProposalDocx';
import { printDocument } from '../utils/exportPrint';
import {
  enhanceProposal,
  buildFullProposalPrompt,
  parseProposalResponse,
} from '../utils/enhanceProposalWithAI';
import type {
  ProposalForm,
  ProposalMeta,
  ProposalSuccessCriterion,
  ProposalScopeItem,
  ProposalRisk,
  ProposalOpenQuestion,
  ProposalEnhancementResult,
  SavedDocument,
} from '../types';

const emptyMeta = (): ProposalMeta => ({
  author: '',
  status: 'Draft',
  sponsor: '',
  stakeholders: '',
});

const emptyForm = (): ProposalForm => ({
  title: '',
  meta: emptyMeta(),
  problemStatement: '',
  opportunity: '',
  proposedSolution: '',
  successCriteria: [],
  inScope: [],
  outOfScope: [],
  risks: [],
  resourceEstimate: '',
  openQuestions: [],
  notes: '',
});

const TIPS = [
  'Keep proposals concise: 1 page is ideal, 2 pages maximum.',
  'Focus on the why, not the how. The PRD will cover implementation details.',
  'Include rough resource estimates so stakeholders can make informed decisions.',
  'If approved, use the PRD tool and import from this proposal to carry your work forward.',
];

const Proposal = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { saveDocument, updateDocument } = useProposalStore();

  const [form, setForm] = useState<ProposalForm>(emptyForm());
  const [docId, setDocId] = useState<string>(() => (isNew ? uuidv4() : ''));
  const initTime = isNew ? new Date().toISOString() : '';
  const [createdAt, setCreatedAt] = useState<string>(initTime);
  const [modifiedAt, setModifiedAt] = useState<string>(initTime);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceResult, setEnhanceResult] = useState<ProposalEnhancementResult | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const hasInitializedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const criteriaSectionRef = useRef<HTMLDivElement>(null);
  const inScopeSectionRef = useRef<HTMLDivElement>(null);
  const outOfScopeSectionRef = useRef<HTMLDivElement>(null);
  const risksSectionRef = useRef<HTMLDivElement>(null);
  const questionsSectionRef = useRef<HTMLDivElement>(null);

  const focusLastTextarea = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      const inputs = ref.current?.querySelectorAll<HTMLTextAreaElement>('textarea');
      inputs?.[inputs.length - 1]?.focus();
    }, 0);
  };

  useEffect(() => {
    if (isNew) {
      hasInitializedRef.current = true;
      return;
    }
    if (!id) return;
    fetch(`/api/proposals/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((doc: SavedDocument) => {
        if (doc.deletedAt) {
          navigate('/', { replace: true });
          return;
        }
        const stored = doc.data as ProposalForm;
        setForm({
          ...emptyForm(),
          ...stored,
          meta: { ...emptyMeta(), ...stored.meta },
        });
        setDocId(doc.id);
        setCreatedAt(doc.createdAt);
        setModifiedAt(doc.modifiedAt);
        setIsDirty(false);
        hasInitializedRef.current = true;
      })
      .catch(() => setLoadError('Could not load proposal.'));
  }, [id, isNew, navigate]);

  const update = useCallback((patch: Partial<ProposalForm>) => {
    setForm(prev => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const now = new Date().toISOString();
      setModifiedAt(now);
      const doc: SavedDocument = {
        id: docId,
        type: 'proposal',
        title: form.title || 'Untitled Proposal',
        createdAt: createdAt || now,
        modifiedAt: now,
        data: form,
      };
      if (isNew) {
        await saveDocument(doc);
        setIsDirty(false);
        navigate(`/proposal/${docId}`, { replace: true });
      } else {
        await updateDocument(doc);
        setIsDirty(false);
      }
    } catch {
      setSaveError('Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [isNew, docId, form, createdAt, saveDocument, updateDocument, navigate]);

  useEffect(() => {
    if (!hasInitializedRef.current || !isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(handleSave, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [handleSave, isDirty]);

  const statusText = saveError
    ? saveError
    : isSaving
      ? 'Saving…'
      : isDirty
        ? 'Unsaved changes'
        : 'All changes saved';

  const statusColor = saveError
    ? 'text-red-500'
    : isDirty || isSaving
      ? 'text-amber-500'
      : 'text-gray-400';

  const handleCopyMarkdown = async () => {
    await handleSave();
    await copyProposalMarkdownToClipboard(form, createdAt, modifiedAt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = async () => {
    await handleSave();
    printDocument();
  };

  const handleDocx = async () => {
    await handleSave();
    downloadProposalDocx(form, createdAt, modifiedAt);
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(buildFullProposalPrompt(form));
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handlePasteResponse = (text: string) => {
    try {
      const raw = parseProposalResponse(text);
      const sf = (f: string) => f.replace(/^⚑\s*/, '').trim();
      const stripItem = <T extends { flags: string[] }>(item: T): T => ({
        ...item,
        flags: item.flags.map(sf),
      });
      const stripSection = <T extends { flags: string[] }>(s: T | undefined): T | undefined =>
        s ? stripItem(s) : undefined;
      const result: ProposalEnhancementResult = {
        ...raw,
        sections: {
          problemStatement: stripSection(raw.sections.problemStatement),
          opportunity: stripSection(raw.sections.opportunity),
          proposedSolution: stripSection(raw.sections.proposedSolution),
          resourceEstimate: stripSection(raw.sections.resourceEstimate),
          notes: stripSection(raw.sections.notes),
        },
        successCriteria: raw.successCriteria.map(stripItem),
        inScope: raw.inScope.map(stripItem),
        outOfScope: raw.outOfScope.map(stripItem),
        risks: raw.risks.map(r => ({ ...r, flags: r.flags.map(sf) })),
        openQuestions: raw.openQuestions.map(stripItem),
      };
      setEnhanceResult(result);
      setShowPasteModal(false);
      setEnhanceError(null);
    } catch {
      setEnhanceError('Could not parse AI response. Make sure you pasted the full JSON output.');
      setShowPasteModal(false);
    }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      await handleSave();
      const result = await enhanceProposal(form);
      setEnhanceResult(result);
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setIsEnhancing(false);
    }
  };

  const applyEnhancements = (accepted: ProposalAcceptedChanges) => {
    const patch: Partial<ProposalForm> = {};

    if (accepted.sections.problemStatement !== undefined)
      patch.problemStatement = accepted.sections.problemStatement;
    if (accepted.sections.opportunity !== undefined)
      patch.opportunity = accepted.sections.opportunity;
    if (accepted.sections.proposedSolution !== undefined)
      patch.proposedSolution = accepted.sections.proposedSolution;
    if (accepted.sections.resourceEstimate !== undefined)
      patch.resourceEstimate = accepted.sections.resourceEstimate;
    if (accepted.sections.notes !== undefined) patch.notes = accepted.sections.notes;

    if (Object.keys(accepted.successCriteria).length > 0) {
      patch.successCriteria = form.successCriteria.map(c => {
        const improved = accepted.successCriteria[c.id];
        return improved !== undefined ? { ...c, description: improved } : c;
      });
    }
    if (Object.keys(accepted.inScope).length > 0) {
      patch.inScope = form.inScope.map(s => {
        const improved = accepted.inScope[s.id];
        return improved !== undefined ? { ...s, description: improved } : s;
      });
    }
    if (Object.keys(accepted.outOfScope).length > 0) {
      patch.outOfScope = form.outOfScope.map(s => {
        const improved = accepted.outOfScope[s.id];
        return improved !== undefined ? { ...s, description: improved } : s;
      });
    }
    if (Object.keys(accepted.risks).length > 0) {
      patch.risks = form.risks.map(r => {
        const improved = accepted.risks[r.id];
        if (!improved) return r;
        return { ...r, risk: improved.risk, mitigation: improved.mitigation };
      });
    }
    if (Object.keys(accepted.openQuestions).length > 0) {
      patch.openQuestions = form.openQuestions.map(q => {
        const improved = accepted.openQuestions[q.id];
        return improved !== undefined ? { ...q, question: improved } : q;
      });
    }

    update(patch);
    setEnhanceResult(null);
  };

  // Success criteria
  const addCriterion = (focusNew = false) => {
    update({
      successCriteria: [...form.successCriteria, { id: uuidv4(), description: '' }],
    });
    if (focusNew) focusLastTextarea(criteriaSectionRef);
  };
  const updateCriterion = (id: string, patch: Partial<ProposalSuccessCriterion>) =>
    update({
      successCriteria: form.successCriteria.map(c => (c.id === id ? { ...c, ...patch } : c)),
    });
  const removeCriterion = (id: string) =>
    update({ successCriteria: form.successCriteria.filter(c => c.id !== id) });

  // In scope
  const addInScope = (focusNew = false) => {
    update({ inScope: [...form.inScope, { id: uuidv4(), description: '' }] });
    if (focusNew) focusLastTextarea(inScopeSectionRef);
  };
  const updateInScope = (id: string, patch: Partial<ProposalScopeItem>) =>
    update({ inScope: form.inScope.map(s => (s.id === id ? { ...s, ...patch } : s)) });
  const removeInScope = (id: string) => update({ inScope: form.inScope.filter(s => s.id !== id) });

  // Out of scope
  const addOutOfScope = (focusNew = false) => {
    update({ outOfScope: [...form.outOfScope, { id: uuidv4(), description: '' }] });
    if (focusNew) focusLastTextarea(outOfScopeSectionRef);
  };
  const updateOutOfScope = (id: string, patch: Partial<ProposalScopeItem>) =>
    update({ outOfScope: form.outOfScope.map(s => (s.id === id ? { ...s, ...patch } : s)) });
  const removeOutOfScope = (id: string) =>
    update({ outOfScope: form.outOfScope.filter(s => s.id !== id) });

  // Risks
  const addRisk = (focusNew = false) => {
    update({ risks: [...form.risks, { id: uuidv4(), risk: '', mitigation: '' }] });
    if (focusNew) focusLastTextarea(risksSectionRef);
  };
  const updateRisk = (id: string, patch: Partial<ProposalRisk>) =>
    update({ risks: form.risks.map(r => (r.id === id ? { ...r, ...patch } : r)) });
  const removeRisk = (id: string) => update({ risks: form.risks.filter(r => r.id !== id) });

  // Open questions
  const addQuestion = (focusNew = false) => {
    update({
      openQuestions: [...form.openQuestions, { id: uuidv4(), question: '' }],
    });
    if (focusNew) focusLastTextarea(questionsSectionRef);
  };
  const updateQuestion = (id: string, patch: Partial<ProposalOpenQuestion>) =>
    update({
      openQuestions: form.openQuestions.map(q => (q.id === id ? { ...q, ...patch } : q)),
    });
  const removeQuestion = (id: string) =>
    update({ openQuestions: form.openQuestions.filter(q => q.id !== id) });

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{loadError}</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm">
            &larr; Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
          >
            &larr; Home
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Proposal</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div>
          <input
            type="text"
            value={form.title}
            onChange={e => update({ title: e.target.value })}
            placeholder="Proposal title…"
            className="w-full text-2xl font-semibold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 print:placeholder-transparent"
          />
        </div>

        {/* Metadata */}
        <div className="border border-gray-200 rounded-lg p-4 print:hidden">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Author
              </label>
              <input
                type="text"
                value={form.meta.author}
                onChange={e => update({ meta: { ...form.meta, author: e.target.value } })}
                placeholder="Your name"
                className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Status
              </label>
              <select
                value={form.meta.status}
                onChange={e =>
                  update({
                    meta: {
                      ...form.meta,
                      status: e.target.value as ProposalMeta['status'],
                    },
                  })
                }
                className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1"
              >
                <option>Draft</option>
                <option>In Review</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Sponsor
              </label>
              <input
                type="text"
                value={form.meta.sponsor}
                onChange={e => update({ meta: { ...form.meta, sponsor: e.target.value } })}
                placeholder="Executive sponsor"
                className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Key Stakeholders
              </label>
              <input
                type="text"
                value={form.meta.stakeholders}
                onChange={e => update({ meta: { ...form.meta, stakeholders: e.target.value } })}
                placeholder="e.g. Alice (Eng), Bob (Design), Carol (Sales)"
                className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Metadata — print only */}
        {(() => {
          const fmt = (iso: string) =>
            new Date(iso).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
          const pairs: [string, string, string, string][] = (
            [
              ['Author', form.meta.author, 'Status', form.meta.status],
              [
                'Created',
                createdAt ? fmt(createdAt) : '',
                'Last Updated',
                modifiedAt ? fmt(modifiedAt) : '',
              ],
              ['Sponsor', form.meta.sponsor, '', ''],
            ] as [string, string, string, string][]
          ).filter(([, lv, , rv]) => lv || rv);

          const singles: [string, string][] = (
            [['Key Stakeholders', form.meta.stakeholders]] as [string, string][]
          ).filter(([, v]) => v);

          if (pairs.length === 0 && singles.length === 0) return null;

          return (
            <table className="hidden print:table w-full text-sm border-collapse mb-6">
              <tbody>
                {pairs.map(([ll, lv, rl, rv]) => (
                  <tr key={ll} className="border border-gray-300">
                    <td className="border border-gray-300 px-3 py-1 font-semibold text-gray-600 whitespace-nowrap w-32">
                      {ll}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-gray-800 w-[28%]">{lv}</td>
                    <td className="border border-gray-300 px-3 py-1 font-semibold text-gray-600 whitespace-nowrap w-32">
                      {rl}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-gray-800">{rv}</td>
                  </tr>
                ))}
                {singles.map(([label, value]) => (
                  <tr key={label} className="border border-gray-300">
                    <td className="border border-gray-300 px-3 py-1 font-semibold text-gray-600 whitespace-nowrap">
                      {label}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-gray-800" colSpan={3}>
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}

        {/* Quick Tips */}
        <div className="print:hidden">
          <button
            onClick={() => setTipsOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className={`transition-transform ${tipsOpen ? 'rotate-90' : ''}`}>&rsaquo;</span>
            Quick Tips
          </button>
          {tipsOpen && (
            <ul className="mt-2 space-y-1.5 pl-5 border-l-2 border-gray-100">
              {TIPS.map((tip, i) => (
                <li key={i} className="text-sm text-gray-500">
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Export bar */}
        <div className="space-y-2 print:hidden">
          <p className={`text-sm ${statusColor}`}>{statusText}</p>
          <div className="flex flex-wrap gap-2 items-center">
            <AIEnhanceDropdown
              isEnhancing={isEnhancing}
              onEnhance={handleEnhance}
              onCopyPrompt={handleCopyPrompt}
              onPasteResponse={() => setShowPasteModal(true)}
            />
            <button
              onClick={handleCopyMarkdown}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
            >
              {copied ? '✓ Copied' : 'Copy Markdown'}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
            >
              Print to PDF
            </button>
            <button
              onClick={handleDocx}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors border border-gray-300"
            >
              Download .docx
            </button>
          </div>
          <p className="text-xs text-gray-400">
            For a clean PDF, uncheck <strong>Headers and Footers</strong> in the browser print
            dialog.
          </p>
          {promptCopied && (
            <p className="text-sm text-green-600">
              {'✓'} Prompt copied — paste into your AI tool, then use &quot;Paste AI response&quot;
              to import the result.
            </p>
          )}
          {enhanceError && <p className="text-sm text-red-500">{enhanceError}</p>}
        </div>

        {/* Problem Statement */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Problem Statement
          </h2>
          <textarea
            value={form.problemStatement}
            onChange={e => update({ problemStatement: e.target.value })}
            placeholder={`Who is affected?\nWhat is the problem they face?\nWhat is the cost of not solving it?`}
            rows={5}
            className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
          />
        </section>

        {/* Opportunity */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Opportunity
          </h2>
          <textarea
            value={form.opportunity}
            onChange={e => update({ opportunity: e.target.value })}
            placeholder="Why now? What market or business opportunity does this address?"
            rows={4}
            className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
          />
        </section>

        {/* Proposed Solution */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Proposed Solution
          </h2>
          <textarea
            value={form.proposedSolution}
            onChange={e => update({ proposedSolution: e.target.value })}
            placeholder="High-level description of the proposed approach. Focus on what, not how."
            rows={5}
            className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
          />
        </section>

        {/* Success Criteria */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Success Criteria
          </h2>
          <div className="space-y-2" ref={criteriaSectionRef}>
            {form.successCriteria.map(c => (
              <SectionRow key={c.id} onRemove={() => removeCriterion(c.id)}>
                <textarea
                  rows={1}
                  value={c.description}
                  onChange={e => updateCriterion(c.id, { description: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addCriterion(true);
                    }
                  }}
                  placeholder="How will we measure success?"
                  className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none field-sizing-content"
                />
              </SectionRow>
            ))}
          </div>
          <button
            onClick={() => addCriterion(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add criterion
          </button>
        </section>

        {/* In Scope */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            In Scope
          </h2>
          <div className="space-y-2" ref={inScopeSectionRef}>
            {form.inScope.map(s => (
              <SectionRow key={s.id} onRemove={() => removeInScope(s.id)}>
                <textarea
                  rows={1}
                  value={s.description}
                  onChange={e => updateInScope(s.id, { description: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addInScope(true);
                    }
                  }}
                  placeholder="What is included in this proposal?"
                  className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none field-sizing-content"
                />
              </SectionRow>
            ))}
          </div>
          <button
            onClick={() => addInScope(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add in-scope item
          </button>
        </section>

        {/* Out of Scope */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Out of Scope
          </h2>
          <div className="space-y-2" ref={outOfScopeSectionRef}>
            {form.outOfScope.map(s => (
              <SectionRow key={s.id} onRemove={() => removeOutOfScope(s.id)}>
                <textarea
                  rows={1}
                  value={s.description}
                  onChange={e => updateOutOfScope(s.id, { description: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addOutOfScope(true);
                    }
                  }}
                  placeholder="What is explicitly NOT included?"
                  className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none field-sizing-content"
                />
              </SectionRow>
            ))}
          </div>
          <button
            onClick={() => addOutOfScope(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add out-of-scope item
          </button>
        </section>

        {/* Risks & Mitigations */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Risks &amp; Mitigations
          </h2>
          <div className="space-y-3" ref={risksSectionRef}>
            {form.risks.map(r => (
              <div
                key={r.id}
                className="group bg-white border border-gray-200 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Risk
                      </label>
                      <textarea
                        rows={1}
                        value={r.risk}
                        onChange={e => updateRisk(r.id, { risk: e.target.value })}
                        placeholder="What could go wrong?"
                        className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none field-sizing-content"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Mitigation
                      </label>
                      <textarea
                        rows={1}
                        value={r.mitigation}
                        onChange={e => updateRisk(r.id, { mitigation: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addRisk(true);
                          }
                        }}
                        placeholder="How will we address or reduce this risk?"
                        className="mt-0.5 w-full text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none field-sizing-content"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeRisk(r.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-4 print:hidden"
                    aria-label="Remove risk"
                  >
                    &#10005;
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => addRisk(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add risk
          </button>
        </section>

        {/* Resource Estimate */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Resource Estimate
          </h2>
          <textarea
            value={form.resourceEstimate}
            onChange={e => update({ resourceEstimate: e.target.value })}
            placeholder="Rough estimate of team, time, and cost. e.g. 2 engineers + 1 designer, 6 weeks."
            rows={3}
            className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
          />
        </section>

        {/* Open Questions */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Open Questions
          </h2>
          <div className="space-y-2" ref={questionsSectionRef}>
            {form.openQuestions.map(q => (
              <SectionRow key={q.id} onRemove={() => removeQuestion(q.id)}>
                <textarea
                  rows={1}
                  value={q.question}
                  onChange={e => updateQuestion(q.id, { question: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addQuestion(true);
                    }
                  }}
                  placeholder="What needs to be resolved before this can move forward?"
                  className="flex-1 text-sm text-gray-800 bg-transparent border-b border-gray-200 outline-none focus:border-blue-400 py-1 placeholder-gray-300 resize-none field-sizing-content"
                />
              </SectionRow>
            ))}
          </div>
          <button
            onClick={() => addQuestion(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            + Add question
          </button>
        </section>

        {/* Notes */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Notes
          </h2>
          <textarea
            value={form.notes}
            onChange={e => update({ notes: e.target.value })}
            placeholder="Additional context, research, competitive analysis, or supporting data."
            rows={4}
            className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-400 resize-none placeholder-gray-300"
          />
        </section>
      </main>

      {showPasteModal && (
        <PasteAIResponseModal
          onSubmit={handlePasteResponse}
          onClose={() => setShowPasteModal(false)}
        />
      )}

      {enhanceResult && (
        <ProposalEnhanceModal
          result={enhanceResult}
          form={form}
          onApply={applyEnhancements}
          onClose={() => setEnhanceResult(null)}
        />
      )}
    </div>
  );
};

export default Proposal;
