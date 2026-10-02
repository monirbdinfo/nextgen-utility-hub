# NextGen Utility Hub

An open-source, static-first utility platform in **Bangla and English**. Everything runs in
your browser: no backend, no analytics, no uploads.

Repository: <https://github.com/monirbdinfo/nextgen-utility-hub>

Website (GitHub Pages): <https://monirbdinfo.github.io/nextgen-utility-hub/>. **Not live yet**:
the site will only be available after the first successful run of the deployment workflow.
See [Deployment](#deployment).

## Status: Milestone 1 (foundation)

| Working now                                                   | Placeholder / planned                      |
| ------------------------------------------------------------- | ------------------------------------------ |
| Responsive homepage (mobile, tablet, desktop)                 | Every individual tool (10 listed, 0 built) |
| Bangla/English toggle, persisted, sets `<html lang>`          | Tool pages and `#/tool/<id>` routes        |
| Light/dark theme toggle, persisted                            | PDF/image processing (`pdf-lib` not added) |
| Keyboard-accessible search over the tool registry             | Live site (deploy workflow added, not run) |
| Hash routing with category views, deep links and back/forward |                                            |
| Typed central tool registry                                   |                                            |

Tools are shown with a **Planned** badge and are not links. A tool may only be marked
`available` once it is implemented and has a route; unit tests enforce this.

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

- **Expected URL:** <https://monirbdinfo.github.io/nextgen-utility-hub/>. It is **not live**
  until the first deployment succeeds.
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

| URL               | View                                |
| ----------------- | ----------------------------------- |
| `#/`              | Home with all toolkits              |
| `#/category/<id>` | One toolkit and its (planned) tools |
| anything else     | Falls back to home                  |

Category ids: `general`, `jobs`, `bangla`, `files`, `network`. Plain fragments such as
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
  registry/   Typed categories, tools, lookup and search
  router/     Hash route parsing
  i18n/       English/Bangla messages and helpers
  ui/         App shell, header, search combobox, toolkits view, icons
  lib/        DOM and storage helpers
  styles/     Design tokens (navy + teal), base and component CSS
tests/        Vitest unit tests
e2e/          Playwright smoke tests
docs/         Licensing documentation
```

## Adding a tool

Add an entry to `src/registry/tools.ts` with both `en` and `bn` text and
`status: 'planned'`. Change it to `available` (and add a `route`) only when the tool works.

## Privacy, security and limitations

- Static site: no server, accounts, cookies, analytics or external requests. Language and
  theme preferences are kept in `localStorage` only.
- Local file processing is a design goal for the file tools; it is not implemented yet.
- Browsers cannot open raw sockets, send ICMP pings or scan ports. Network tools will be
  limited to what the browser safely allows, and the project will not include unauthorised
  scanning or other unsafe diagnostic features.
- Fonts come from the user’s system. Bangla text needs a Bengali-capable system font
  (present by default on current Windows, macOS, Android, iOS and most Linux desktops).

## Licence

MIT. See [LICENSE](LICENSE) and [docs/LICENSES.md](docs/LICENSES.md).
