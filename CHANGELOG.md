# Changelog

All notable changes to PM Tools will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-02-22

### Added
- **PRD document metadata** — editable header block with Author, Status (Draft / In Review / Approved), Version, Product Area, Dev Lead, Design Lead, PMM, Target Launch, Key Stakeholders, and Doc Link; Created and Last Updated populated from save timestamps; renders as a compact 4-column paired table in PDF export and as a markdown table in Copy Markdown
- **Code Review document metadata** — Author, Role, Related PRD, and Related Issue fields; renders as a table in PDF export and as bold key-value lines in Markdown and .docx exports
- **Import requirements from PRD into Code Review** — "Import from PRD" button in the Requirements Coverage header opens a modal to select a saved PRD and choose which requirements to import; imported items default to INCOMPLETE status
- **Timeline table in PDF export** — Timeline section renders as a compact bordered table (Phase, Dates, What Ships, Dependencies) in print; Dependencies column only appears when at least one phase has content
- **Timeline table in Markdown export** — Copy Markdown now outputs the Timeline section as a markdown table matching the PDF layout

### Changed
- **Home page new-document buttons** — New PRD and New Code Review now use the same outlined style; no document type is visually elevated as primary (scales cleanly when more doc types are added)
- **PRD metadata in .docx export** — bold key-value pairs after the title for all non-empty metadata fields including Design Lead and PMM
- **Metadata tables** — both PRD and Code Review print-only metadata use bordered HTML tables for compact, readable layout

## [1.2.0] - 2026-02-21

### Added
- **Gap WONT_DO status** — gap toggle now cycles three states: OPEN (○) → RESOLVED (✓) → WON'T DO (✕), matching the existing three-state pattern on recommendations
- **Reason field for WONT_DO gaps** — optional italic field appears below the gap description to record why it won't be addressed
- **Note field for RESOLVED gaps** — optional italic field to record what was done to address the gap, keeping the gap description clean
- **Reason field for WONT_FIX recommendations** — same pattern as WONT_DO gaps

### Changed
- **Markdown export (gaps)** — gaps now use `[ ]` for open and `[x]` for resolved, consistent with recommendations; resolved note and won't-do reason appended inline
- **Docx export (gaps)** — gap status prefix (`[Resolved]`, `[Won't Do]`) includes reason/note where present

### Fixed
- **EnhanceModal empty state** — shows "No improvements found — this review looks good as-is." when AI finds no actionable changes
- **EnhanceModal accessibility** — added `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape key to close, auto-focus on open, and Tab focus trap

## [1.1.0] - 2026-02-21

### Added
- **AI writing enhancement** — "Enhance with AI" button in ExportBar sends the review to Claude Haiku for a PM writing pass
- **EnhanceModal** — per-item diff view with checkboxes; improved text shown prominently with original text as `was: "…"` for changed items; amber flag badges for items missing critical specificity; advisory "Missing Coverage" callout for cross-cutting gaps
- **Anthropic API proxy** — `POST /api/ai` server endpoint keeps API key server-side; returns 503 with actionable error if key is absent
- **`.env.example`** — documents required environment variable

## [1.0.0] - 2026-02-21

### Added
- **Code review form** — structured sections: Requirements Coverage, Gaps Identified, Recommendations, Out of Scope / Follow-up
- **Requirement status dropdown** — VERIFIED / INCOMPLETE / MISSING per row
- **Recommendation status cycling** — click icon to cycle OPEN (☐) → DONE (✓) → WON'T FIX (✕) with strikethrough styling
- **Gap resolution toggle** — mark gaps as resolved with green checkmark and strikethrough; supports iterative review passes
- **Auto-save** — debounced 1.5s auto-save after any input change; immediate save triggered before Copy Markdown, Print to PDF, and Download .docx
- **Enter key to add rows** — pressing Enter in any requirement, gap, or recommendation input adds a new row and focuses it
- **Export: Copy Markdown** — structured markdown with requirement statuses, strikethrough for resolved gaps, `[x]` / `*(Won't Fix)*` for recommendation statuses
- **Export: Print to PDF** — `window.print()` with print-optimised CSS; helper text guides user to uncheck browser headers/footers
- **Export: Download .docx** — Word-compatible document via `docx` library
- **Filesystem persistence** — reviews saved to `local_data/reviews.json` via Express 5 backend
- **Home dashboard** — lists all saved reviews sorted by last modified, with delete action
- **Favicon** — custom SVG checklist icon
- **PWA manifest** — installable as a browser app, blue theme colour
- **pm2 integration** — registered in shared `ecosystem.config.js` on port 3004; production server serves built frontend and API
