# World Cup 2026 — Interactive Bracket Builder

A single-page app to fill out the **2026 FIFA World Cup** bracket. The 12 groups (A–L)
sit on the left and right; drag teams into the Round of 32 and click winners to advance
all the way to the Final.

**Live site:** https://jreyesv.github.io/world-cup/

## Features

- All 48 teams in the **official 2026 group draw** (verified vs Wikipedia & FIFA.com), with flags.
- **Official R32 seeding** — each slot has its real identity (`1A`, `2B`, `3rd …`). A team can
  only be dropped into slots its group is eligible for; eligible targets highlight in green.
- **Exact FIFA third-place rule** — drag the 8 qualifying third-placed teams into the tray and
  they are auto-seeded into the Round of 32 using FIFA's full 495-row Annex C allocation table.
- Winners **cascade** automatically through R16 → QF → SF → Final; changing an earlier pick
  re-resolves everything downstream. Progress is saved to `localStorage`.

## Tech

React + Vite + TypeScript, drag-and-drop via `@dnd-kit/core`. No backend.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and
publishes `dist/` to GitHub Pages.
