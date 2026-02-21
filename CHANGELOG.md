# Changelog

All notable changes to PM Tools will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
