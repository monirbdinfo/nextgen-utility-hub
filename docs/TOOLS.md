# Tools: conventions, assumptions and limitations

All Milestone 3 tools run entirely in the browser. They make no network requests, store
nothing on a server, and keep form values only in memory while the page is open (so a
language switch does not lose input). Calculation code lives in `src/calc/` and is covered
by unit tests in `tests/calc/`.

## Dates (Age Calculator, Date Difference, Date Text Formatter)

- **Calendar:** proleptic Gregorian, years 1–9999. Dates are plain calendar dates; there is
  no time of day or time zone, so results never shift with daylight saving or location.
- **"Today"** is the date shown by the user's device.
- **Validation:** impossible dates (31 April, 29 February in a common year, month 13) are
  rejected by `parseISODate`.
- **Years, months and days:** whole months are counted from the start date (or date of
  birth). If the target month does not have that day, the **last day of the month** is used
  (month-end rule): 31 Jan → 28 Feb = 1 month; 31 Jan → 1 Mar = 1 month 1 day. Remaining
  days are counted exactly.
- **Age:** a date of birth after the "age on" date is rejected. A birthday on 29 February is
  celebrated on **28 February** in common years. When the "age on" date is a birthday, the
  tool says so and the next birthday is one year later.
- **Date difference:** the end date is **excluded** by default (1 Jan → 2 Jan = 1 day). With
  "Include the end date" both days count, which adds one day (1 Jan → 2 Jan = 2 days; same
  date = 1 day). If the end date is before the start date, the dates are swapped and the
  result says so. Total days, weeks + days, and whole months are also shown.
- **Known limitation:** the native date picker shows dates in the browser's locale format
  (for example MM/DD/YYYY in a US-English browser). The stored value is always ISO
  `YYYY-MM-DD`.

## Loan EMI Calculator

- **Method:** equal installments on a reducing balance (standard EMI / annuity).
  `payment = P × i ÷ (1 − (1 + i)^−n)`, where `i = annual rate ÷ payments per year` and
  `n` = number of payments. At 0 % interest, `payment = P ÷ n`.
- **Frequencies:** monthly, quarterly, half-yearly, yearly. The term must divide evenly
  into payments (e.g. 10 months cannot be paid quarterly).
- **Assumption:** the annual rate is nominal and compounds once per payment period. Flat-rate
  loans, fees, insurance, VAT and grace periods are not modelled.
- **Rounding:** values are calculated unrounded; each displayed figure is rounded half away
  from zero to the nearest poisha (0.01). Lenders usually adjust the final installment, so
  real totals can differ by a few poisha.
- **Limits:** principal > 0 and ≤ ৳1,00,00,00,00,000; rate 0–100 % per year; term a whole
  number from 1 month to 50 years.
- **Disclaimer (shown with every result):** an estimate, not a quotation from any lender.

## Bangla ⇄ English Digits

- Only the ten digits are mapped (০১২৩৪৫৬৭৮৯ ⇄ 0123456789). Letters, punctuation,
  whitespace, line breaks and other scripts are preserved exactly. Mixed text is safe.

## Number to Words and Taka in Words

- **Input:** Bangla or English digits; spaces and commas are ignored; a leading `+`, `-` or
  `−` is accepted; one decimal point at most. Prefixes `৳`, `Tk`, `Taka`, `BDT` are ignored.
  Exponents (`1e5`), multiple points, a trailing point and letters are rejected.
- **Range:** integer part up to 15 digits (999,999,999,999,999). Larger numbers are
  rejected, never truncated.
- **English:** Title Case, hyphenated 21–99 ("Twenty-One"), no "and". Scale is lakh/crore by
  default or million/billion/trillion on request. Above 99 crore the crore count is itself
  written out ("One Lakh Crore").
- **Bangla:** individual words for 0–99, then শত, হাজার, লক্ষ, কোটি. Common standard
  spellings are used; some numbers have accepted regional variants (ঊনত্রিশ / উনত্রিশ).
  Strings are Unicode NFC-normalized.
