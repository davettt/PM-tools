import type { ProposalForm } from '../types';

export function generateProposalMarkdown(
  form: ProposalForm,
  createdAt?: string,
  modifiedAt?: string
): string {
  const lines: string[] = [];
  const title = form.title || 'Untitled Proposal';
  const appendSupportingContent = (sectionId: string) => {
    for (const section of form.customSections.filter(item => item.parentSectionId === sectionId)) {
      if (!section.title && !section.content) continue;
      lines.push('');
      lines.push(`### ${section.title || 'Untitled Subheading'}`);
      lines.push(section.content || '_Not completed._');
      for (const image of form.images.filter(item => item.sectionId === section.id)) {
        lines.push('');
        lines.push(`**Image:** ${image.caption || image.filename} — ${image.filename}`);
      }
    }
    for (const image of form.images.filter(item => item.sectionId === sectionId)) {
      lines.push('');
      lines.push(`**Image:** ${image.caption || image.filename} — ${image.filename}`);
    }
  };

  lines.push(`# Proposal [${title}]`);
  lines.push('');

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const metaRows: [string, string][] = [
    ['Author', form.meta?.author ?? ''],
    ['Status', form.meta?.status ?? ''],
    ['Created', createdAt ? fmt(createdAt) : ''],
    ['Last Updated', modifiedAt ? fmt(modifiedAt) : ''],
    ['Sponsor', form.meta?.sponsor ?? ''],
    ['Key Stakeholders', form.meta?.stakeholders ?? ''],
  ].filter(([, v]) => v) as [string, string][];

  if (metaRows.length > 0) {
    lines.push('| Field | Value |');
    lines.push('|-------|-------|');
    for (const [label, value] of metaRows) {
      lines.push(`| ${label} | ${value} |`);
    }
    lines.push('');
  }

  lines.push('## Problem Statement');
  lines.push(form.problemStatement || '_Not completed._');
  appendSupportingContent('problemStatement');
  lines.push('');

  lines.push('## Opportunity');
  lines.push(form.opportunity || '_Not completed._');
  appendSupportingContent('opportunity');
  lines.push('');

  lines.push('## Proposed Solution');
  lines.push(form.proposedSolution || '_Not completed._');
  appendSupportingContent('proposedSolution');
  lines.push('');

  lines.push('## Success Criteria');
  if (form.successCriteria.length === 0) {
    lines.push('_No success criteria added._');
  } else {
    for (const c of form.successCriteria) {
      lines.push(`- ${c.description}`);
    }
  }
  lines.push('');

  lines.push('## In Scope');
  if (form.inScope.length === 0) {
    lines.push('_No in-scope items added._');
  } else {
    for (const s of form.inScope) {
      lines.push(`- ${s.description}`);
    }
  }
  lines.push('');

  lines.push('## Out of Scope');
  if (form.outOfScope.length === 0) {
    lines.push('_No out-of-scope items added._');
  } else {
    for (const s of form.outOfScope) {
      lines.push(`- ${s.description}`);
    }
  }
  lines.push('');

  lines.push('## Risks & Mitigations');
  if (form.risks.length === 0) {
    lines.push('_No risks added._');
  } else {
    for (const r of form.risks) {
      lines.push(`- **Risk:** ${r.risk}`);
      lines.push(`  **Mitigation:** ${r.mitigation || '_Not specified._'}`);
    }
  }
  lines.push('');

  lines.push('## Resource Estimate');
  lines.push(form.resourceEstimate || '_Not completed._');
  appendSupportingContent('resourceEstimate');
  lines.push('');

  lines.push('## Open Questions');
  if (form.openQuestions.length === 0) {
    lines.push('_No open questions added._');
  } else {
    for (const q of form.openQuestions) {
      lines.push(`- ${q.question}`);
    }
  }
  lines.push('');

  lines.push('## Notes');
  lines.push(form.notes || '_No notes added._');
  appendSupportingContent('notes');

  return lines.join('\n');
}

export async function copyProposalMarkdownToClipboard(
  form: ProposalForm,
  createdAt?: string,
  modifiedAt?: string
): Promise<void> {
  const md = generateProposalMarkdown(form, createdAt, modifiedAt);
  await navigator.clipboard.writeText(md);
}
