# NextGen Utility Hub

An open-source, static-first utility platform in **Bangla and English**. Everything runs in
your browser: no backend, no analytics, no uploads.

Repository: <https://github.com/monirbdinfo/nextgen-utility-hub>

## Status: Milestone 1 (foundation)

| Working now                                                   | Placeholder / planned                      |
| ------------------------------------------------------------- | ------------------------------------------ |
| Responsive homepage (mobile, tablet, desktop)                 | Every individual tool (10 listed, 0 built) |
| Bangla/English toggle, persisted, sets `<html lang>`          | Tool pages and `#/tool/<id>` routes        |
| Light/dark theme toggle, persisted                            | PDF/image processing (`pdf-lib` not added) |
| Keyboard-accessible search over the tool registry             | GitHub Pages deployment                    |
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
