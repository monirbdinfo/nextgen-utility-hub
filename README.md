# NextGen Utility Hub

An open-source, static-first utility platform in **Bangla and English**. Everything runs in
your browser: no backend, no analytics, no uploads.

Repository: <https://github.com/monirbdinfo/nextgen-utility-hub>

Website (GitHub Pages): <https://monirbdinfo.github.io/nextgen-utility-hub/>, deployed from
`main` by GitHub Actions (first successful deployment: 2 October 2026). Changes on other
branches appear there only after they are merged into `main`. See [Deployment](#deployment).

## Status: Milestone 5 in progress (Image Resizer, Image Cropper)

10 of 27 registry tools are **Available**; the other 17 are **Planned** (roadmap only, shown
with a badge and not linked). See [docs/PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md).

| Available now (run entirely in your browser)                                                  | Toolkit              |
| --------------------------------------------------------------------------------------------- | -------------------- |
| Age Calculator — age in years/months/days, next birthday                                      | General Utilities    |
| Date Difference — Y/M/D, total days, inclusive option                                         | General Utilities    |
| Loan EMI Calculator — installment, total repayment and interest (estimate)                    | General Utilities    |
| Bangla ⇄ English Digits — digits only, all other text preserved                               | Bangla Number & Text |
| Number to Words — Bangla and English, lakh/crore or million                                   | Bangla Number & Text |
| Taka in Words — Taka and poisha, cheque style, never rounds                                   | Bangla Number & Text |
| Date Text Formatter — numeric, Bangla/English text, date in words                             | Bangla Number & Text |
| Unicode Text Cleaner — spaces, blank lines, hidden characters, optional NFC/NFKC; Bangla-safe | Bangla Number & Text |
| Image Resizer — JPEG/PNG/WebP to exact pixels, aspect lock, presets; processed on-device      | Privacy-First Files  |
| Image Cropper — drag or type a crop, aspect presets, keyboard control; exact pixels as PNG    | Privacy-First Files  |

Platform features: responsive homepage, Bangla/English toggle (persisted, sets
`<html lang>`), light/dark theme, keyboard-accessible search, hash routing with deep links,
typed central registry. Calculation conventions, rounding rules and limitations are in
[docs/TOOLS.md](docs/TOOLS.md).

Not available yet: image compressor and converter, photo/signature presets, PDF
tools (`pdf-lib` not added), CV/cover letter templates, network tools, bandwidth calculator.

## Toolkits

1. General Utilities
2. Job Application Toolkit
3. Bangla Number & Text Toolkit
4. Privacy-First File Tools
5. Network & IT Diagnostic Toolkit

## Getting started

Requires Node.js 20+ (CI uses 22).

```bash
npm install
npm run dev          # dev server at http://localhost:5173
npm run build        # typecheck + production build into dist/
npm run preview      # serve the production build
```

## Quality checks

```bash
npm run format:check # Prettier
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests (jsdom), incl. WCAG contrast checks on tokens
npm run test:e2e     # Playwright smoke tests in Chromium against the production build
```

Playwright needs a Chromium build. On a fresh machine run `npx playwright install chromium`
once. CI (`.github/workflows/ci.yml`) runs all checks on pushes to `main` and on pull requests.

## Deployment

The site is a static build published to GitHub Pages by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

- **URL:** <https://monirbdinfo.github.io/nextgen-utility-hub/>. The first deployment
  (workflow run #1, 2 October 2026) succeeded; each later push to `main` redeploys.
- **When it runs:** on every push to `main`, or manually via _Actions → Deploy to GitHub Pages →
  Run workflow_. Both jobs are guarded with `if: github.ref == 'refs/heads/main'`, so a manual
  run started from any other branch is skipped and deploys nothing.
- **Gate:** the build job runs `format:check`, `lint`, `typecheck`, unit tests, the production
  build and the Playwright E2E tests. If any step fails, the deploy job does not run and the
  live site is left unchanged.
- **Output:** `dist/` is uploaded with `actions/upload-pages-artifact` and published with
  `actions/deploy-pages`. Source maps are published deliberately (open-source project).
- **Security:** official GitHub actions only, each pinned to a full commit SHA with its version
  noted in a comment. The workflow has no permissions by default; the build job gets
  `contents: read` and `pages: read`, and only the deploy job gets `pages: write` and
  `id-token: write`. No secrets are used. A deployment that is already running is never cancelled;
  a newer run waits for it (GitHub keeps only the latest waiting run).
- **Base path:** `vite.config.ts` uses `base: './'`, so asset URLs are relative and work under
  the `/nextgen-utility-hub/` sub-path. Routing is hash-based (`#/category/<id>`), so no
  `404.html` fallback is needed for deep links.

### One-time repository settings (manual)

1. **Settings → Pages → Build and deployment → Source:** select **GitHub Actions**. While Pages
   is not enabled, the `configure-pages` step fails and nothing is deployed. If Pages is already
   enabled with "Deploy from a branch", switch it to **GitHub Actions** so this workflow is the
   site's source.
2. **Settings → Actions → General:** allow GitHub-owned actions (the default for public
   repositories).
3. **Settings → Environments → `github-pages`** (created by the first run): keep the deployment
   branch rule limited to `main`, so GitHub also enforces "deploy from `main` only".

## Routing

Hash-based, so it works on static hosting without server rewrites:

| URL               | View                               |
| ----------------- | ---------------------------------- |
| `#/`              | Home with all toolkits             |
| `#/category/<id>` | One toolkit and its tools          |
| `#/tool/<id>`     | A tool page (available tools only) |
| anything else     | Falls back to home                 |

Category ids: `general`, `jobs`, `bangla`, `files`, `network`. A `#/tool/<id>` URL for a
planned or unknown tool falls back to home. Plain fragments such as
`#about` are treated as in-page anchors, not routes.

## Accessibility

- Skip link, landmarks, logical heading order, visible focus rings.
- Search is an ARIA combobox: <kbd>/</kbd> focuses it, <kbd>↑</kbd>/<kbd>↓</kbd> move,
  <kbd>Enter</kbd> opens the tool’s toolkit, <kbd>Esc</kbd> clears. Result counts are announced.
- Mobile menu is a disclosure button; <kbd>Esc</kbd> or an outside click closes it and focus
  returns to the toggle.
- Focus moves to the new view’s heading after navigation.
- Colour tokens are checked for WCAG AA contrast in both themes (`tests/contrast.test.ts`).
- Respects `prefers-reduced-motion`.

## Project layout

```
src/
  calc/       Pure calculation modules (dates, EMI, digits, words, text cleaning, image sizes)
  registry/   Typed categories, tools, lookup and search
  router/     Hash route parsing
  i18n/       English/Bangla messages and helpers
  ui/         App shell, header, search combobox, toolkits view, tool page, icons
  ui/tools/   One view per available tool + shared form/result kit
  lib/        DOM, storage and canvas image helpers
  styles/     Design tokens (navy + teal), base and component CSS
tests/        Vitest unit tests (tests/calc/ for calculations)
e2e/          Playwright tests (desktop, mobile, GitHub Pages sub-path)
docs/         Roadmap, tool conventions, licensing
```

## Adding a tool

1. Add an entry to `src/registry/tools.ts` with English and Bangla text, English and Bangla
   search keywords and `status: 'planned'`.
2. Put the calculation in `src/calc/` as pure functions with unit tests.
3. Add a view in `src/ui/tools/` (use `kit.ts`) and register it in `src/ui/tools/index.ts`.
4. Only then set `status: 'available'` and `route: '#/tool/<id>'`. Tests fail if an
   available tool lacks a route or view, or if a planned tool has one.

## Privacy, security and limitations

- Static site: no server, accounts, cookies, analytics or external requests. Language and
  theme preferences are kept in `localStorage` only.
- File tools process files locally. The Image Resizer and Image Cropper decode, resize and
  crop images inside the browser tab; images are never uploaded, stored or logged (see
  [docs/TOOLS.md](docs/TOOLS.md#image-resizer)).
- Browsers cannot open raw sockets, send ICMP pings or scan ports. Network tools will be
  limited to what the browser safely allows, and the project will not include unauthorised
  scanning or other unsafe diagnostic features.
- Fonts come from the user’s system. Bangla text needs a Bengali-capable system font
  (present by default on current Windows, macOS, Android, iOS and most Linux desktops).

## Licence

MIT. See [LICENSE](LICENSE) and [docs/LICENSES.md](docs/LICENSES.md).
