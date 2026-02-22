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

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Express 5 (mounted on Vite dev server in dev; standalone in production)
- **State**: Zustand
- **Persistence**: Filesystem JSON (`local_data/reviews.json`, `local_data/prds.json`)
- **Export**: `docx` for Word/Google Docs, `window.print()` for PDF

## AI Features

Both PRDs and Code Reviews have an "Enhance with AI" button that sends the current document to Claude Haiku for a writing pass — fixing clarity, adding technical precision, and flagging items where critical information is missing.

**Setup:**

```bash
cp .env.example .env
# Add your Anthropic API key to .env
```

The key is read server-side only and never sent to the browser. The feature is optional — if no key is set, clicking "Enhance with AI" shows an inline error and the app continues working normally.

In **dev**, restart `npm run dev` after adding the key. In **production**, restart the pm2 process:

```bash
pm2 restart pm-tools
```

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

Documents are stored in `local_data/` — gitignored, filesystem only. Back up this directory if you want to preserve saved documents.

- `local_data/reviews.json` — Code Reviews
- `local_data/prds.json` — PRDs