- **Plain numbers:** up to 10 decimal places, read digit by digit ("12.05" → "Twelve Point
  Zero Five"); trailing zeros you type are kept. Negative numbers start with "Minus" /
  "ঋণাত্মক"; `-0` is zero.
- **Taka:** at most 2 decimal places (1 Taka = 100 Poisha; ".5" = 50 poisha). More decimal
  places are an **error, never rounded**. Negative amounts are rejected. Format:
  "One Thousand Two Hundred Fifty Taka and Fifty Poisha Only" /
  "এক হাজার দুই শত পঞ্চাশ টাকা পঞ্চাশ পয়সা মাত্র". Zero → "Zero Taka Only".
- **Not implemented:** words → numeric amount.

## Date Text Formatter

- Formats: DD/MM/YYYY (English and Bangla digits), ISO, long English, long Bangla, both with
  weekday, and the date in words (cardinal day and year, e.g. "Two October Two Thousand
  Twenty-Six" / "দুই অক্টোবর দুই হাজার ছাব্বিশ").
- Bangla month names are the **Gregorian** months written in Bangla. The tool does **not**
  convert to the Bangla calendar (বঙ্গাব্দ).

## Accessibility behaviour (all tools)

- Every input has a visible label; hints and errors are linked with `aria-describedby`;
  invalid fields get `aria-invalid` and the first one receives focus.
- Results are in a polite live region; copy confirmations use `role="status"`.
- Forms submit with Enter; Reset returns focus to the first field; on narrow screens the
  result is scrolled into view after calculating.
- Tool pages update the document title and move focus to the tool heading on navigation.

## Unicode Text Cleaner

Route `#/tool/unicode-cleaner`. Code: `src/calc/textClean.ts` (logic) and
`src/ui/tools/unicodeCleaner.ts` (view). The text is processed only in the browser tab; it
is not uploaded, stored or logged, and the page makes no network requests.

**Nothing changes until "Clean text" is pressed, and only the ticked operations run.**
Defaults: trim the start/end, remove spaces at line ends, collapse repeated spaces, convert
unusual spaces, convert line endings to LF, keep paragraph breaks (at most one blank line),
keep tabs and line breaks, remove zero-width characters and control characters. Joiners,
bidi marks and Unicode normalization are **off** by default.

| Option                      | Exactly what it changes                                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trim start and end          | Whitespace and blank lines before the first and after the last visible character. A leading BOM (U+FEFF) is not treated as whitespace; it is a zero-width character.                                  |
| Spaces at line ends         | Spaces and tabs before each line break. Indentation is untouched.                                                                                                                                     |
| Repeated spaces             | Two or more U+0020 spaces become one (anywhere, including indentation). Tabs are separate.                                                                                                            |
| Unusual spaces              | U+00A0, U+1680, U+2000–U+200A, U+202F, U+205F, U+3000 → U+0020.                                                                                                                                       |
| Line endings                | CRLF, CR, NEL (U+0085), LS (U+2028), PS (U+2029) → LF.                                                                                                                                                |
| Blank lines                 | Keep all; keep paragraph breaks (runs of blank lines → one); or remove all. A blank line contains only spaces/tabs.                                                                                   |
| Keep tabs (off)             | Each tab → one space.                                                                                                                                                                                 |
| Keep line breaks (off)      | Every line break, with the spaces/tabs around it, → one space (paragraphs merge).                                                                                                                     |
| Zero-width characters       | U+200B, U+2060, U+FEFF, U+00AD.                                                                                                                                                                       |
| Control characters          | U+0000–U+0008, U+000B, U+000C, U+000E–U+001F, U+007F–U+0084, U+0086–U+009F. Tab, LF, CR and NEL are never removed by this option.                                                                     |
| Joiners (opt-in, warned)    | ZWNJ U+200C and ZWJ U+200D. Needed for some Bangla conjunct forms (e.g. র + ZWJ + ্ + য) and for emoji sequences.                                                                                     |
| Bidi marks (opt-in, warned) | U+200E, U+200F, U+061C, U+202A–U+202E, U+2066–U+2069. Needed in right-to-left text; stray overrides can make text display in a misleading order.                                                      |
| NFC                         | Canonical composition. Text looks the same. Bangla: decomposed ো/ৌ are composed; precomposed য়/ড়/ঢ় (U+09DF, U+09DC, U+09DD) become letter + nukta, because Unicode excludes them from composition. |
| NFKC                        | NFC plus compatibility mappings, which can change appearance or meaning: ﬁ → fi, ① → 1, Ａ → A, x² → x2, 𝐀 → A, NBSP → space.                                                                         |

**Never removed:** Bangla letters, vowel signs (কার), ফলা, যুক্তাক্ষর, hasanta (U+09CD), nukta
(U+09BC), chandrabindu, anusvara, visarga, khanda ta, dari (।), any combining mark, emoji
skin-tone modifiers and variation selectors. A unit test checks that no code point in the
Bengali block (U+0980–U+09FF) is in any removal set. U+034F (combining grapheme joiner) and
U+180E (Mongolian vowel separator) are deliberately not in the zero-width set.

**Order of operations** (fixed): normalize → line endings → control/zero-width/joiner/bidi
removal → unusual spaces and tabs → join lines → line-end spaces and repeated spaces → blank
lines → trim ends → normalize again (removing a character between a letter and its combining
mark can expose a sequence the chosen form composes). Running the same options twice gives
the same text (tested).

**Report:** "found" counts come from the original text; "removed"/"converted" counts are what
the selected options actually changed. Groups whose option is off are reported as "kept".
The tool also says when the input is not in NFC, when normalization changed the text, when no
change was needed, and when whitespace-only input became empty.

**Counting and limits:** characters are Unicode code points (ক্ষ = 3, 👍🏽 = 2), not user-visible
letters. Input is limited to 1,000,000 UTF-16 units.

**Performance:** every operation runs in linear time, including on long runs of spaces or
tabs. Measured on the development machine (median of 5 runs; device speed varies): the
cleaning engine handles 1,000,000 spaces in about 25 ms and 1,000,000 tabs in about 85 ms
on Node 22, and a full "Clean text" at the 1,000,000-character limit takes about 22–45 ms in
Chromium on the production build. The whitespace steps use plain loops rather than regex
lookbehind so the tool keeps working on Safari/iOS 15.4–16.3.

**Browser note:** setting a text box's value from a script turns CR/CRLF into LF, but text
typed or pasted into it keeps CR in Chromium. The line-ending option handles both.

## Image Resizer

Route `#/tool/image-resizer`. Code: `src/calc/image.ts` (logic), `src/lib/imageCanvas.ts`
(browser decode/resize/encode) and `src/ui/tools/imageResizer.ts` (view). No dependencies
were added; it uses the browser's own image decoder and `<canvas>`.

**Privacy.** The image is read from the file picker or a drop, decoded and resized inside the
tab. It is never uploaded or sent anywhere (the E2E tests fail on any off-origin request),
never written to `localStorage`, `sessionStorage`, IndexedDB or cookies, and never logged:
the code has no `console` calls and does not record file names, contents or metadata. The
open image and result are kept only in memory, so they survive a language switch but are
dropped when you leave the tool or press Reset. Object URLs are revoked when an image is
replaced, reset or left behind.

**Input.** JPEG, PNG and WebP, up to 25 MB. The type is checked from the file's first bytes,
not its name or reported type, so a renamed text file is rejected. Files that pass that check
but cannot be decoded (damaged files) show an error and nothing else changes; if an image was
already open, it stays open. Images above 50 megapixels are rejected before resizing.

**Size.** Width and height are whole pixels (English or Bangla digits). With "Keep aspect
ratio" on, changing one side sets the other, rounded to the nearest pixel (minimum 1).
Presets set 25/50/75/100 % of the original. Limits: at least 1 px, at most 8,192 px per side
and 16,777,216 pixels in total (for example 4,096 × 4,096), so it also works within phone
browsers' canvas limits. The tool never stretches silently: if the proportions differ from
the original by more than 1 %, a warning is shown before resizing; enlarging shows a note
that no detail is added.

**Output.** "Same as original" or JPEG, PNG or WebP. JPEG and WebP are saved at quality 92 %
(lossy); PNG is lossless but the image is still resampled, so **resizing is never lossless**.
Formats this browser cannot encode are disabled in the list; if the browser still returns a
different format, the result says so and the file name uses the real format. The download is
named `<original name>-<width>x<height>.<ext>` (path parts and unsafe characters removed).

**Transparency.** PNG and WebP keep transparency. JPEG cannot store it: when the source may
be transparent and JPEG is chosen, a warning is shown before resizing, transparent areas are
filled with white, and the result says when that actually happened.

**Metadata and orientation.** The output contains no EXIF/XMP metadata from the original
(camera, GPS, date). Photos are decoded with their orientation tag applied, so they are
resized the right way up (tested in Chromium, Firefox and WebKit; see
[Image tools: browsers and EXIF orientation](#image-tools-browsers-and-exif-orientation)).

**Browser support and limits.**

- WebP **encoding** is not available in Safari (decoding is, from Safari 14 on macOS 11+ and
  iOS 14+), so WebP is disabled in the "Save as" list there. "Same as original" for a WebP
  file then makes the browser fall back to PNG, and the result states the actual format.
  This fallback was reasoned from the canvas specification and tested with a mocked encoder;
  it was not run in a real Safari.
- Very large images can still fail on low-memory devices; the tool shows an error instead of
  crashing.
- Resampling uses the browser's high-quality smoothing, so output pixels can differ slightly
  between browsers.
- Colour profiles are handled by the browser; the output is saved in sRGB.
- Drag and drop needs a pointer device; the file picker works everywhere, including with
  the keyboard.

## Image Cropper

Route `#/tool/image-cropper`. Code: `src/calc/crop.ts` (crop maths), `cropImage` in
`src/lib/imageCanvas.ts`, `src/ui/tools/imageInput.ts` (file loading shared with the Image
Resizer) and `src/ui/tools/imageCropper.ts` (view). No dependencies were added.

**Privacy.** Same approach as the Image Resizer: the image is decoded and cropped in the tab
and never uploaded, sent anywhere, written to browser storage or logged. The file, selection
and result are kept in memory only (they survive a language switch and are dropped on Reset or
when leaving the tool). Object URLs are revoked when the result is outdated, on Replace, on
Reset and when leaving the tool.

**Input.** The same checks as the Image Resizer, using the same code: JPEG, PNG and WebP up to
25 MB and 50 megapixels, the type read from the file's first bytes, and damaged files reported
without replacing an image that is already open.

**Coordinates.** Three spaces are kept apart:

- _Source pixels_: the decoded image's natural pixels, after the photo's orientation tag is
  applied. The selection, the X / Y / width / height fields and the output all use these,
  as whole numbers measured from the top-left corner.
- _Display pixels_: CSS pixels of the scaled preview. Pointer movements are converted with
  the preview's current scale (source width ÷ displayed width, per axis) before they change
  the selection, and the total movement since the drag started is used, so rounding does not
  accumulate.
- The on-screen box is positioned with percentages of the source size, so it stays aligned
  with the image at any preview size and after the window is resized.

**Editing.**

- Drag inside the box to move it; drag one of the eight handles to resize it. The opposite
  edge or corner stays fixed. The box cannot leave the image. Handles cannot make it smaller
  than about 24 screen pixels, so it stays grabbable; smaller crops (down to 1 × 1) can be
  typed.
- Keyboard: the box and its bottom-right corner are in the tab order. Arrow keys on the box
  move it by 1 pixel (10 with Shift); arrow keys on the corner resize it. The keys are only
  handled while the box or corner has focus, and a polite live region announces the new
  size and position.
- Typed values apply when the field is left or Enter is pressed. Values that do not fit are
  **reported, never clamped**: "X + width can be at most N pixels", or, with a fixed ratio,
  that the size does not fit from the current position. With a fixed ratio, typing a width
  sets the height (and vice versa); typing X or Y only moves the selection and never changes
  its size.
- Only the box and its handles use `touch-action: none`; touching elsewhere on the image or
  page scrolls normally.

**Aspect ratios.** Freeform, 1:1, 4:3, 3:2, 16:9, 3:4, 2:3 and "passport-style" 35:45.
The passport-style option is only the shape of a common 35 × 45 mm photo; it does not set a
size, resolution or any official rule, and the page says so. With a fixed ratio, dragging and
typing keep the ratio as closely as whole pixels allow (within 1 pixel); switching ratio keeps
the selection's centre and roughly its area, shrinking only to fit. "Select whole image"
selects the largest area with the current ratio.

**Output.** The selected pixels are copied at their original size; nothing is resized. Save
as "Same as original", PNG, WebP or JPEG. PNG copies the pixels exactly and keeps
transparency; WebP keeps transparency but, like JPEG, is lossy at quality 92 %. Choosing
JPEG for an image that may be transparent shows a warning first, and transparent areas become
white. If the browser cannot encode the chosen format (WebP in Safari), the option is
disabled, or an error is shown; the file is never saved in a different format under the
chosen name. The download is named `<original name>-cropped.<ext>`, where the extension
matches the real output type. Crops larger than 8,192 pixels per side or 16.7 megapixels are
refused with an explanation (a warning appears as soon as the selection is that large).

**Browser support and limits.**

- Tested in Chromium, Firefox and WebKit with a desktop mouse and keyboard (see
  [Image tools: browsers and EXIF orientation](#image-tools-browsers-and-exif-orientation)).
  Real touch dragging was not tested; touch support relies on Pointer Events and
  `touch-action`.
- Orientation: crop coordinates refer to the upright (displayed) image, and the output
  matches what the selection showed, including for EXIF-rotated photos. The crop copies the
  whole oriented image at an offset onto a crop-sized canvas, because WebKit's
  source-rectangle `drawImage` did not use the upright coordinates (found by the
  cross-browser tests and fixed).
- If the selection covers the whole preview on a phone, scroll by touching outside the image
  or the box.

## Image Compressor

Route `#/tool/image-compressor`. Code: `src/calc/compress.ts` (logic), `openEncoder` in
`src/lib/imageCanvas.ts`, `src/ui/tools/imageInput.ts` (shared file loading) and
`src/ui/tools/imageCompressor.ts` (view). No dependencies were added.

**Privacy.** Same approach as the other image tools: the image is decoded and re-encoded in
the tab and never uploaded, sent anywhere, written to browser storage or logged. The file name
is shown on the page only. Object URLs and canvases are released after use, on Replace, on
Reset and when leaving the tool.

**Input.** The shared checks: JPEG, PNG and WebP up to 25 MB and 50 megapixels, the type read
from the file's first bytes. The page shows the file name, format, dimensions and size.
Re-encoding needs a canvas of the full image, so images over 8,192 pixels per side or
16.7 megapixels are refused with a suggestion to use the Image Resizer first.

**Output.** The dimensions are never changed. "Save as": same as original, JPEG, WebP or PNG;
formats the browser cannot encode are disabled, and a browser that returns a different format
than requested is reported as an error, so a file is never mislabelled. The download is named
`<original name>-compressed-q<quality>.<ext>` (without the quality for PNG), with the
extension of the real output type. JPEG output fills transparent areas with white, after a
warning, and says when that happened.

**Quality mode.** A slider from 10 % to 100 % (default 80 %), operable with the arrow keys,
Home and End, with the value shown next to it and announced as a percentage. It applies to
JPEG and WebP only. A quality setting does **not** guarantee a file size, and the page says
so.

**PNG.** Browsers expose no quality or compression-level setting for PNG, so the slider is
hidden and the page explains that re-saving a PNG often makes it larger, recommending JPEG or
WebP to reduce the size.

**Target-size mode** (JPEG and WebP only). Enter a target in KB (1 KB = 1,024 bytes; 1 to
25,600 KB, one decimal place, English or Bangla digits). The tool first tries quality 10 %:
if even that is too large, it reports that the target cannot be reached, shows the size of
that smallest result, and offers it for download. Otherwise a binary search over whole
percentages keeps the highest quality found whose output fits; this takes at most 8 encodes.
Encoders are not perfectly monotonic, so the result is the best quality _found_, not a
guarantee that no higher quality would fit.

**Results, reported honestly.** Compressed size (the size of the file you download), original
size, the saving in bytes and percent (one decimal), the compression ratio (original ÷
compressed, e.g. "1.69 : 1"), dimensions, format and the quality used. Equal sizes are
reported as "No change in size"; a larger output is reported as "… larger — no saving", and
the status suggests keeping the original. Savings are never claimed when there are none.

**Browser support and limits.**

- Tested in Chromium, Firefox and WebKit (see
  [Image tools: browsers and EXIF orientation](#image-tools-browsers-and-exif-orientation)).
  Output sizes for the same settings differ between browsers and browser versions, because
  each uses its own encoder.
- WebP encoding is not available in Safari, so WebP is disabled there; a WebP file with "Same
  as original" then shows an error asking for another format (tested with a mocked encoder,
  not real Safari).
- Re-encoding removes metadata (camera details, GPS) and applies the photo's orientation.

## Image Converter

Route `#/tool/image-converter`. Code: `src/calc/convert.ts` (logic), `openEncoder` in
`src/lib/imageCanvas.ts`, `src/ui/tools/imageInput.ts` (shared file loading) and
`src/ui/tools/imageConverter.ts` (view). No dependencies were added.

**Privacy.** Same as the other image tools: the image is converted in the tab and never
uploaded, sent anywhere, written to browser storage or logged. Object URLs and canvases are
released after use, on Replace, on Reset and when leaving the tool.

**Input.** The shared checks (JPEG, PNG and WebP up to 25 MB and 50 megapixels, type read
from the file's first bytes). The page shows the file name (as text, any script), source
format, dimensions and size. Images over 8,192 pixels per side or 16.7 megapixels are refused
with a suggestion to use the Image Resizer first.

**Output.** "Convert to" lists JPEG, PNG and WebP; formats the browser cannot encode are
disabled and labelled. A different format from the source is suggested (PNG for JPEG/WebP
sources, JPEG for PNG); once the user picks a format, it is kept across Replace image and a
language switch until Reset. Choosing the source's own format is allowed and explained as a
re-encode. The pixel dimensions never change. The browser's returned type is checked: if it
differs from the chosen format, an error is shown and nothing is offered for download. The
file is named `<original name>-converted.<ext>`, with the extension of the real output.

**Quality.** A slider (10–100 %, default 92 %, the same default as the Resizer and Cropper)
for JPEG and WebP only; the page says that no quality setting guarantees a file size. PNG has
no quality setting, so the slider is hidden and a note explains that PNG is lossless and often
larger.

**Transparency.** PNG and WebP keep transparency (checked with pixel tests). Converting an
image that may be transparent to JPEG shows a warning first; transparent areas become white,
and the result says when that happened. Animated images are converted as a single still
frame.

**Results.** Output format, original format, dimensions, output and original size, the size
difference (smaller / "No change in size" / larger, in bytes and percent) and the quality
used. A larger output is explained (normal for PNG), never presented as a saving.

**Browser support and limits.** Tested in Chromium, Firefox and WebKit (see
[Image tools: browsers and EXIF orientation](#image-tools-browsers-and-exif-orientation)).
Output sizes differ between browsers and versions. Where the canvas cannot encode WebP, the
option is disabled and explained. Metadata (camera, GPS) is not carried over, colour profiles
are handled by the browser, and photos are turned upright using their orientation tag (tested
for orientations 1, 3, 6 and 8).

## Image tools: browsers and EXIF orientation

**Browsers actually tested.** The four image tools are tested with Playwright in three
engines (`playwright.config.ts`, CI job "Cross-browser image tests" plus the Chromium job):

| Engine                   | Version tested (CI)        | Specs                                                  |
| ------------------------ | -------------------------- | ------------------------------------------------------ |
| Chromium                 | 141.0 (Playwright 1.56.1)  | every spec, including the cross-browser and EXIF specs |
| Firefox                  | 142.0.1 (Playwright v1495) | `e2e/cross-browser.spec.ts`, `e2e/exif.spec.ts`        |
| WebKit (Safari's engine) | 26.0 (Playwright v2215)    | `e2e/cross-browser.spec.ts`, `e2e/exif.spec.ts`        |

WebKit here is Playwright's Linux build of the engine Safari uses, **not Safari itself**;
real Safari on macOS or iOS and physical touch devices have not been tested. Firefox and
WebKit run only in GitHub Actions (they could not be installed in the development
environment), so their results come from CI logs.

Canvas encoding support detected in CI (the same check the tools use, printed to the test
log): JPEG, PNG and WebP in all three engines, including Playwright's Linux WebKit build.
Real Safari is documented not to encode WebP, so the "no WebP encoder" path (WebP option
disabled and labelled) is covered only by tests that simulate it by patching
`toDataURL`, not by a real engine. The WebP test asserts whichever applies.

**EXIF orientation.** The tools never read EXIF themselves; they rely on the browser, which
applies the orientation tag when decoding (`naturalWidth`/`naturalHeight`, previews and
`drawImage`). Outputs are drawn from the upright image and carry **no** EXIF, so viewers
cannot rotate them a second time. Verified cases (fixtures `e2e/fixtures/exif-orientation-*.jpg`,
generated locally: 80 × 60 stored pixels with red, green, blue and yellow quadrants, only the
Orientation tag differing):

| Orientation | Displayed size | Verified in all three engines                                                                                               |
| ----------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1           | 80 × 60        | Converter: preview and output pixels                                                                                        |
| 3 (180°)    | 80 × 60        | Converter: preview and output pixels                                                                                        |
| 6 (90° CW)  | 60 × 80        | Converter; Resizer (50 % → 30 × 40, no EXIF in output); Cropper (coordinates and a crop of the displayed top-left quadrant) |
| 8 (90° CCW) | 60 × 80        | Converter; Compressor (60 × 80, no EXIF in output)                                                                          |

Mirrored orientations (2, 4, 5, 7) are not covered by a fixture. The cross-browser tests
found one engine difference: WebKit's source-rectangle `drawImage` did not use the upright
coordinates of an EXIF-rotated image, which made the Cropper return the wrong region; the
Cropper now draws the whole image at an offset instead (see the Cropper notes).
