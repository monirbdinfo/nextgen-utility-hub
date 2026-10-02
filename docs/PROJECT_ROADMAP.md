# Project roadmap

This roadmap follows the real implementation. A tool is only marked **Available** in
`src/registry/tools.ts` when its logic, view, route and tests exist; everything else is
**Planned**. Registry IDs are stable and are reused across milestones.

## Status overview

| Milestone | Scope                                                                  | Status                                   |
| --------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| 1         | Vite + TypeScript foundation, homepage, registry, i18n, CI             | Done (PR #1)                             |
| 2         | GitHub Pages deployment workflow                                       | Done (PR #2), site deployed              |
| 3         | Date/age, date difference, EMI, digits, number/Taka words, date text   | **Done in this branch, awaiting review** |
| 4         | Unicode text cleaning and normalization                                | Planned                                  |
| 5         | Image resize, crop, compression, conversion, photo/signature presets   | Planned                                  |
| 6         | PDF creation, merge, split, page tools, size reduction                 | Planned                                  |
| 7         | CV and cover-letter templates with print/PDF export                    | Planned                                  |
| 8         | Subnet/CIDR/IP-range calculators, IP/DNS lookup, latency check         | Planned                                  |
| 9         | Bandwidth/data usage, integration, accessibility and regression review | Planned                                  |

## Tool catalog by milestone

26 registry entries; 7 available after Milestone 3.

| Milestone | Category | Registry ID              | Tool                                   | Status    |
| --------- | -------- | ------------------------ | -------------------------------------- | --------- |
| 3         | General  | `age-calculator`         | Age Calculator                         | Available |
| 3         | General  | `date-difference`        | Date Difference                        | Available |
| 3         | General  | `emi-calculator`         | Loan EMI Calculator                    | Available |
| 3         | Bangla   | `digit-converter`        | Bangla ⇄ English Digits                | Available |
| 3         | Bangla   | `number-to-words-bn`     | Number to Words (Bangla & English)     | Available |
| 3         | Bangla   | `taka-in-words`          | Taka in Words                          | Available |
| 3         | Bangla   | `date-formatter`         | Date Text Formatter                    | Available |
| 4         | Bangla   | `unicode-cleaner`        | Unicode Text Cleaner                   | Planned   |
| 5         | Files    | `image-compressor`       | Image Compressor & Converter (JPG/PNG) | Planned   |
| 5         | Files    | `image-resize-crop`      | Image Resize & Crop                    | Planned   |
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
  `image-compressor`; resizing to exact dimensions and cropping is `image-resize-crop`.
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

## Notes for later milestones

- **Milestone 6 (PDF)** will need `pdf-lib`; add it to `docs/LICENSES.md` with verified
  licence data when introduced.
- **Milestone 8 (IP/DNS lookup)** cannot work without contacting an external service
  (public-IP echo, DNS-over-HTTPS). This conflicts with "no third-party requests" and needs
  an explicit decision before implementation; the UI must say what is sent and where.
  Browsers cannot send ICMP, so "ping" will be an HTTPS round-trip measurement and must be
  labelled as such. No port or network scanning will be implemented.

## Recommended next milestone

**Milestone 4 — Unicode text cleaning and normalization.** It is self-contained, needs no
new dependency or network access, reuses the Bangla text infrastructure from Milestone 3,
and completes the Bangla Number & Text Toolkit except for words → Taka.
