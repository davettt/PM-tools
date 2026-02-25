# PM Tools

A local-first PM productivity tool for writing structured PRDs and code reviews.

## Features

### PRD Creator
- **Full structured form** — Overview, Problem Statement, Goals (objective + success metrics), How This Works (scenarios), Requirements, Out of Scope, Timeline, Open Questions, Notes
- **Document metadata** — Author, Status (Draft / In Review / Approved), Version, Product Area, Dev Lead, Design Lead, PMM, Target Launch, Key Stakeholders, Doc Link; Created and Last Updated populated automatically
- **Import requirements from Code Review** — pull requirements from any saved code review to seed a PRD
- **AI writing enhancement** — "Enhance with AI" reviews every section for clarity, completeness, and missing specificity; accept or skip per item
- **Export options** — Copy Markdown (with metadata table + timeline table), Print to PDF (compact print-only metadata table), Download .docx

### Code Review
- **Structured form** — Requirements Coverage, Gaps Identified, Recommendations, Out of Scope / Follow-up
- **Requirement status** — VERIFIED / INCOMPLETE / MISSING dropdown per row
- **Recommendation status** — click to cycle OPEN (☐) → DONE (✓) → WON'T FIX (✕)
- **Gap status** — click to cycle OPEN (○) → RESOLVED (✓) → WON'T DO (✕); optional note on resolved gaps, optional reason on won't-do gaps
- **Document metadata** — Author, Role, Related PRD, Related Issue
- **Import requirements from PRD** — pull requirements from any saved PRD; imported as INCOMPLETE
- **AI writing enhancement** — same per-item enhance flow as PRD
- **Export options** — Copy Markdown, Print to PDF, Download .docx

### Shared
- **Auto-save** — debounced 1.5s auto-save after any input; immediate save before any export
- **Keyboard friendly** — press Enter in any row to add the next item
- **Home dashboard** — lists all PRDs and Code Reviews sorted by last modified, with delete action
- **Filesystem persistence** — documents saved to `local_data/` via a lightweight Express backend
- **PWA-ready** — favicon, web manifest, installable as a browser app

## Privacy & Data Protection

PM Tools is designed to be safe for use with internal work documents:

- **All data is stored locally** — documents are saved to `local_data/` on your own machine. Nothing is synced to a cloud service, external database, or third-party storage
- **No telemetry or analytics** — the app collects no usage data and makes no background network calls
- **The server runs on localhost only** — the Express backend is a local process accessible only on your machine; it is not exposed to the internet or your network
- **Export functions are fully offline** — Copy Markdown, Print to PDF, and Download .docx work entirely on-device with no external calls

### AI feature and data handling

The AI enhancement feature has two modes with different data handling profiles:

| Mode | How it works | Data leaves your machine? |
|---|---|---|
| **Enhance with AI** (API key) | Sends document content to the Anthropic API | Yes — via your personal Anthropic API key |
| **Copy prompt / Paste response** | You copy the prompt, run it in your own approved tool, paste the result back | No — the app makes no outbound calls |

For use in organisations with data privacy policies or AI usage governance requirements, the Copy prompt / Paste response workflow allows you to route AI requests through whatever tool your organisation has approved — keeping document content within your approved environment while still getting the same AI enhancement output.

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Express 5 (mounted on Vite dev server in dev; standalone in production)
- **State**: Zustand
- **Persistence**: Filesystem JSON (`local_data/reviews.json`, `local_data/prds.json`)
- **Export**: `docx` for Word/Google Docs, `window.print()` for PDF

## AI Features

Both PRDs and Code Reviews have an **AI Enhance** dropdown that groups three options:

| Option | Description |
|---|---|
| **Enhance with AI** | Sends the document to Claude Haiku via your API key for a PM writing pass |
| **Copy prompt** | Copies the full system + document prompt to clipboard to paste into any AI tool |
| **Paste AI response** | Opens a modal to paste the JSON output back in; same accept/reject UI as the internal flow |

### Using your own API key

```bash
cp .env.example .env
# Add your Anthropic API key to .env
```

The key is read server-side only and never sent to the browser. If no key is set, "Enhance with AI" shows an inline error — the other two options are unaffected.

In **dev**, restart `npm run dev` after adding the key. In **production**:

```bash
pm2 restart pm-tools
```

### External AI workflow (corporate compliance)

Many organisations restrict the use of personal API keys for work documents due to data privacy policies, AI usage governance, or requirements to route AI requests through approved tools with audit logging and data processing agreements. The external workflow supports this — the app itself makes no outbound AI calls, so work documents stay within whatever AI tool your organisation has approved.

For users who need to use a company-approved AI tool instead of a personal API key:

1. Click **AI Enhance ▾ → Copy prompt** — the full instructions and document are copied to clipboard
2. Paste into your approved AI tool (Claude, ChatGPT, or any tool that accepts a text prompt)
3. The AI returns a JSON response — copy it
4. Click **AI Enhance ▾ → Paste AI response** — paste the JSON and click Apply
5. The standard accept/reject UI opens, identical to the internal flow

This workflow is fully local — the app itself makes no outbound AI calls when using Copy prompt + Paste AI response.

## Development

```bash
npm install
npm run dev       # Vite dev server with API mounted at same origin
```

App runs at `http://localhost:5173`. No separate server needed in dev.

## Production

```bash
npm run build     # Build frontend to dist/
npm start         # Express serves dist/ + /api on PORT (default 3004)
```

### pm2

PM Tools is registered in the shared `ecosystem.config.js` at the CLAUDE project root:

```bash
# From the CLAUDE directory
npm run build --prefix pm-tools   # build first
pm2 start ecosystem.config.js --only pm-tools
```

Runs on **port 3004**.

## Quality

```bash
npm run quality   # format check + lint + type-check + security audit
npm run lint
npm run type-check
```

## Data

Documents are stored in `local_data/` — gitignored, filesystem only.

- `local_data/reviews.json` — Code Reviews
- `local_data/prds.json` — PRDs

### Backup

Use the **Export Reviews** and **Export PRDs** buttons on the Home page to download a dated JSON backup (e.g. `pm-tools-reviews-2026-02-25.json`). The exported file is structurally identical to the `local_data/` files.

**Best practice:** export a backup before any significant session, before deleting documents, and whenever you want a checkpoint.

### Restore from backup

1. Stop the app to prevent an auto-save from overwriting during restore:
   ```bash
   pm2 stop pm-tools
   ```
2. Navigate to `local_data/`
3. Rename or delete the existing file (e.g. rename `prds.json` to `prds.json.bak` as a precaution)
4. Copy your backup file into `local_data/` and rename it to `prds.json` or `reviews.json`
5. Restart:
   ```bash
   pm2 start pm-tools
   ```
6. Refresh the app — your documents will be restored

## License

MIT License with Commons Clause — free to use, fork, and modify for personal use. Commercial use requires written permission. See [LICENSE](LICENSE) for details.

## Personal Project Notice

This is a personal project maintained for my own use. You're welcome to:

- Fork and customize for your own needs
- Report bugs via [GitHub Issues](https://github.com/davettt/PM-tools/issues)
- Reference the code for learning

I'm not actively reviewing pull requests or feature requests, as this keeps the project focused on my personal workflow.
