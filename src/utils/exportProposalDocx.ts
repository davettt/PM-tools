import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { ProposalForm } from '../types';

function heading1(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1 });
}

function heading2(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
}

function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({ text, bullet: { level } });
}

function body(text: string): Paragraph {
  return new Paragraph({ text, alignment: AlignmentType.LEFT });
}

function bold(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: label, bold: true }), new TextRun({ text: value })],
  });
}

function empty(): Paragraph {
  return new Paragraph({ text: '' });
}

export async function downloadProposalDocx(
  form: ProposalForm,
  createdAt?: string,
  modifiedAt?: string
): Promise<void> {
  const children: Paragraph[] = [];
  const title = form.title || 'Untitled Proposal';

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  children.push(heading1(`Proposal [${title}]`));
  children.push(empty());

  const metaRows: [string, string][] = [
    ['Author', form.meta?.author ?? ''],
    ['Status', form.meta?.status ?? ''],
    ['Created', createdAt ? fmt(createdAt) : ''],
    ['Last Updated', modifiedAt ? fmt(modifiedAt) : ''],
    ['Sponsor', form.meta?.sponsor ?? ''],
    ['Key Stakeholders', form.meta?.stakeholders ?? ''],
  ].filter(([, v]) => v) as [string, string][];

  for (const [label, value] of metaRows) {
    children.push(bold(`${label}: `, value));
  }
  if (metaRows.length > 0) children.push(empty());

  children.push(heading2('Problem Statement'));
  children.push(body(form.problemStatement || 'Not completed.'));
  children.push(empty());

  children.push(heading2('Opportunity'));
  children.push(body(form.opportunity || 'Not completed.'));
  children.push(empty());

  children.push(heading2('Proposed Solution'));
  children.push(body(form.proposedSolution || 'Not completed.'));
  children.push(empty());

  children.push(heading2('Success Criteria'));
  if (form.successCriteria.length === 0) {
    children.push(body('No success criteria added.'));
  } else {
    for (const c of form.successCriteria) {
      children.push(bullet(c.description));
    }
  }
  children.push(empty());

  children.push(heading2('In Scope'));
  if (form.inScope.length === 0) {
    children.push(body('No in-scope items added.'));
  } else {
    for (const s of form.inScope) {
      children.push(bullet(s.description));
    }
  }
  children.push(empty());

  children.push(heading2('Out of Scope'));
  if (form.outOfScope.length === 0) {
    children.push(body('No out-of-scope items added.'));
  } else {
    for (const s of form.outOfScope) {
      children.push(bullet(s.description));
    }
  }
  children.push(empty());

  children.push(heading2('Risks & Mitigations'));
  if (form.risks.length === 0) {
    children.push(body('No risks added.'));
  } else {
    for (const r of form.risks) {
      children.push(bold('Risk: ', r.risk));
      children.push(bold('Mitigation: ', r.mitigation || 'Not specified.'));
      children.push(empty());
    }
  }

  children.push(heading2('Resource Estimate'));
  children.push(body(form.resourceEstimate || 'Not completed.'));
  children.push(empty());

  children.push(heading2('Open Questions'));
  if (form.openQuestions.length === 0) {
    children.push(body('No open questions added.'));
  } else {
    for (const q of form.openQuestions) {
      children.push(bullet(q.question));
    }
  }
  children.push(empty());

  children.push(heading2('Notes'));
  children.push(body(form.notes || 'No notes added.'));

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proposal-${title.replace(/\s+/g, '-').toLowerCase()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
