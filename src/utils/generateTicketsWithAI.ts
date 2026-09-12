import type { PRDForm, PRDTicketGenerationResult } from '../types';

const SYSTEM_PROMPT = `You are a PM assistant that breaks PRD requirements into actionable Jira tickets. Given a PRD's requirements (with optional subtasks), generate well-scoped tickets ready for engineering.

RULES:
- Each ticket should be a single deliverable that one engineer can complete in a sprint
- Group related subtasks into a single ticket when they form a coherent unit of work
- Do not create a 1:1 mapping of requirements to tickets — use judgment to split large requirements or merge small ones
- Title: short, imperative verb phrase (e.g. "Add user settings page", "Implement CSV export")
- Description: 2-3 sentences explaining what to build and why, referencing the PRD context
- Acceptance Criteria: bullet points, each testable and specific. Use "Given/When/Then" or simple "Should" statements
- sourceRequirementIds: array of requirement IDs this ticket was derived from (use the bracketed IDs from the input)
- Include ALL requirements — every requirement should be covered by at least one ticket

Return ONLY valid JSON with no markdown formatting and no explanation, in this exact structure:
{
  "tickets": [
    {
      "title": "...",
      "description": "...",
      "acceptanceCriteria": "- Should ...\\n- Should ...\\n- Given ... When ... Then ...",
      "sourceRequirementIds": ["..."]
    }
  ]
}`;

function buildPrompt(form: PRDForm): string {
  const lines: string[] = [];

  if (form.overview) {
    lines.push('PRD OVERVIEW:');
    lines.push(form.overview);
    lines.push('');
  }

  if (form.problemStatement) {
    lines.push('PROBLEM STATEMENT:');
    lines.push(form.problemStatement);
    lines.push('');
  }

  lines.push('REQUIREMENTS:');
  if (form.requirements.length === 0) {
    lines.push('(none)');
  } else {
    for (const req of form.requirements) {
      lines.push(`[${req.id}] ${req.description}`);
      if (req.subtasks?.length) {
        for (const sub of req.subtasks) {
          lines.push(`  [${sub.id}] └ ${sub.description}`);
        }
      }
    }
  }

  return lines.join('\n');
}

function parseResponse(text: string): PRDTicketGenerationResult {
  try {
    return JSON.parse(text) as PRDTicketGenerationResult;
  } catch {
    // continue
  }

  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '');
  try {
    return JSON.parse(stripped) as PRDTicketGenerationResult;
  } catch {
    // continue
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as PRDTicketGenerationResult;
    } catch {
      // continue
    }
  }

  throw new Error('AI returned an unexpected response format. Please try again.');
}

export function buildFullTicketPrompt(form: PRDForm): string {
  return `INSTRUCTIONS:\n${SYSTEM_PROMPT}\n\n---\n\nDOCUMENT:\n${buildPrompt(form)}`;
}

export { parseResponse as parseTicketResponse };

export async function generateTickets(form: PRDForm): Promise<PRDTicketGenerationResult> {
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
    throw new Error((data as { error?: string }).error ?? 'Ticket generation failed');
  }

  const text = (data as { content: { type: string; text: string }[] }).content[0]?.text;

  if (!text) throw new Error('Empty response from AI');

  return parseResponse(text);
}
