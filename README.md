PG Rose – Perfect Launch Window

Quick start
- Open index.html via a local server (for catalog fetch and CORS): e.g. `npx serve` in the project root, then browse to the URL.

Key features
- Model toggle: UK Met Seamless (default) ↔ Open‑Meteo (Ctrl+Shift+M or ⌘+Shift+M). Toast + info panel update.
- Save PDF / Print: renders the wind rose + legend as an A4 landscape PDF. Print opens the PDF and triggers the print dialog.
- Live wind overlays, per‑site arrows, center average arrow.
- Drag to reorder segments; expand‑isolated, long‑names‑out, long‑segments‑inner toggles.
- Catalog search with Fuse.js; map selection, radius and polygon filters.

Refactor overview
- app.js is now an orchestrator; functional modules live under core/ and ui/.
  - core: config, svg‑utils, layout, time, units, wx‑api, colors, state, catalog
  - ui: rose, tooltips, compass, legend, catalog, carousel, map, units, export, model, hotkeys
  - dev: selftest

Developer tips
- Debug panel: press Ctrl+Shift+D (or ⌘+Shift+D) or open with `?debug=1` to run self‑tests.
- Default units are KPH; unit switch is three‑state (KPH/MPH/KTS) and persists.
- Default model is `ukmo_seamless`. The info panel shows the current endpoint template and model parameter.


