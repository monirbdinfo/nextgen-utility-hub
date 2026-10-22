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
| 5         | Image resize, crop, compression, conversion, photo/signature resizer   | Done (presets deferred: no verified source)   |
| 6         | PDF creation, merge, split, page tools, size reduction                 | Planned                                       |
| 7         | CV and cover-letter templates with print/PDF export                    | Planned                                       |
| 8         | Subnet/CIDR/IP-range calculators, IP/DNS lookup, latency check         | In progress: calculators done, online planned |
| 9         | Bandwidth/data usage, integration, accessibility and regression review | Planned                                       |

## Tool catalog by milestone

28 registry entries; 25 available after the Subnet and CIDR & IP Range calculators.

| Milestone | Category | Registry ID              | Tool                               | Status    |
| --------- | -------- | ------------------------ | ---------------------------------- | --------- |
| 3         | General  | `age-calculator`         | Age Calculator                     | Available |
| 3         | General  | `date-difference`        | Date Difference                    | Available |
| 3         | General  | `emi-calculator`         | Loan EMI Calculator                | Available |
| 3         | Bangla   | `digit-converter`        | Bangla ⇄ English Digits            | Available |
| 3         | Bangla   | `number-to-words-bn`     | Number to Words (Bangla & English) | Available |
| 3         | Bangla   | `taka-in-words`          | Taka in Words                      | Available |
| 3         | Bangla   | `date-formatter`         | Date Text Formatter                | Available |
| 4         | Bangla   | `unicode-cleaner`        | Unicode Text Cleaner               | Available |
| 5         | Files    | `image-compressor`       | Image Compressor                   | Available |
| 5         | Files    | `image-converter`        | Image Converter                    | Available |
| 5         | Files    | `image-resizer`          | Image Resizer                      | Available |
| 5         | Files    | `image-cropper`          | Image Cropper                      | Available |
| 5         | Files    | `job-photo-resizer`      | Photo & Signature Resizer          | Available |
| 6         | Files    | `pdf-create`             | Create PDF                         | Planned   |
| 6         | Files    | `pdf-merge`              | PDF Merge & Split                  | Planned   |
| 6         | Files    | `pdf-tools`              | PDF Page Tools                     | Planned   |
| 6         | Files    | `pdf-compress`           | Reduce PDF Size                    | Planned   |
| 7         | Jobs     | `cv-templates`           | CV / Resume Templates              | Planned   |
| 7         | Jobs     | `cover-letter-templates` | Cover Letter Templates             | Planned   |
| 7         | Jobs     | `cv-checklist`           | Application Checklist              | Planned   |
| 8         | Network  | `subnet-calculator`      | Subnet Calculator                  | Available |
| 8         | Network  | `cidr-calculator`        | CIDR & IP Range Calculator         | Available |
| 8         | Network  | `my-ip-info`             | IP Lookup                          | Planned   |
| 8         | Network  | `dns-lookup`             | DNS Lookup                         | Planned   |
| 8         | Network  | `latency-test`           | Latency & Packet-Loss Check        | Planned   |
| 9         | General  | `bandwidth-calculator`   | Bandwidth & Data Usage             | Available |
| 9         | General  | `unit-converter`         | Unit Converter                     | Available |
| 9         | General  | `text-counter`           | Word & Character Counter           | Available |

### How overlapping requirements were merged

- "Image resize and compression" and "JPG/PNG compression and conversion" share
  `image-compressor`, now named **Image Compressor**: it can save as another format while
  compressing. The dedicated **Image Converter** (`image-converter`) was added as a new
  registry entry when it was implemented; it had previously been listed only in this roadmap. Resizing and cropping were planned together as `image-resize-crop`;
  in Milestone 5 that entry was split into `image-resizer` and `image-cropper` so each can
  ship on its own (see below).
- "Printable and PDF-exportable application documents" and "configurable layouts" are
  features of `cv-templates` and `cover-letter-templates`, not separate tools.
- "Subnet calculator" and "CIDR and IP-range calculator" are separate entries that share
  one IPv4 calculation module, `src/calc/ipv4.ts`.
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

## Milestone 5 — Image Resizer delivered

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

The Image Resizer was merged into `main` in PR #6 (merge commit `540c02c`).

## Milestone 5.2 — Image Cropper delivered

