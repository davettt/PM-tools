# PM Tools

A local-first PM productivity tool for writing structured code reviews and (future) PRDs.

## Features

- **Structured code review form** — Requirements Coverage, Gaps Identified, Recommendations, Out of Scope / Follow-up
- **Requirement status** — VERIFIED / INCOMPLETE / MISSING dropdown per requirement row
- **Recommendation status** — Click to cycle OPEN (☐) → DONE (✓) → WON'T FIX (✕)
- **Gap status** — Click to cycle OPEN (○) → RESOLVED (✓) → WON'T DO (✕); add an optional note on resolved gaps and an optional reason on won't-do gaps
- **Auto-save** — Debounced 1.5s auto-save after any input; immediate save before any export
- **Keyboard friendly** — Press Enter in any row to add the next item
- **Export options** — Copy Markdown, Print to PDF, Download .docx
- **AI writing enhancement** — "Enhance with AI" reviews each item for clarity, precision, and missing specificity; accept or skip per item
- **Filesystem persistence** — Reviews saved to `local_data/` via a lightweight Express backend
- **PWA-ready** — Favicon, web manifest, installable as a browser app

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Express 5 (mounted on Vite dev server in dev; standalone in production)
- **State**: Zustand
- **Persistence**: Filesystem JSON (`local_data/reviews.json`)
- **Export**: `docx` for Word/Google Docs, `window.print()` for PDF

## AI Features

The "Enhance with AI" button sends the current review to Claude Haiku for a writing pass — fixing typos, adding technical precision, and flagging items where critical information is missing.

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

Reviews are stored in `local_data/reviews.json` — gitignored, filesystem only. Back up this directory if you want to preserve saved reviews.

## Planned

- PRD tool (same structure, separate route and data file)
