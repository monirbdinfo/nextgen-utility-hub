# Project roadmap

This roadmap follows the real implementation. A tool is only marked **Available** in
`src/registry/tools.ts` when its logic, view, route and tests exist; everything else is
**Planned**. Registry IDs are stable and are reused across milestones.

## Status overview

| Milestone | Scope                                                                  | Status                                        |
| --------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| 1         | Vite + TypeScript foundation, homepage, registry, i18n, CI             | Done (PR #1)                                  |
| 2         | GitHub Pages deployment workflow                                       | Done (PR #2), site deployed                   |
| 3         | Date/age, date difference, EMI, digits, number/Taka words, date text   | Done (PR #3, merged `9d0ed68`), site deployed |
| 4         | Unicode text cleaning and normalization                                | Done (PR #3, merged `9d0ed68`), site deployed |
| 5         | Image resize, crop, compression, conversion, photo/signature presets   | In progress: Image Resizer done (this branch) |
| 6         | PDF creation, merge, split, page tools, size reduction                 | Planned                                       |
| 7         | CV and cover-letter templates with print/PDF export                    | Planned                                       |
| 8         | Subnet/CIDR/IP-range calculators, IP/DNS lookup, latency check         | Planned                                       |
| 9         | Bandwidth/data usage, integration, accessibility and regression review | Planned                                       |

## Tool catalog by milestone

27 registry entries; 9 available after the Milestone 5 Image Resizer.

| Milestone | Category | Registry ID              | Tool                                   | Status    |
| --------- | -------- | ------------------------ | -------------------------------------- | --------- |
| 3         | General  | `age-calculator`         | Age Calculator                         | Available |
| 3         | General  | `date-difference`        | Date Difference                        | Available |
| 3         | General  | `emi-calculator`         | Loan EMI Calculator                    | Available |
| 3         | Bangla   | `digit-converter`        | Bangla ⇄ English Digits                | Available |
| 3         | Bangla   | `number-to-words-bn`     | Number to Words (Bangla & English)     | Available |
| 3         | Bangla   | `taka-in-words`          | Taka in Words                          | Available |
| 3         | Bangla   | `date-formatter`         | Date Text Formatter                    | Available |
| 4         | Bangla   | `unicode-cleaner`        | Unicode Text Cleaner                   | Available |
| 5         | Files    | `image-compressor`       | Image Compressor & Converter (JPG/PNG) | Planned   |
| 5         | Files    | `image-resizer`          | Image Resizer                          | Available |
| 5         | Files    | `image-cropper`          | Image Cropper                          | Planned   |
| 5         | Files    | `job-photo-resizer`      | Photo & Signature Resizer              | Planned   |
| 6         | Files    | `pdf-create`             | Create PDF                             | Planned   |
| 6         | Files    | `pdf-merge`              | PDF Merge & Split                      | Planned   |
| 6         | Files    | `pdf-tools`              | PDF Page Tools                         | Planned   |
| 6         | Files    | `pdf-compress`           | Reduce PDF Size                        | Planned   |
| 7         | Jobs     | `cv-templates`           | CV / Resume Templates                  | Planned   |
| 7         | Jobs     | `cover-letter-templates` | Cover Letter Templates                 | Planned   |
| 7         | Jobs     | `cv-checklist`           | Application Checklist                  | Planned   |
| 8         | Network  | `subnet-calculator`      | Subnet Calculator                      | Planned   |
| 8         | Network  | `cidr-calculator`        | CIDR & IP Range Calculator             | Planned   |
| 8         | Network  | `my-ip-info`             | IP Lookup                              | Planned   |
| 8         | Network  | `dns-lookup`             | DNS Lookup                             | Planned   |
| 8         | Network  | `latency-test`           | Latency & Packet-Loss Check            | Planned   |
| 9         | General  | `bandwidth-calculator`   | Bandwidth & Data Usage                 | Planned   |
| 9         | General  | `unit-converter`         | Unit Converter                         | Planned   |
| 9         | General  | `text-counter`           | Word & Character Counter               | Planned   |

### How overlapping requirements were merged

- "Image resize and compression" and "JPG/PNG compression and conversion" share
  `image-compressor`. Resizing and cropping were planned together as `image-resize-crop`;
  in Milestone 5 that entry was split into `image-resizer` and `image-cropper` so each can
  ship on its own (see below).
- "Printable and PDF-exportable application documents" and "configurable layouts" are
  features of `cv-templates` and `cover-letter-templates`, not separate tools.
- "Subnet calculator" and "CIDR and IP-range calculator" are separate entries but will
  share one IPv4 calculation module.
- "Number-to-words" (`number-to-words-bn`) and "Taka ↔ words" (`taka-in-words`) share the
  calculation engine in `src/calc/numberWords.ts`.

### Adjustments to the suggested plan

- `job-photo-resizer` moved from the Job Application Toolkit to Privacy-First File Tools,
  matching the requested catalog. Its ID is unchanged.
- `unit-converter`, `text-counter` and `cv-checklist` existed in Milestone 1 but are not in
  the requested catalog. They were kept as planned entries (Milestones 9 and 7) rather than
  deleted; they can be removed if not wanted.
- `number-to-words-bn` keeps its Milestone 1 ID although it now covers English too.

## Milestone 3 — delivered

Tools: Age Calculator, Date Difference, Loan EMI Calculator, Bangla ⇄ English Digits,
Number to Words, Taka in Words, Date Text Formatter. Calculation conventions and limits
are in [TOOLS.md](TOOLS.md).

Architecture added:

- `src/calc/` — pure, deterministic calculation modules (no DOM, no network).
- `src/ui/tools/` — one view per tool plus a shared kit (labelled fields, error wiring,
  result panel, copy, reset, per-tool memory that survives a language switch).
- `src/ui/toolPage.ts` and the `#/tool/<id>` route; only `available` tools resolve.

Validation (run locally on 2 October 2026 after a clean `npm ci`, Node 22, Chromium):

| Command                | Result                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `npm run format:check` | passed                                                                             |
| `npm run lint`         | passed, no warnings                                                                |
| `npm run typecheck`    | passed                                                                             |
| `npm test`             | 149 tests passed in 11 files                                                       |
| `npm run build`        | succeeded (JS 88.0 kB / 27.8 kB gzip, CSS 21.0 kB)                                 |
| `npm run test:e2e`     | 30 tests passed (desktop 1280 px, mobile 360 px, `/nextgen-utility-hub/` sub-path) |

Not done in Milestone 3 (carried forward):

- **Words → Taka amount** (the reverse direction of "Taka ↔ words") is not implemented.
  Numeric → words works in both languages.
- No amortization schedule in the EMI calculator.
- No Bangla calendar (বঙ্গাব্দ) conversion; date text is Gregorian only, by design.

## Milestone 4 — delivered

Tool: **Unicode Text Cleaner** (`unicode-cleaner`, Bangla Number & Text Toolkit, route
`#/tool/unicode-cleaner`). The existing planned registry ID and category were reused rather
than adding a second entry. Conventions and limits are in [TOOLS.md](TOOLS.md#unicode-text-cleaner).

Added:

- `src/calc/textClean.ts` — pure cleaning engine with separate "detected" and "changed" reports.
  Code points are written as numbers, so the source contains no raw invisible characters.
- `src/ui/tools/unicodeCleaner.ts` — the tool view. The shared kit gained two optional,
  backward-compatible settings: content above the result summary, and a custom copy source.
- Tests: `tests/calc/textClean.test.ts` (44), 10 view tests in `tests/tools.test.ts`, and
  `e2e/unicode.spec.ts` (9) plus the tool in the desktop/mobile load checks.

Validation (run locally on 2 October 2026 after a clean `npm ci`, Node 22, Chromium):

| Command                                                     | Result                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run format:check`, `npm run lint`, `npm run typecheck` | passed                                                                                      |
| `npm test`                                                  | 203 tests passed in 12 files                                                                |
| `npm run build`                                             | succeeded (JS 108.7 kB / 34.0 kB gzip, CSS 21.9 kB)                                         |
| `npm run test:e2e`                                          | 41 tests passed, including all earlier tools and two `/nextgen-utility-hub/` sub-path tests |

Findings during implementation:

- **Line endings:** in Chromium, text typed or pasted into a text box keeps CR/CRLF (only
  script-set values become LF), so the line-ending option is needed. This was verified in
  the browser; an earlier assumption that browsers always convert was wrong and was removed.
- **Mobile result visibility:** the scroll-into-view rule in the shared kit now triggers when
  the result is cut off at the bottom (it previously missed long results such as this tool's
  output box). It applies to every tool.

Milestones 3 and 4 were merged into `main` together in PR #3 (merge commit `9d0ed68`,
2 October 2026). CI passed on the pull request and on `main`, and the "Deploy to GitHub
Pages" workflow (run #2) published them.

## Follow-up — Text Cleaner performance fix

A post-merge review found that three whitespace regexes in `src/calc/textClean.ts` (joining
lines, trimming line ends, trimming the whole text) backtracked quadratically on very long
runs of spaces or tabs: 10,000 / 20,000 / 40,000 spaces took about 0.26 / 1.0 / 3.8 s, so an
input at the 1,000,000-character limit could freeze the tab for tens of minutes. Normal text
was not affected.

They were replaced by linear-time loops with identical behaviour. Regex lookbehind was not
used because it needs Safari/iOS 16.4+, while the ES2022 build otherwise supports Safari
15.4+; on older Safari it would have stopped the whole site from loading. Behaviour is pinned
by `tests/calc/textCleanLinear.test.ts`: explicit cases checked against the original regexes,
a fixed-seed differential test (100,000 random inputs per operation) and 1,000,000-character
inputs (correctness only, no timing assertion). Measured timings are in
[TOOLS.md](TOOLS.md#unicode-text-cleaner).

## Milestone 5 — Image Resizer delivered (other image tools planned)

Tool: **Image Resizer** (`image-resizer`, Privacy-First File Tools, route
`#/tool/image-resizer`). Conventions, limits and browser notes are in
[TOOLS.md](TOOLS.md#image-resizer).

Registry change: the planned `image-resize-crop` entry was replaced by `image-resizer`
(available) and `image-cropper` (planned). Planned tools never had a route, so no published
link changes. `image-compressor` and `job-photo-resizer` are unchanged and still planned.

Added:

- `src/calc/image.ts` — pure logic: file-type sniffing from the first bytes, size limits,
  aspect-ratio and percentage maths, dimension validation, output format choice,
  transparency checks, safe download filenames.
- `src/lib/imageCanvas.ts` — browser decode (`<img>` + `decode()`), canvas resize and encode,
  with typed errors for decode, canvas and encode failures.
- `src/ui/tools/imageResizer.ts` — the view. The shared tool context gained an in-memory
  per-tool session (survives a language switch, cleared when leaving the tool) and cleanup
  hooks, which the image tool uses to revoke object URLs.
- No new dependencies. Tests: `tests/calc/image.test.ts` (19), `tests/imageResizer.test.ts`
  (18, canvas mocked), `e2e/image.spec.ts` (15) with deterministic fixtures in
  `e2e/fixtures/`, plus the tool in the desktop/mobile load checks.

Validation (run locally on 2 October 2026 after a clean `npm ci`, Node 22, Chromium):

| Command                                                     | Result                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run format:check`, `npm run lint`, `npm run typecheck` | passed                                                                                            |
| `npm test`                                                  | 275 tests passed in 15 files                                                                      |
| `npm run build`                                             | succeeded (JS 132.7 kB / 42.0 kB gzip, CSS 24.8 kB)                                               |
| `npm run test:e2e`                                          | 58 tests passed, including 15 image tests at 360/768/1280 px and the `/nextgen-utility-hub/` path |

An axe-core scan (WCAG 2.1 A/AA and best practices, run ad hoc; axe is not a project
dependency) found no violations on the empty and result states, in light and dark themes,
English and Bangla, at 360 and 1280 px.

Still planned in Milestone 5, each as a separate step: Image Cropper, Image Compressor,
Image Converter (format conversion), and the photo/signature presets.

## Notes for later milestones

- **Milestone 6 (PDF)** will need `pdf-lib`; add it to `docs/LICENSES.md` with verified
  licence data when introduced.
- **Milestone 8 (IP/DNS lookup)** cannot work without contacting an external service
  (public-IP echo, DNS-over-HTTPS). This conflicts with "no third-party requests" and needs
  an explicit decision before implementation; the UI must say what is sent and where.
  Browsers cannot send ICMP, so "ping" will be an HTTPS round-trip measurement and must be
  labelled as such. No port or network scanning will be implemented.

## Recommended next step

Continue Milestone 5 one tool at a time, reusing `src/calc/image.ts` and
`src/lib/imageCanvas.ts`: Image Cropper, then Image Compressor, then Image Converter, then
the photo/signature presets. Exact preset dimensions and file-size limits for specific
recruiters should be confirmed from their official notices before they are hard-coded.