Tool: **Image Cropper** (`image-cropper`, Privacy-First File Tools, route
`#/tool/image-cropper`). The existing planned registry entry was reused; no new ID was added.
Conventions, coordinates, limits and browser notes are in [TOOLS.md](TOOLS.md#image-cropper).

Added:

- `src/calc/crop.ts` — pure crop maths in source pixels: display-to-source conversion,
  boundary clamping, moving, handle resizing (freeform and fixed ratio), ratio presets,
  validation of typed values, keyboard steps.
- `cropImage` in `src/lib/imageCanvas.ts` — a 1:1 copy of the selected region (no
  resampling), sharing the resizer's encode, transparency and error handling.
- `src/ui/tools/imageInput.ts` — the drop zone, validated loading pipeline, original-image
  card, "Save as" list and shared strings, extracted from the Image Resizer so both tools use
  the same validation. The resizer's behaviour and tests are unchanged.
- `src/ui/tools/imageCropper.ts` — the view: crop editor (pointer and keyboard), aspect
  presets, numeric X/Y/width/height, output preview and download.
- No new dependencies. Tests: `tests/calc/crop.test.ts` (21), `tests/imageCropper.test.ts`
  (18, canvas mocked), 1 new filename test in `tests/calc/image.test.ts`, `e2e/crop.spec.ts`
  (17) with a new deterministic fixture `e2e/fixtures/quadrants.png`, plus the tool in the
  desktop/mobile load checks.

Validation (run locally on 3 October 2026 after a clean `npm ci`, Node 22, Chromium only):

| Command                                                     | Result                                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run format:check`, `npm run lint`, `npm run typecheck` | passed                                                                                          |
| `npm test`                                                  | 315 tests passed in 17 files                                                                    |
| `npm run build`                                             | succeeded (JS 154.6 kB / 48.3 kB gzip, CSS 26.6 kB)                                             |
| `npm run test:e2e`                                          | 77 tests passed, including 17 cropper tests, all 15 resizer tests and every other tool's checks |

The cropper browser tests check output pixels exactly (a 20 × 20 crop across the fixture's
colour boundaries), drag conversion at a scaled preview, handle resizing, fixed ratios,
keyboard use, typed-value errors, JPEG transparency, Bangla and dark mode, 360/768/1280 px
layouts and the `/nextgen-utility-hub/` path. An ad hoc axe-core scan found no violations in
the empty, editing and result states, in light and dark themes, English and Bangla, at 360
and 1280 px.

The Image Cropper was merged into `main` in PR #7 (merge commit `b67abea`).

**Follow-up fix (post-merge review):** with a fixed ratio, typing X or Y re-derived the height
from the width. Whole-pixel rounding can differ by 1 pixel (for example 233 × 299 at 35:45
became 233 × 300), so moving the crop could silently resize it or report "does not fit"
against the height. Now only an edited width or height derives the other side; X and Y only
move the selection. Covered by 2 new tests in `tests/calc/crop.test.ts` and 1 in
`tests/imageCropper.test.ts` (both failed before the fix). Full validation after a clean
`npm ci`: 318 unit tests in 17 files and 77 Playwright tests passed; format, lint,
typecheck and build passed.

## Image Compressor delivered (requested as "Milestone 6")

The request called this Milestone 6, but this roadmap already uses Milestone 6 for the PDF
tools and lists compression under Milestone 5. To avoid renumbering every later milestone,
the compressor is recorded here as part of the Milestone 5 image tools; the PDF tools stay
Milestone 6.

Tool: **Image Compressor** (`image-compressor`, Privacy-First File Tools, route
`#/tool/image-compressor`). The existing planned entry was reused and renamed from "Image
Compressor & Converter". Conventions and limits are in [TOOLS.md](TOOLS.md#image-compressor).

Added:

- `src/calc/compress.ts` — pure logic: honest size comparison (smaller / same / larger,
  bytes, percent, ratio), quality range, target-size parsing, a bounded binary search over
  quality (at most 8 encodes) and descriptive file names.
- `openEncoder` in `src/lib/imageCanvas.ts` — draws once and encodes at several qualities.
  `resizeImage` and `cropImage` now use it internally; their behaviour is unchanged.
- `src/ui/tools/imageCompressor.ts` — the view, using the shared image input (which gained
  an opt-in file-name row; the Resizer and Cropper do not show it).
- No new dependencies. Tests: `tests/calc/compress.test.ts` (13),
  `tests/imageCompressor.test.ts` (16, canvas mocked), `e2e/compress.spec.ts` (18), plus the
  tool in the desktop/mobile load checks. No new fixtures were needed.

Validation (run locally on 3 October 2026 after a clean `npm ci`, Node 22, Chromium only):

| Command                                                     | Result                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run format:check`, `npm run lint`, `npm run typecheck` | passed                                                                                         |
| `npm test`                                                  | 347 tests passed in 19 files                                                                   |
| `npm run build`                                             | succeeded (JS 171.5 kB / 52.6 kB gzip, CSS 27.0 kB)                                            |
| `npm run test:e2e`                                          | 97 tests passed, including 18 compressor tests and all resizer, cropper and other tools' tests |

The compressor browser tests decode the downloaded file and check its real type (MIME and
magic bytes), dimensions and byte size against what the page reports, for smaller, equal
(a PNG that Chromium re-encodes byte for byte) and larger outputs, JPEG white fill, PNG
transparency, WebP, reachable and unreachable targets, keyboard use, Bangla and dark mode,
360/768/1280 px, a long file name and the `/nextgen-utility-hub/` path. An ad hoc axe-core
scan found no violations in the empty, PNG-note, result and target-error states, in light
and dark themes, English and Bangla, at 360 and 1280 px.

## Image Converter delivered, with a category audit

Tool: **Image Converter** (`image-converter`, new registry entry, route
`#/tool/image-converter`). It converts JPEG, PNG and WebP into each other at the original
dimensions. Conventions and limits are in [TOOLS.md](TOOLS.md#image-converter).

The whole Privacy-First File Tools category was audited at the same time; the findings and a
prioritized list of follow-up changes (with acceptance criteria) are in
[FILE_TOOLS_AUDIT.md](FILE_TOOLS_AUDIT.md). None of those follow-ups is part of the converter
change.

Added:

- `src/calc/convert.ts` — default target format and file names.
- `src/ui/tools/imageConverter.ts` — the view. It reuses the shared image input, the
  `openEncoder` canvas helper and the honest size comparison from `src/calc/compress.ts`.
- `formatField` in `src/ui/tools/imageInput.ts` gained two optional settings (leave out
  "Same as original", custom label); the other tools are unchanged.
- No new dependencies. Tests: `tests/calc/convert.test.ts` (3),
  `tests/imageConverter.test.ts` (14, simulated encoders), `e2e/convert.spec.ts` (19, real
  Chromium conversions; three tests simulate a misbehaving browser by patching the canvas
  API), plus the tool in the desktop/mobile load checks.

Validation (run locally on 3 October 2026 after a clean `npm ci`, Node 22, Chromium only):

| Command                                                     | Result                                                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run format:check`, `npm run lint`, `npm run typecheck` | passed                                                                                   |
| `npm test`                                                  | 364 tests passed in 21 files (0 failed, 0 skipped)                                       |
| `npm run build`                                             | succeeded (JS 185.3 kB / 55.1 kB gzip, CSS 27.0 kB)                                      |
| `npm run test:e2e`                                          | 118 tests passed (0 failed, 0 skipped), including all resizer, cropper, compressor tests |

The converter browser tests convert the fixtures for real (JPEG → PNG, PNG → JPEG, PNG → PNG,
JPEG → WebP, PNG → WebP, WebP → PNG) and decode the downloaded files to check the type (MIME
and magic bytes), dimensions, byte size against the page, transparency pixels and the file
name. An ad hoc axe-core scan found no violations for the converter (empty, PNG-note,
slider and result states) or for the category page and all four tools' empty states, in
light and dark themes, English and Bangla. `npm audit` reports 2 moderate advisories in the
Vitest test runner (development only; 0 in production dependencies); fixing them needs a
breaking Vitest upgrade, which is out of scope here.

Still planned in Milestone 5: the photo/signature presets (`job-photo-resizer`), which need
verified official specifications first.

## Follow-up — image tools reliability (cross-browser and EXIF)

Addresses the two P1 items in [FILE_TOOLS_AUDIT.md](FILE_TOOLS_AUDIT.md):

- **Cross-browser tests.** Playwright gained Firefox and WebKit projects that run
  `e2e/cross-browser.spec.ts` and `e2e/exif.spec.ts` (Chromium still runs every spec).
  `npm run test:e2e` stays Chromium-only and is still the deploy gate; the new
  `npm run test:e2e:cross` runs Firefox and WebKit in a separate CI job, which installs only
  those two browsers. WebKit is not Safari itself; real Safari is untested.
- **EXIF orientation.** Four generated fixtures (Orientation 1, 3, 6, 8) are checked in all
  four tools; outputs are upright and carry no EXIF.
- **Bug found and fixed:** in WebKit, a source-rectangle `drawImage` of an EXIF-rotated photo did
  not use the upright coordinates, so the Cropper returned the wrong area for rotated photos. The
  crop now draws the whole oriented image at an offset (`src/lib/imageCanvas.ts`).
- No dependencies were added; `package.json` gained one script and `ci.yml` one job.

Validation (3 October 2026). Locally, after a clean `npm ci` (Node 22): format, lint and
typecheck passed; 364 unit tests in 21 files passed; the build succeeded; `npm run test:e2e`
passed 137 tests in Chromium. `npm run test:e2e:cross` cannot run locally (the development
environment's network policy blocks the Playwright browser download), so Firefox and WebKit
were run only in GitHub Actions on the pull request: Firefox 19/19 and WebKit 19/19 passed
after the Cropper fix (before it, WebKit failed 1 of 19: the EXIF Cropper test). No
accessibility scan was re-run: this change does not alter any page.

## Photo & Signature Resizer delivered (no official presets)

Tool: **Photo & Signature Resizer** (`job-photo-resizer`, Privacy-First File Tools, route
`#/tool/job-photo-resizer`). The existing planned entry was reused. It makes an image an exact
pixel size by cropping (centred) or fitting with white padding — never stretching — and can
keep JPEG/WebP output under a file-size limit. Conventions and limits are in
[TOOLS.md](TOOLS.md#photo--signature-resizer).

**Presets were not added.** The request allowed presets only when verified from official
requirements. The official job-portal pages could not be reached from the development
environment (blocked by its network policy), and third-party pages are not an authoritative
source, so the tool ships with custom dimensions only and names no recruiter, passport or
visa size. A preset can be added later with a cited official source and date.

Added:

- `src/calc/photoFit.ts` — placement for crop-to-fill and fit-with-padding, the share cut off
  or padded, enlargement detection and the limit check.
- `openPlacedEncoder` in `src/lib/imageCanvas.ts` — draws the whole image at a placement with
  an optional background. `openEncoder` (Resizer, Cropper, Compressor, Converter) now
  delegates to it with the same behaviour.
- `src/ui/tools/photoResizer.ts` — the view, reusing the shared image input, the format list
  and the Compressor's quality search.
- No new dependencies. Tests: `tests/calc/photoFit.test.ts` (11), `tests/photoResizer.test.ts`
  (12, simulated encoder), `e2e/photo.spec.ts` (15, real encoding, also run in Firefox and
  WebKit), plus the tool in the desktop/mobile load checks.

Validation (run locally on 3 October 2026 after a clean `npm ci`, Node 22, Chromium): see the
pull request for exact counts and the Firefox/WebKit results from CI. An ad hoc axe-core scan
(not a project dependency, not run in CI) found no violations in the empty, settings, result
and error states and on the category page, in light and dark themes, English and Bangla, at
360 and 1280 px.

## Word & Character Counter delivered (Milestone 9, General Utilities)

Tool: **Word & Character Counter** (`text-counter`, route `#/tool/text-counter`). The planned
Milestone 1 entry was reused. Rules and limitations are in
[TOOLS.md](TOOLS.md#word--character-counter).

Added `src/calc/textCount.ts` (pure, the same rules in every browser), the view
`src/ui/tools/textCounter.ts`, 19 logic tests, 4 view tests and `e2e/general.spec.ts`, which
also runs in Firefox and WebKit (added to `CROSS_BROWSER_SPECS` in `playwright.config.ts`; the
CI job keeps its name "Cross-browser image tests"). No new dependencies. An ad hoc axe-core
scan (not a project dependency, not run in CI) found no violations on the empty, filled and
error states and the category page, in light and dark themes, English and Bangla, at 360 and
1280 px. Exact test counts and CI results are in the pull request.

## Notes for later milestones

- **Milestone 6 (PDF)** will need `pdf-lib`; add it to `docs/LICENSES.md` with verified
  licence data when introduced.
- **Milestone 8 (Subnet, CIDR & IP range)** is done and fully offline: see
  [TOOLS.md](TOOLS.md#subnet-calculator-and-cidr--ip-range-calculator).
- **Milestone 8 (IP/DNS lookup)** cannot work without contacting an external service
  (public-IP echo, DNS-over-HTTPS). This conflicts with "no third-party requests" and needs
  an explicit decision before implementation; the UI must say what is sent and where.
  Browsers cannot send ICMP, so "ping" will be an HTTPS round-trip measurement and must be
  labelled as such. No port or network scanning will be implemented.

## Recommended next step

Milestone 5 is complete apart from recruiter presets, which wait for verified official
sources. Next: Milestone 6 (PDF tools), starting with a PDF library evaluation and Create
PDF. Open P2 items from [FILE_TOOLS_AUDIT.md](FILE_TOOLS_AUDIT.md) (the Resizer's
encoder-fallback policy, Cropper touch tests) remain.

## Milestone 9.1 — Offline utility tools delivered

- **Unit Converter** (`unit-converter`): length, mass, temperature and digital storage units.
  Decimal storage (KB/MB/GB/TB) is distinct from binary (KiB/MiB/GiB/TiB); conversions
  run locally.
- **Bandwidth & Data Usage** (`bandwidth-calculator`): estimates download time from file
  size and Mbps, and decimal GB usage from average Mbps over a duration. Estimates assume
  the full stated throughput and exclude protocol overhead.
- Both tools are available in English and Bangla, use the shared local-only tool UI, and
  introduce no runtime dependencies. Validation is delegated to the repository's required
  CI checks before merge.

## Homepage redesign (NextGen Tech BD brand)

The home page, header and footer follow the NextGen Tech BD design mockup. No tool, route or
registry entry changed.

- **Logo:** `src/ui/logo.ts` draws the "NG" ring and circuit-trace mark as an inline SVG
  (redrawn from the brand artwork; no image request). It appears in the header, the hero and
  the About strip. The favicon uses a simplified NG ring.
- **Header:** logo and "NEXTGEN TECH BD" wordmark; Home (marked `aria-current` on the home
  route), Toolkits, About and Source code links; language and theme buttons.
- **Hero:** brand block (wide screens), headline with the accent line, search, and four
  feature cards. The wording was kept factual: "Private by design" instead of "100% private",
  "No sign-up, no server processing" instead of "Works offline after loading" (there is no
  service worker, so a reload needs the network), and "Works on your devices" instead of
  "all devices".
- **Toolkits:** stats (toolkits, tools available, planned tools) are counted from the
  registry, so they cannot go stale (the mockup's "22+" and "15+" were not used). The five
  toolkit cards stay visible on a toolkit page; the open one is marked `aria-current` and its
  tools are listed below with an icon, status pill and "Open tool" or "Coming soon". This
  replaces the earlier chip filter.
- **Theme:** the palette moved from teal to the logo's blue with a cyan accent and green
  "Available" pills; every text/background pair is still checked for WCAG AA in
  `tests/contrast.test.ts` (new pairs added for the header and the green pill).
- **Width:** the home page uses a wider 1,360 px frame (`.container-wide`); tool pages keep
  the 1,160 px reading width.

Validation and exact counts are in the pull request. An ad hoc axe-core scan (not a project
dependency, not run in CI) found no violations on the home page, three toolkit pages and a
tool page, in light and dark themes, English and Bangla, at 360 and 1,440 px.

## App shell with sidebar and the official logo (design v2)

The second NextGen Tech BD mockup was implemented. No tool, route or registry entry changed.

- **Official logo.** The owner's transparent PNG replaces the hand-drawn SVG used in the
  first redesign (`src/assets/brand/`, see [LICENSES.md](LICENSES.md)). The header and sidebar
  use the mark alone, with "NEXTGEN TECH BD / Utility Hub" as text, because the logo's own
  wordmark is unreadable at 38 px; the About strip uses the full logo.
- **Layout.** A sticky header (logo, search on tool pages, source link, language, theme) and
  a left sidebar (Home, the five toolkits, About, Roadmap, Source code, a privacy note). Below
  1,024 px the sidebar is a drawer opened from the menu button (Escape and outside clicks
  close it, focus returns to the button). Toolkit links are marked `aria-current`.
- **Search.** One search box at a time: in the hero on the home page, in the header on tool
  pages (the mockup shows both on the home page; two identical comboboxes would confuse
  keyboard and screen-reader users).
- **Home.** Hero with headline, search, a decorative laptop illustration with the logo
  (≥ 1,400 px only) and three feature cards; toolkit cards; "Featured tools" (eight available
  tools, chosen by hand, because the site collects no usage data to call anything "popular");
  About strip with four principles.
- **Deliberate differences from the mockup.** "Featured tools" instead of "Popular Tools";
  "Private by design" instead of "100% Private"; "No sign-up, no server processing" instead of
  "Works offline" (no service worker); "MIT licensed" instead of "Community driven"; the
  mockup's "Image to PDF" card is not shown because that tool is still planned; Bandwidth &
  Data Usage is shown as available, as it is.

Validation and exact counts are in the pull request. An ad hoc axe-core scan (not a project
dependency, not run in CI) found no violations on the home page, two toolkit pages, a tool
page and the open mobile drawer, in light and dark themes, English and Bangla, at 360 and
1,536 px.
