import type { ProposalForm, ProposalEnhancementResult } from '../types';

const SYSTEM_PROMPT = `You are a PM writing coach. Review this proposal document and provide structured improvements. Your job is to raise the quality of each section to meet PM standards for a proposal. A proposal is a lightweight pitch document that captures the case for a project before committing to a full PRD.

SECTION STANDARDS:

PROBLEM STATEMENT
Must contain all three elements:
  1. Target user — who specifically has this problem?
  2. Pain/problem — what challenge are they facing?
  3. Business impact — what does this cost if left unsolved?
Missing any of these is a flag. Do not invent content if not provided — flag it.

OPPORTUNITY
Must explain why this project should happen now. Should reference market conditions, competitive landscape, customer demand, or business strategy.
  Weak:  "This would be a good feature to have"
  Strong: "Three enterprise customers have requested this in the last quarter, and our closest competitor shipped it in January. Without it, we risk losing renewals worth $2M ARR."
Flag: "No urgency or business case — needs market timing, competitive context, or customer evidence"

PROPOSED SOLUTION
Should describe the high-level approach without getting into implementation details. Focus on what the solution does, not how it is built.
  Weak:  "Build a React component with a Node.js backend"
  Strong: "A self-service dashboard that lets account managers configure pricing tiers without engineering involvement"
Flag: "Too implementation-focused — describe the user-facing solution, not the tech stack"

SUCCESS CRITERIA
Each criterion must be measurable. Vague descriptions are flagged.
  Weak:  "Users should find it useful"
  Strong: "80% of target users complete the core workflow within 5 minutes in the first week"
Flag: "Not measurable — needs a number, a target, and a timeframe"

SCOPE (IN AND OUT)
Both sections should be specific. Empty out-of-scope is a strong flag.
  Flag: "Out of Scope is empty — explicitly listing what will NOT be included prevents scope creep"

RISKS & MITIGATIONS
Each risk should have a corresponding mitigation. A risk without a mitigation is flagged.
  Flag: "No mitigation specified — what will we do if this risk materialises?"

RESOURCE ESTIMATE
Should give a rough sense of team, time, and cost. Does not need to be precise but should be specific enough for decision-making.
  Weak:  "Some engineering time"
  Strong: "2 backend engineers + 1 designer, estimated 4-6 weeks"
Flag: "Too vague for stakeholders to make a resourcing decision"

OPEN QUESTIONS
Each question must be specific and actionable.
  Weak:  "Need to figure things out"
  Strong: "Does the legal team need to review the data handling approach before we proceed?"
Flag: "Too vague to act on — rephrase as a specific question that needs an answer"

NOTES
Improve grammar and clarity only. Do not flag notes as incomplete.

RULES:
- Never invent content the author did not provide — use [fill in] as placeholder where content is needed
- Fix grammar, typos, and phrasing throughout
- Use context from the rest of the proposal to make improvements specific
- Flags are indicators of what the PM needs to address — keep them short and actionable
- Include ALL items even if unchanged — use original text as "improved" value
- "flags" is [] when nothing needs attention for that item
- For risks, return "improvedRisk" and "improvedMitigation" fields instead of "improved"
- "missingSections" is only for sections that are completely empty or critically incomplete
- In "missingSections", never reference internal item IDs — describe issues in plain language

Return ONLY valid JSON with no markdown formatting and no explanation, in this exact structure:
{
  "sections": {
    "problemStatement": {"improved": "...", "flags": []},
    "opportunity": {"improved": "...", "flags": []},
    "proposedSolution": {"improved": "...", "flags": []},
    "resourceEstimate": {"improved": "...", "flags": []},
    "notes": {"improved": "...", "flags": []}
  },
  "successCriteria": [{"id":"...","improved":"...","flags":[]}],
  "inScope": [{"id":"...","improved":"...","flags":[]}],
  "outOfScope": [{"id":"...","improved":"...","flags":[]}],
  "risks": [{"id":"...","improvedRisk":"...","improvedMitigation":"...","flags":[]}],
  "openQuestions": [{"id":"...","improved":"...","flags":[]}],
  "missingSections": ["..."]
}`;

function buildPrompt(form: ProposalForm): string {
  const lines: string[] = [];
  lines.push(`Proposal Title: ${form.title || 'Untitled'}`);
  lines.push('');

  lines.push('PROBLEM STATEMENT:');
  lines.push(form.problemStatement || '(empty)');
  lines.push('');

  lines.push('OPPORTUNITY:');
  lines.push(form.opportunity || '(empty)');
  lines.push('');

  lines.push('PROPOSED SOLUTION:');
  lines.push(form.proposedSolution || '(empty)');
  lines.push('');

  lines.push('SUCCESS CRITERIA:');
  if (form.successCriteria.length === 0) {
    lines.push('(none)');
  } else {
    for (const c of form.successCriteria) {
      lines.push(`[${c.id}] ${c.description}`);
    }
  }
  lines.push('');

  lines.push('IN SCOPE:');
  if (form.inScope.length === 0) {
    lines.push('(empty)');
  } else {
    for (const s of form.inScope) {
      lines.push(`[${s.id}] ${s.description}`);
    }
  }
  lines.push('');

  lines.push('OUT OF SCOPE:');
  if (form.outOfScope.length === 0) {
    lines.push('(empty)');
  } else {
    for (const s of form.outOfScope) {
      lines.push(`[${s.id}] ${s.description}`);
    }
  }
  lines.push('');

  lines.push('RISKS & MITIGATIONS:');
  if (form.risks.length === 0) {
    lines.push('(none)');
  } else {
    for (const r of form.risks) {
      lines.push(`[${r.id}] Risk: ${r.risk}`);
      lines.push(`  Mitigation: ${r.mitigation || '(empty)'}`);
    }
  }
  lines.push('');

  lines.push('RESOURCE ESTIMATE:');
  lines.push(form.resourceEstimate || '(empty)');
  lines.push('');

  lines.push('OPEN QUESTIONS:');
  if (form.openQuestions.length === 0) {
    lines.push('(none)');
  } else {
    for (const q of form.openQuestions) {
      lines.push(`[${q.id}] ${q.question}`);
    }
  }
  lines.push('');

  lines.push('NOTES:');
  lines.push(form.notes || '(empty)');

  return lines.join('\n');
}

function parseResponse(text: string): ProposalEnhancementResult {
  try {
    return JSON.parse(text) as ProposalEnhancementResult;
  } catch {
    // continue
  }

  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '');
  try {
    return JSON.parse(stripped) as ProposalEnhancementResult;
  } catch {
    // continue
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as ProposalEnhancementResult;
    } catch {
      // continue
    }
  }

  throw new Error('AI returned an unexpected response format. Please try again.');
}

export function buildFullProposalPrompt(form: ProposalForm): string {
  return `INSTRUCTIONS:\n${SYSTEM_PROMPT}\n\n---\n\nDOCUMENT:\n${buildPrompt(form)}`;
}

export { parseResponse as parseProposalResponse };

export async function enhanceProposal(form: ProposalForm): Promise<ProposalEnhancementResult> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: SYSTEM_PROMPT,
      prompt: buildPrompt(form),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? 'AI enhancement failed');
  }

  const text = (data as { content: { type: string; text: string }[] }).content[0]?.text;

  if (!text) throw new Error('Empty response from AI');

  return parseResponse(text);
}
