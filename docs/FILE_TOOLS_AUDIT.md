# Privacy-First File Tools — category audit

Audit date: 3 October 2026, against `main` at `8370797` plus the Image Converter branch.
Scope: every registry entry in the `files` category, the shared image code
(`src/lib/imageCanvas.ts`, `src/ui/tools/imageInput.ts`, `src/calc/image.ts`), the four
image-tool views, their styles, translations, tests and documentation.

**What this audit is and is not.** It is based on reading the source, the automated tests
listed below and ad hoc axe-core scans. At the time of the audit only Chromium was tested;
the reliability follow-up (see "Follow-up: reliability milestone" below) added Firefox and
WebKit runs for the image tools. It is **not** a real-Safari, real-device, screen-reader or
manual usability audit; real Safari, real touch devices and assistive technology were not
tested. The planned PDF tools and the
photo/signature tool have no code yet, so only their registry entries were reviewed.

## Tools in the category (from `src/registry/tools.ts`)

| ID                  | Name                      | Status    | Route                     | Notes                                              |
| ------------------- | ------------------------- | --------- | ------------------------- | -------------------------------------------------- |
| `image-compressor`  | Image Compressor          | Available | `#/tool/image-compressor` |                                                    |
| `image-converter`   | Image Converter           | Available | `#/tool/image-converter`  | Added in this change (new registry entry)          |
| `image-resizer`     | Image Resizer             | Available | `#/tool/image-resizer`    |                                                    |
| `image-cropper`     | Image Cropper             | Available | `#/tool/image-cropper`    |                                                    |
| `job-photo-resizer` | Photo & Signature Resizer | Planned   | —                         | Needs verified official size rules                 |
| `pdf-create`        | Create PDF                | Planned   | —                         | Needs a PDF library decision (`pdf-lib`)           |
| `pdf-merge`         | PDF Merge & Split         | Planned   | —                         | 〃                                                 |
| `pdf-tools`         | PDF Page Tools            | Planned   | —                         | 〃                                                 |
| `pdf-compress`      | Reduce PDF Size           | Planned   | —                         | 〃; real PDF size reduction is limited in browsers |

IDs and routes are unique (enforced by `tests/registry.test.ts`); planned tools have no
route or view (also enforced). The category card shows "4 available · 5 planned".

## Shared behaviour (all four available tools)

| Area           | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input          | One shared pipeline (`imageInput.ts`): file picker and drag-and-drop; type sniffed from magic bytes; 25 MB file limit; 50 MP decode limit; damaged files reported; an invalid replacement keeps the current image.                                                                                                                                                                                                                                                                        |
| Output limits  | All re-encoding goes through `openEncoder`/`resizeImage`/`cropImage` and is checked with the same `validateDimensions` (8,192 px per side, 16.7 MP).                                                                                                                                                                                                                                                                                                                                      |
| Privacy        | No network, storage (`localStorage`, `sessionStorage`, IndexedDB, cookies) or `console` use in any image tool (checked by search and by E2E tests that fail on any off-origin request or console message). Files, selections and results live only in memory and are dropped on Reset and when leaving the tool. Object URLs are revoked; canvases are shrunk to 0 × 0 after use.                                                                                                         |
| Safe rendering | All text, including user file names, is inserted as text nodes (`h()` in `src/lib/dom.ts`); there is no `innerHTML`, `eval` or similar in `src`.                                                                                                                                                                                                                                                                                                                                          |
| Format honesty | Unsupported encoders are detected (`canEncode`) and disabled in format lists. The download extension always matches the produced format.                                                                                                                                                                                                                                                                                                                                                  |
| Transparency   | JPEG output fills transparency with white after a warning, and says so afterwards; PNG/WebP keep it (verified with pixel checks in Chromium).                                                                                                                                                                                                                                                                                                                                             |
| Localization   | Every string in the four tools has English and Bangla text (`defineStrings` enforces key parity at compile time). Numbers use Bangla digits in Bangla. A language switch keeps the image, settings and result (tested for each tool).                                                                                                                                                                                                                                                     |
| Accessibility  | Labelled controls, `role="status"` / `role="alert"` messages, visible focus and keyboard operation (explicit keyboard E2E tests for the Cropper, Compressor and Converter; the Resizer uses only standard form controls and has no dedicated keyboard test), and warnings use an icon **and** text. axe-core (WCAG 2.1 A/AA + best practices): no violations on the category page and all four tools in light/dark × English/Bangla; per-tool scans also covered result and error states. |
| Responsive     | No horizontal overflow at 360, 768 and 1280 px in both languages (E2E, every tool).                                                                                                                                                                                                                                                                                                                                                                                                       |

## Automated tests per tool

| Tool       | Logic tests                    | View tests (jsdom, mocked canvas) | Browser tests (Chromium) |
| ---------- | ------------------------------ | --------------------------------- | ------------------------ |
| Resizer    | `image.test.ts` 20 (shared)    | 18                                | 15                       |
| Cropper    | `crop.test.ts` 23              | 19                                | 17                       |
| Compressor | `compress.test.ts` 13          | 16                                | 18                       |
| Converter  | `convert.test.ts` 3 (+ shared) | 14                                | 19                       |

View tests use **simulated** encoders. Browser tests run **real** Chromium encoders and
decode the downloaded files; a few converter browser tests patch the canvas API in the page
to simulate a misbehaving browser and are labelled "simulated". Each tool is also in the
desktop/mobile load checks (`e2e/tools.spec.ts`).

## Deviations and gaps found

