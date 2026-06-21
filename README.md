# TERMINAL — Phase 1 (Data model + two-clock engine)

`TERMINAL v0.2 · P1 [Claude]` — the headless core: canonical state, the two clocks, market-hours, save/migration, and offline plumbing. **No UI, no price sim, no trading** (those are later phases). The visual prototype is bundled (`prototype.html`) for the look.

## What's here
```
index.html                  hosted landing — build status + links (runs the gate live)
prototype.html              the Phase 0 visual prototype (throwaway look demo)
package.json                ESM marker + `npm test`
src/
  config/   zones · assets(9) · ranks · constants
  engine/   realClock · simClock · marketHours · offlineResolver
  state/    storage · schema(validators) · state(selectors) · save(+migration)
  main.js   wires it all (window.Terminal in a browser)
dev/
  diagnostics.js            the §8 QA gate (42 checks)
  harness.html              browser gate viewer (ES modules — needs serving)
  harness-standalone.html   SAME gate, single-file, runs from file:// (generated)
  build-standalone.mjs      regenerates the standalone file from /src
```

## Run it locally
**Quick look (no server):** double-click `dev/harness-standalone.html` — it runs the full gate from `file://` and prints ALL PASS.

**Full project (served):** ES modules need http(s), so serve the folder:
```bash
npx serve .         # or: python3 -m http.server 8000
```
then open `index.html` (status page) or `dev/harness.html`.

**The QA gate (headless):**
```bash
npm test            # node dev/diagnostics.js  →  ALL PASS (42/42)
```

## Put it on a global URL
It's a static folder with no backend, so any static host works. Two easy paths:

**Instant (drag-and-drop):** zip this folder (or use the provided ZIP) and drop it on a drag-and-drop host — e.g. **Netlify Drop**, **Cloudflare Pages** (direct upload), or **static.so** — for an instant HTTPS URL. `index.html` is the landing.

**Auto-deploy (git push):** push this folder to a GitHub repo and connect **Cloudflare Pages** (free, unlimited bandwidth) or **GitHub Pages**. Build command: none. Output dir: project root. Every push redeploys.

No SPA config or build step needed. Once hosted, `index.html` shows the live green gate, with links to the prototype and full diagnostics.

> If you edit anything in `/src`, regenerate the standalone file: `node dev/build-standalone.mjs`.

## Scope
Built strictly to the Phase 1 brief. Out of scope by design: price simulation (P2), terminal UI (P3), trading (P4), dividend accrual + away→return summary (P5), progression effects (P7), juice (P8).
