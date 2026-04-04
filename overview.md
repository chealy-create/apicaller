# API Explorer Web App - Overview

## What This Is

Converting Shumon's desktop Python app (API Explorer v1.1.2) into a web-accessible internal tool. The desktop app lets SAC analysts browse and call APIs, view results as JSON or tables, compare results side-by-side, and download output.

Chris wants it web-accessible and extendable over time.

## Decisions Made

- **Users:** Internal only (2-5 SAC analysts)
- **Stack:** Next.js (TypeScript + React) deployed on Vercel
- **UI approach:** Functional, clean, minimal — usability over polish
- **Deadline:** End of week of March 30 (April 3, 2026)
- **Approach:** Port the Python logic to TypeScript. The API-calling logic is likely thin (construct URL, add headers, make request, return JSON) so the rewrite should be straightforward.

## Architecture

Single Next.js app, one codebase. API routes proxy requests to the external APIs (so credentials stay server-side). API platform configs (endpoints, parameters, auth) extracted into a declarative config file — adding a new API platform = adding a config entry, no code changes.

```
apicaller/
├── app/
│   ├── page.tsx              # Main page (single-page app)
│   └── api/
│       └── fetch-data/       # Proxies requests to external APIs
├── components/               # UI components
├── lib/                      # API platform configs, helpers
└── public/
```

Structure will adapt based on what the source code actually looks like.

## Feature Mapping (Desktop to Web)

| Desktop Feature | Web Equivalent |
|---|---|
| API platform selector (dropdown) | Dropdown or sidebar — select platform, form updates with its params |
| Parameter input (select or type) | Dynamic form fields — dropdowns for known values, text for freeform |
| Fetch Data button | Submit button, hits /api/fetch-data which proxies to the real API |
| JSON text view | Code block with syntax highlighting |
| Excel/table view | HTML table with sortable columns |
| Tabbed results | Tab bar — each fetch creates a new tab |
| Split-screen compare | Side-by-side panel layout, pick two tabs to compare |
| Download output | Download button — JSON or CSV/Excel export |

**Layout:** One page with three zones — left panel (platform + params), main area (results in tabs), and a split-screen toggle.

## Known Bugs to Fix

1. **Colon encoding:** The `:` character in QM API calls gets encoded/mangled. Only affects some APIs. Shumon's V1.1.2 was a fix attempt.
2. **Antivirus blocking:** Desktop-only issue (unsigned Python app), won't apply to web version.

## Still Needed

- **Source code** from Google Drive (the V1.1.2 folder with Shumon's LLM-oriented txt file)
- Understanding of: what APIs it talks to, auth/credentials, parameter formats, full list of API platforms
- Once source is available, we can scaffold and build

## Why Vercel / Next.js

- Simplest deployment story (push to main = deployed)
- Single codebase (no separate backend)
- Free tier easily covers internal tool usage
- React makes tabs, split-screen, and table views straightforward
- TypeScript keeps it maintainable
- Only risk: Vercel serverless timeout (10s free, 60s pro) if API calls are slow