Ordered by priority. None of these is fixed in the Image Converter change, except where
noted; each is proposed as a separate change.

| #   | Priority | Finding                                                                                                                                                                                                                                                                                                   | Proposed change                                                                                                                                  | Acceptance criteria                                                                                                |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | P1 ✅    | **Only Chromium is tested.** `playwright.config.ts` has one project. WebP encoding and EXIF handling differ in Safari/Firefox.                                                                                                                                                                            | Add Firefox and WebKit Playwright projects (CI must install those browsers; needs a workflow change, so a separate PR).                          | The image E2E suites run in Chromium, Firefox and WebKit in CI, with any browser-specific expectations documented. |
| 2   | P1 ✅    | **EXIF orientation is untested** in every tool; the docs rely on browsers applying it.                                                                                                                                                                                                                    | Add a small fixture with an orientation tag (e.g. 6 = rotated 90°) and assert decoded/output dimensions and a pixel in each tool.                | Tests show the output is upright and its dimensions are swapped as expected.                                       |
| 3   | P2       | **Inconsistent encoder-fallback policy.** The Resizer accepts a different format from the encoder and names the file by the real format (with a note); the Cropper, Compressor and Converter refuse it with an error. Neither mislabels, but users see different behaviour.                               | Make the Resizer refuse a mismatched format like the others (or document the difference deliberately).                                           | All four tools show the same error for an unsupported/mismatched format; tests cover it.                           |
| 4   | P2       | **Real touch dragging in the Cropper is untested.**                                                                                                                                                                                                                                                       | Add a touch-emulation E2E test (Playwright `hasTouch`, pointer events with `pointerType: 'touch'`).                                              | Moving and resizing by touch works; page scrolling outside the selection still works.                              |
| 5   | P3       | **Settings stay editable while processing** in the Resizer (size, format) and Cropper (fields, ratio, format). Results stay correct (the Resizer reports the real output; the Cropper discards outdated results), but it is inconsistent with the Compressor and Converter, which disable their settings. | Disable settings while busy in the Resizer and Cropper.                                                                                          | Controls are disabled with `aria-busy` during processing in all four tools.                                        |
| 6   | P3       | **File name is shown only in the Compressor and Converter.**                                                                                                                                                                                                                                              | Turn on the shared `showName` option in the Resizer and Cropper.                                                                                 | All four tools show the file name, wrapped on narrow screens.                                                      |
| 7   | P3       | **No batch processing**; one image at a time in every tool.                                                                                                                                                                                                                                               | Separate feature proposal (memory limits and download UX need design).                                                                           | —                                                                                                                  |
| 8   | P3       | **Input formats limited to JPEG, PNG and WebP.** GIF, BMP, AVIF and HEIC are rejected. Animated images become a single frame.                                                                                                                                                                             | Consider AVIF/GIF input where browsers decode them; never claim HEIC without a decoder.                                                          | Supported inputs listed per browser and tested.                                                                    |
| 9   | P4       | **Route style differs**: two entries use string literals instead of the `route()` helper. Behaviour is identical.                                                                                                                                                                                         | Use `route()` everywhere.                                                                                                                        | No functional change; registry tests pass.                                                                         |
| 10  | —        | **Planned PDF tools** need a library decision (`pdf-lib` is MIT) and licence entry in `docs/LICENSES.md`; the category description already mentions PDFs.                                                                                                                                                 | Separate milestone (roadmap Milestone 6).                                                                                                        | —                                                                                                                  |
| 11  | —        | **Photo & Signature Resizer** must not hard-code passport, ID or job-portal rules without verified official notices.                                                                                                                                                                                      | Collect official specifications first; until then, users can combine the Cropper (passport-style ratio is labelled as a shape only) and Resizer. | Every preset cites its official source and date.                                                                   |

## Follow-up: reliability milestone (P1 items 1 and 2 resolved)

- **Cross-browser tests (item 1).** Playwright now has Firefox and WebKit projects running
  `e2e/cross-browser.spec.ts` (core flows of all four tools, checking the downloaded files)
  and `e2e/exif.spec.ts`; Chromium runs every spec. CI runs them in a separate job. Results
  on the pull request: Chromium 137/137, Firefox 19/19, WebKit 19/19 (see the PR and
  [TOOLS.md](TOOLS.md#image-tools-browsers-and-exif-orientation) for versions). WebKit is
  Playwright's Linux build of Safari's engine, not Safari; real Safari is still untested.
- **EXIF orientation (item 2).** Four locally generated fixtures (Orientation 1, 3, 6, 8)
  verify displayed size, previews, downloaded pixels, crop coordinates and the absence of
  EXIF in outputs, in all three engines.
- **New finding, fixed in the same change:** in WebKit, the Cropper returned the wrong region
  for EXIF-rotated photos, because WebKit's source-rectangle `drawImage` does not use the
  upright coordinates. `cropImage` now draws the whole oriented image at an offset onto a
  crop-sized canvas; pixels stay exact in all three engines.

Remaining from the table above: P2 items 3 (Resizer's encoder-fallback policy) and 4 (real
touch testing in the Cropper; touch emulation is still not covered), and the P3/P4 items.
Mirrored EXIF orientations (2, 4, 5, 7) have no fixture yet.

Site-wide items noticed but outside this category: the `<noscript>` message is English
only; CI shows GitHub's Node 20 deprecation warning for `actions/checkout@v4` and
`actions/setup-node@v4`; `npm audit` reports 2 moderate advisories (Vitest dev
dependency).
