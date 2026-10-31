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
- **Age totals:** the Age Calculator also shows total months, weeks, days and hours. Totals
  count whole days from midnight to midnight (hours = days × 24); they are not a live clock.
  English uses international grouping (315,888); Bangla uses lakh/crore grouping and Bangla
  digits.
- **Age quick dates and examples:** “Today”, “Yesterday”, “Tomorrow”, “A year ago”, “In a
  year” and “My next birthday” set the “age on” date (a year from 29 February falls on 28
  February); the four examples set a date of birth. Both recalculate straight away.
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
- **Number to Words page:** the number system choice (lakh/crore or million/billion) changes
  the English words only; Bangla always uses লক্ষ/কোটি, and the page says so. Results are
  shown in two tabs (Bangla, English) with the number in digits and a copy button each; Copy
  result copies both languages and both digit forms. “Swap digits” switches the typed number
  between Bangla and English digits (the converter accepts both). Quick examples and the
  examples table fill in a number and convert it; the table's words are generated by the
  converter, not typed in. No text-to-speech: browser speech can send text to online voice
  services, which the site avoids.

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

## Word & Character Counter

Route `#/tool/text-counter` (registry ID kept from Milestone 1). Code: `src/calc/textCount.ts`
(pure counting) and `src/ui/tools/textCounter.ts` (view). No dependencies were added.

**Behaviour.** Counts update as the user types or pastes (no button). The count list is not
an ARIA live region, because it changes on every keystroke; screen-reader users move to it to
hear the current values. Copy puts all counts on the clipboard as text; Reset clears the text
and returns focus to it. Input is limited to 1,000,000 UTF-16 code units, the same as the
Unicode Text Cleaner; longer text shows an error instead of counts.

**Counting rules** (the same in every browser, so results are predictable):

| Count                     | Rule                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Characters                | User-perceived characters (grapheme clusters, `Intl.Segmenter`): ক্ষ, কি, 👍🏽 and 👨‍👩‍👧 each count once. Without `Intl.Segmenter` (Firefox before 125) code points are counted and the page says so. |
| Characters without spaces | The same, leaving out every Unicode whitespace character (space, tab, line breaks, no-break space, em space …).                                                                                  |
| Words                     | Runs of letters, combining marks and digits; an apostrophe inside a word joins it (“don’t”); hyphens and other punctuation split (“well-known” = 2).                                             |
| Sentences                 | Text ending in `.` `!` `?` `…` `।` or `॥` followed by a space, closing quote or the end, plus a final unterminated sentence. Decimals (3.14) do not split.                                       |
| Lines                     | Line breaks (LF, CRLF or CR) + 1; empty text has 0 lines.                                                                                                                                        |
| Paragraphs                | Blocks of non-blank lines separated by one or more blank (or whitespace-only) lines.                                                                                                             |
| Size in UTF-8             | Bytes when the text is saved as UTF-8 (Bangla letters take 3 bytes, most emoji 4).                                                                                                               |
| Reading time              | Words ÷ 200 words per minute, rounded to whole seconds (at least 1 s for any word).                                                                                                              |

**Limitations.** Abbreviations such as “Dr.” or “e.g.” end a sentence, so the sentence count
is approximate. Languages written without spaces between words (Chinese, Japanese, Thai) are
not split into words. 200 words per minute is a common average for silent reading in English;
there is no established equivalent used here for Bangla, so the estimate is the same for both.

**Privacy.** The text is processed in the tab only. It is kept in memory so a language switch
does not lose it, never written to browser storage, and cleared when leaving the tool.

**Tests.** `tests/calc/textCount.test.ts` (19: empty text, English, Bangla conjuncts, emoji,
the code-point fallback, whitespace, words, sentences, lines, paragraphs, UTF-8 bytes against
`TextEncoder`, reading time, a 1,000,000-character input), 4 view tests in
`tests/tools.test.ts`, and `e2e/general.spec.ts` (7 in Chromium; also run in Firefox and
WebKit, where the copy test is skipped because clipboard permissions can only be granted in
Chromium).

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

## Photo & Signature Resizer

Route `#/tool/job-photo-resizer` (registry ID kept from Milestone 1). Code:
`src/calc/photoFit.ts` (placement and fit logic), `openPlacedEncoder` in
`src/lib/imageCanvas.ts`, the shared image input, and `src/ui/tools/photoResizer.ts` (view).
It reuses the Compressor's target-size search (`searchQuality` in `src/calc/compress.ts`).
No dependencies were added.

**Purpose.** Make a photo or signature an exact pixel size and, optionally, keep the file
under a size limit — the two things online application forms usually check.

**No official presets.** The tool has no ready-made sizes for any recruiter, exam board,
passport or visa. Requirements (pixel size, file-size limit, format, background) differ
between organisations and change, and they could not be verified from an official source when
the tool was built (the official job-portal pages could not be reached from the development
environment). Users enter the size, limit and format from the notice they are applying to;
the page says so next to the size fields. A preset may be added later only with a cited
official source and date (see [FILE_TOOLS_AUDIT.md](FILE_TOOLS_AUDIT.md), item 11).

**Input.** The shared image checks (JPEG, PNG and WebP up to 25 MB and 50 megapixels, type
read from the file's first bytes, upright by EXIF orientation). The file name is shown.

**Size and fit.** Width and height in pixels (Bangla or English digits; 1–8,192 per side, at
most 16.7 megapixels). The image is **never stretched**. When its proportions differ from the
requested size, the user chooses:

- **Crop to fill** (default): the image is scaled to cover the output and centred; the excess
  is cut off at the left and right or top and bottom.
- **Fit the whole image**: the image is scaled to fit inside and centred; the empty space is
  filled with white.

Before saving, the page states the exact output (for example "300 × 300 px JPEG") and how
much will be cut off or added, and where. To choose which part of a photo to keep, crop it
first with the Image Cropper. Enlarging is allowed but warned about (it cannot add detail).
Sizes are pixels only: the tool does not set DPI, so print size in cm or inches is not defined
by it.

**Format and file-size limit.** JPEG (default), PNG or WebP; formats the browser cannot
encode are disabled. Without a limit, JPEG and WebP are saved at quality 92 %. With a limit
(KB, 1 KB = 1,024 bytes), JPEG and WebP use the highest quality found that fits, trying
10–100 % with at most 8 encodes; if even 10 % is too large, the smallest result is still
shown, marked "Over the limit", with an explanation. PNG has no quality setting: a warning
appears when a limit is entered with PNG, and the result says whether the single PNG encode
fits. The browser's returned type is checked; a mismatch is an error, never a mislabelled
download.

**Transparency and background.** "Fit the whole image" fills the padding and any transparent
areas with white in every format. "Crop to fill" keeps transparency in PNG and WebP; JPEG
fills it with white after a warning, and the result says when it happened.

**Results.** Dimensions, format, real file size of the download, the limit check (within /
over / none), the quality used and what the fit did (cropped or padded, how much and where).
The download is named `<original name>-<width>x<height>.<ext>`. The output has no metadata.

**Privacy.** The image is processed in the tab and never uploaded, sent anywhere, written to
browser storage or logged. Object URLs are revoked and canvases released after use, on Reset
and when leaving the tool. Settings and the result survive a language switch in memory only.

**Tests.** `tests/calc/photoFit.test.ts` (placement never stretches, crop/pad shares, limits),
`tests/photoResizer.test.ts` (view, simulated encoder: placement passed to the canvas, quality
search, over-limit honesty, validation, Bangla digits, transparency, reset, language switch)
and `e2e/photo.spec.ts` (real encoding: exact output pixels for crop and padding, real file
size within a limit, an unreachable limit, transparency, invalid input, keyboard, Bangla and
dark mode, 360/768/1280 px, the `/nextgen-utility-hub/` path). `e2e/photo.spec.ts` also runs
in Firefox and WebKit.

## Subnet Calculator and CIDR & IP Range Calculator

Both tools share `src/calc/ipv4.ts`. They are **IPv4 only** and pure arithmetic: nothing
is sent anywhere, stored or logged.

**Input.** Dotted-quad addresses (`192.168.1.10`); Bangla digits are accepted. Each octet
must be 0–255, and leading zeros (`10.01.0.1`) are refused because some tools read them as
octal. The prefix is `0`–`32`, `/24`, or a contiguous dotted mask (`255.255.240.0`); a mask
with gaps (`255.0.255.0`) is refused. The Subnet Calculator also accepts `address/prefix`
in the address field and reports a conflict if the prefix field says something else.

**Arithmetic.** Addresses are numbers in 0 … 2³² − 1. JavaScript bitwise operators are
signed 32-bit (`255 << 24` is negative), so the module uses ordinary arithmetic on powers
of two instead: block size = 2^(32 − prefix), mask = 2³² − block size, network =
address − (address mod block size), last = network + block size − 1, wildcard = block
size − 1. All values are well inside `Number.MAX_SAFE_INTEGER`.

| Prefix | Network / broadcast            | Usable hosts             |
| ------ | ------------------------------ | ------------------------ |
| /0–/30 | first / last address of block  | total − 2, network + 1 … |
| /31    | none (RFC 3021 point-to-point) | 2 (both addresses)       |
| /32    | none (a single address)        | 1                        |

The address type (private RFC 1918, shared 100.64.0.0/10, loopback, link-local,
documentation, benchmarking, multicast, reserved, limited broadcast, public) comes from the
IANA special-purpose ranges. When the address has host bits set, the result notes the real
network.

**Range → CIDR** returns the fewest blocks that cover exactly the range: at each step it
takes the largest block that is aligned on the current address and does not pass the end
(at most 62 blocks for any IPv4 range). **CIDR → range** lists the first and last address
of the block, including network and broadcast.

Known-answer tests (`tests/calc/ipv4.test.ts`) cover /0, /1, /20, /24, /27, /30, /31, /32,
the top of the address space, every prefix against a brute-force check, every mask from
/0 to /32, and the 62-block worst case.

## IP and IPv6 converters, ranges and generator

All of these run in the browser and send nothing. Addresses are parsed by
`src/calc/ipv4.ts` and `src/calc/ipv6.ts`; IPv6 arithmetic uses `BigInt`, because a
128-bit address does not fit a JavaScript number.

- **IP to Decimal** converts IPv4 ↔ decimal (0 to 4294967295), with hexadecimal and binary.
- **IPv4 to IPv6** shows the IPv4-mapped (`::ffff:a.b.c.d`), IPv4-compatible (deprecated),
  NAT64 well-known (`64:ff9b::/96`) and 6to4 (`2002::/16`) forms of an address.
- **IPv6 to IPv4** finds an IPv4 address embedded in a mapped, compatible, NAT64 or 6to4
  address. Otherwise it says no IPv4 address is embedded.
- **IPv6 Compression** gives the RFC 5952 form: lower case, no leading zeros, the longest run
  of two or more zero groups replaced by `::` (the first run when runs tie).
- **IPv6 Expand** writes every group in four hex digits.
- **IPv6 CIDR to Range** gives the first and last address and the total count of a block
  (`/0` to `/128`). IPv6 has no broadcast, so every address in the block is usable.
- **IPv6 Range to CIDR** returns the fewest blocks covering an inclusive range (at most 254
  blocks for any IPv6 range).
- **IP Subnet Calculator** takes `address/prefix` for IPv4 (same rules as the Subnet
  Calculator) or IPv6, and reports the network, last address, count and address type.
- **Local IPv6 Address Generator** makes a random unique-local address (RFC 4193): `fd` plus a
  40-bit Global ID, a /48 site prefix, subnet ID 0 and a random 64-bit interface ID. The
  random bytes come from `crypto.getRandomValues`. These addresses are for private networks
  and are not routed on the internet.

Input rules: IPv4 must have four decimal octets (0–255, no leading zeros). IPv6 may be full
or compressed, may end in a dotted IPv4, and is refused if it has a zone identifier
(`%eth0`), two `::`, or the wrong number of groups. Bangla digits are accepted everywhere.

Known answers are in `tests/calc/ipv6.test.ts`, using the RFC 5952 and RFC 4291 examples
plus the edge cases above.

## Trace Email (Header Analyzer)

Paste only the header block of a message (the lines above the first blank line). Everything
is parsed in the browser:

- **Summary:** From, sender domain, To, Subject, Date, Message-ID, Return-Path, Reply-To,
  whether a DKIM signature is present, and the SPF, DKIM and DMARC results recorded in
  `Authentication-Results` (or `Received-SPF`).
- **Hops:** every `Received` line, oldest first, with from, by, protocol, the IP in brackets,
  the time and the delay since the previous hop. A negative delay is flagged as clock skew.
- **Warnings:** missing From, no Received lines, no recorded checks, SPF/DKIM/DMARC not
  passing, Return-Path or Reply-To on a different domain, and clock skew.

Limits: the analyser reads only what is pasted. It does not verify signatures or look up any
server, and the results are what the receiving server recorded. Input is limited to 200,000
characters. Headers often contain IP addresses; nothing is stored, and the page sends nothing.

## Online Network tools (IP Lookup, IP to Hostname, DNS Lookup, Domain to IP, Latency check)

These are the only tools that use the network, and only after the user presses their
button. The tool page shows **“Uses the internet when you ask”** instead of “Runs in your
browser”, and a notice above the button says what is sent and to whom. All requests go
through `src/lib/net.ts`: `GET`, `credentials: 'omit'` (no cookies), `referrerPolicy:
'no-referrer'` (the page address is not sent), `cache: 'no-store'`, and a timeout. Nothing
is stored; the last answer is kept in memory only, so a language switch shows it again
without a new request.

| Tool           | Recipient                                          | What is sent                                                                               |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| IP Lookup      | Cloudflare, `https://1.1.1.1/cdn-cgi/trace`        | One request. Like any request, it carries the user’s IP address and user agent.            |
| IP to Hostname | Cloudflare, `https://cloudflare-dns.com/dns-query` | The IP address typed, as a reverse-DNS name (`…in-addr.arpa` or `…ip6.arpa`), type PTR.    |
| DNS Lookup     | Cloudflare, `https://cloudflare-dns.com/dns-query` | The domain name and record type (`?name=…&type=…`, header `accept: application/dns-json`). |
| Domain to IP   | Cloudflare, `https://cloudflare-dns.com/dns-query` | The domain name, twice: type A and type AAAA. Each request also carries IP and user agent. |
| Latency        | This site’s own server (`latency-probe.txt`)       | One warm-up and 5, 10 or 20 requests for a 3-byte file. No third party.                    |

**IP Lookup** parses the `key=value` text and shows only `ip`, the IP version, the country
code (`loc`), the Cloudflare data centre (`colo`) and the HTTP/TLS versions; other fields
are ignored and malformed values are dropped. 1.1.1.1 is an IPv4 address, so the result is
the IPv4 address Cloudflare sees (a VPN, proxy or CGNAT address if one is in use).

**IP to Hostname** builds the reverse name locally (the address's nibbles or octets, reversed),
then asks for its PTR records. It accepts the same address forms as the calculators.

**DNS Lookup** accepts A, AAAA, CNAME, MX, TXT, NS, SOA and CAA. The domain is validated
first (labels of 1–63 characters, at most 253 in total, no IP addresses; a pasted URL is
reduced to its host and internationalised names are converted to punycode), so an invalid
entry is never sent. The JSON `Status` is shown by name (NOERROR, NXDOMAIN, SERVFAIL,
REFUSED), the `AD` flag as “DNSSEC validated by Cloudflare”, and the answers as a table.

**Domain to IP** uses the same validation and asks for A and AAAA records together. Its
notice says the domain goes out twice.

**Latency check** times `fetch` + reading the body with `performance.now()`, one request at
a time 200 ms apart, each with a unique query string so no cache can answer. The warm-up
request is not counted. It reports average, fastest, median, slowest, jitter (mean absolute
difference between consecutive successful requests) and failed requests (errors or more than
4 s). It is **not ICMP ping** and failed requests are **not packet loss**: TCP resends lost
packets, so loss shows up as slower requests. Results include browser and server time and
depend on the CDN edge serving the site.

**Failure handling.** Each failure has its own message: offline (`navigator.onLine` is
false), timeout (8 s for Cloudflare, 4 s per latency request), blocked (`fetch` rejected:
no connection, a CORS refusal, a firewall or a blocking extension; browsers do not say
which), HTTP error with its status (for example 429 if Cloudflare limits requests), and an
unexpected answer format. The button is disabled while a request runs; leaving the tool or
pressing Reset cancels it, and the Latency check has a Stop button.

**What was and was not verified.** Cloudflare’s JSON API format and the trace format come
from Cloudflare’s documentation and public examples
([DNS over HTTPS JSON](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/)).
Cloudflare does not document the CORS headers or rate limits of either endpoint, and the
development environment could not reach Cloudflare, so **live cross-origin behaviour has not
been tested**. Automated tests answer both endpoints with mocks (`page.route` in
`e2e/network-online.spec.ts` and `e2e/network-tools.spec.ts`, a stubbed `fetch` in unit
tests) and check the request the page makes. If Cloudflare refuses a cross-origin request
from a browser, the tool shows the “blocked” message; it does not fall back to any other
service or proxy. The latency check is tested against the real preview server.

## IPv6 Compatibility Checker

Online (Cloudflare DNS-over-HTTPS, the same `dohJson` helper as DNS Lookup). Before the button the
page says that up to 14 DNS questions about the entered domain go to
`https://cloudflare-dns.com/dns-query`. The tool keeps three questions apart:

1. **DNS (checked).** A and AAAA for the domain and for `www.` (unless the domain already starts
   with `www.`), its NS and MX records, then AAAA for up to 4 name servers and 4 mail servers (MX
   by preference). The verdict (`src/calc/ipv6Compat.ts`) is _ready_ when the website (or www),
   at least one name server and, if the domain has mail servers, at least one mail server publish
   IPv6 addresses; _not ready_ when none do; _partial_ otherwise; _unknown_ for a domain with no
   addresses or NXDOMAIN. A null MX (`0 .`) counts as no mail servers.
2. **The visitor's IPv6 connectivity: not tested.** No IPv6-only test endpoint has been verified
   for browser use (CORS and certificate) from this project's environment, so the page says
   “Not tested” rather than guess.
3. **Whether the site answers over IPv6: not tested.** A web page cannot choose IPv6 for a request.

An AAAA record is never presented as proof of IPv6 connectivity.

## IP WHOIS and IPv6 WHOIS (RDAP)

Online (`online: 'rdap'`). One shared service, `src/lib/rdap.ts`, serves both tools; the
parsing and matching are in `src/calc/rdap.ts`.

- **Discovery:** the IANA RDAP bootstrap file (`https://data.iana.org/rdap/ipv4.json` or
  `ipv6.json`, RFC 9224) is downloaded once per page visit and kept in memory only. The most
  specific prefix containing the address picks the registry; its https URL is used.
- **Lookup:** `GET <registry>/ip/<address>` with `Accept: application/rdap+json`, through
  `src/lib/net.ts` (no cookies, no referrer, no cache, 10 s timeout). Redirects between registries
  are followed by the browser; the page shows the URL that answered and the one first asked.
- **Validation:** the address is checked before any request. IPv4 tool: IPv4 only; IPv6 tool:
  IPv6 only. Private, loopback, link-local, documentation, IPv4-mapped and other special-purpose
  addresses are refused because no registry holds records for them.
- **Shown:** registered range, CIDR (`cidr0` extension), name, handle, allocation type, country,
  status, registrant and other contacts (from jCard: name, organisation, e-mail, phone, address),
  registration and last-changed dates, parent network, remarks, source URL and lookup time (UTC).
  Anything the registry did not send is shown as “Not published by the registry”. Text is kept
  to one line and 300 characters per field; at most 20 entities and 5 remarks are read.
- **Errors:** not found (404), rate limited (429), other HTTP errors, timeout, blocked/CORS,
  offline, no registry for the address, unreadable bootstrap file, and answers that are not
  valid RDAP “ip network” objects.
- **Meaning:** the result is the registry's allocation record, which says who holds the block. It
  is not necessarily the ISP or the person using the address; the page says so.
- **Privacy:** the visitor's own address is never looked up automatically. The bootstrap request
  contains no address; the registry receives the entered address, plus (as with any request) the
  visitor's IP and browser details. Nothing is stored or logged by this site.
- **Verification:** unit and browser tests use recorded-shape fixtures and mocked responses. The
  live IANA and registry services, including their CORS headers, were **not** reachable from the
  development environment and are not verified.

## PDF tools

Create PDF, PDF Merge & Split, PDF Page Tools and Reduce PDF Size (`src/ui/tools/pdfTools.ts`)
run in the browser with `pdf-lib`, which is loaded only when a PDF action runs. Files are never
uploaded.

- **Create PDF:** text is laid out on A4-size pages in the built-in Helvetica font (11 pt,
  16 pt line spacing, 48 pt margins), wrapped at word boundaries (`src/calc/pdfText.ts`); a word
  longer than a line is broken rather than cut off, and text continues onto new pages. PNG and
  JPEG images are embedded directly; other image types are converted to PNG through a canvas.
  The built-in font can only show Latin (WinAnsi) characters: text with Bangla or other scripts
  is refused with a message suggesting the browser's Print → Save as PDF.
- **Merge & Split:** merges the chosen PDFs in order, or extracts a page range (e.g. `1-3,5`).
- **Page Tools:** new page order, rotation of all pages, and removal of a page range (the last
  page is never removed).
- **Reduce PDF Size:** rewrites the PDF with object streams and reports the size before and
  after. It cannot recompress embedded images, so the output may not be smaller; the page says so.
- Encrypted or damaged files give an error instead of a result. Every control has a label.

## CV / Resume Templates, Cover Letter Templates and Application Checklist

Job Application Toolkit (`src/ui/tools/jobApplication.ts`). The CV and cover letter are built
from the form into a preview that can be copied or printed / saved as PDF with the browser's own
print dialog (so Bangla text works). Entries are kept in memory for the page visit only, never
stored or sent. The checklist is a fixed list of common application steps to tick off, with
progress, copy and print; ticks are also kept in memory only.

## Ping and Traceroute (Globalping)

Online (`online: 'globalping'`). Ping IPv4 Address, Ping IPv6 Address and Traceroute share one
view factory (`src/ui/tools/globalpingTools.ts`), one request module (`src/lib/globalping.ts`)
and one parser (`src/calc/globalping.ts`).

- **Why a provider:** browsers cannot send ICMP echo or traceroute probes. The tools ask
  [Globalping](https://globalping.io), a free public measurement network, to run the test from
  its probes (servers run by volunteers and companies). The page says clearly, before and after
  the test, that results come from those probes and not from the visitor's device or network.
- **API (from Globalping's published OpenAPI description):** `POST
https://api.globalping.io/v1/measurements` with `{ type, target, locations: [{ magic, limit }],
measurementOptions }`, then `GET /v1/measurements/{id}` every 500 ms (the interval the API asks
  for) until `status` is no longer `in-progress`. The page gives up after 60 s. No API key and no
  cookies are sent; requests go through `src/lib/net.ts` (no referrer, no cache, 10 s timeout).
- **Options:** probe location (anywhere, Bangladesh, Asia, Europe, North America), 1, 3 or 5
  probes, and 3, 5 or 10 packets for ping. `ipVersion` is sent only for host names, as the API
  requires; Traceroute uses IPv4.
- **Validation:** the target must be a public IP address of the tool's family or a host name.
  Private, loopback, link-local, documentation and other special addresses, and `localhost`, are
  refused before anything is sent.
- **Shown:** a summary (probes finished/failed, target, location, measurement ID), then for each
  probe: location, network and ASN, status, resolved address, and for ping min/avg/max round trip
  and packet loss; for traceroute a hop table (silent hops as “* (no answer)”). The probe's raw
  output is available in a collapsed block. Text is capped (20,000 characters of raw output, 64
  hops) and always inserted as text, never as HTML.
- **Errors:** rate limited (429; about 250 tests per hour per IP without an account), no probes in
  the location (422), target refused (400), timeout, blocked/CORS, offline, unreadable answer and
  “did not finish in 60 s”. A failure is never shown as a result.
- **Privacy:** the target and options are sent to Globalping, which also receives the visitor's IP
  and browser details, keeps the measurement and may show it publicly by its ID. The notice says
  so before anything is sent.
- **Verification:** unit, jsdom and browser tests use fixtures shaped like the published API and
  mocked responses. The live API, including whether it sends the CORS headers a web page needs,
  was **not** reachable from the development environment and is not verified.

## What Is My ISP, IP Location Lookup and IP Blacklist Check

Online through Cloudflare DNS (`online: 'cloudflare'`). Views in `src/ui/tools/ipIntelTools.ts`,
requests in `src/lib/ipIntel.ts`, parsing in `src/calc/cymru.ts` and `src/calc/dnsbl.ts`.

- **Team Cymru IP-to-ASN (ISP and IP Location):** a DNS TXT question for the reversed address
  under `origin.asn.cymru.com` (IPv4) or the 32 reversed nibbles under `origin6.asn.cymru.com`
  (IPv6) answers `ASN | prefix | country | registry | allocated`; a second TXT question for
  `AS<n>.asn.cymru.com` gives the network's name. Both are asked through Cloudflare's DoH JSON
  API, so Team Cymru sees Cloudflare's resolver, not the visitor. The most specific prefix wins
  when several are returned; fields that do not have the documented shape are refused.
- **What Is My ISP:** first `https://1.1.1.1/cdn-cgi/trace` for the visitor's public IPv4
  address, then the Team Cymru questions. The result is the network (AS) that announces the
  address: normally the ISP, but a VPN, proxy, company network or carrier's upstream otherwise;
  the page says so.
- **IP Location Lookup:** shows the network, prefix, registry and **the country the address
  block is registered in**. It is not a physical location; no city, coordinates or map are shown,
  and the page says why. No route or no answer (e.g. SERVFAIL) is reported as such.
- **IP Blacklist Check:** IPv4 only. One DNS A question per list for
  `<reversed address>.<zone>` (RFC 5782), for exactly these five lists: Spamhaus ZEN
  (`zen.spamhaus.org`), SpamCop (`bl.spamcop.net`), PSBL (`psbl.surriel.com`), DroneBL
  (`dnsbl.dronebl.org`) and Mailspike (`bl.mailspike.net`). NXDOMAIN or no A record is “not
  listed”; `127.0.0.2`–`127.0.x.x` (not `127.0.0.1`) is “listed” with the codes; `127.255.255.x`
  (Spamhaus's answer to public resolvers and its error codes) is “could not check: refused”;
  any other answer, a resolver failure or a network error is “could not check”. The summary
  counts only lists that answered and says how many could not be checked; the page states that
  only these lists were queried.
- **Verification:** mocked in unit, jsdom and browser tests. The answer formats follow Team
  Cymru's and Spamhaus's published documentation; the live services (and whether each list
  answers queries from Cloudflare's resolver) were **not** reachable from the development
  environment and are not verified.

## BIN Checker

Offline (`src/ui/tools/binChecker.ts`, logic in `src/calc/cardCheck.ts`). Accepts only the
first 6 to 8 digits of a card (`parseBin`; spaces, hyphens and Bangla digits are accepted); the
input is limited to 11 characters and anything longer than 8 digits is refused with a warning
not to enter a full card number. The network comes from the same published IIN ranges as the
Credit Card Number Checker (`networkForPrefix`). Issuing bank, country and card type are shown
as “Not available: no approved BIN data source”: they need a licensed BIN database, which is
not used, so nothing is guessed. Nothing is sent or stored.

## Domain Name Search (RDAP)

Online (`online: 'rdap'`; view `src/ui/tools/domainSearch.ts`, service `lookupDomainRdap` in
`src/lib/rdap.ts`, parsing in `src/calc/rdap.ts`).

- **Discovery:** IANA's DNS bootstrap file (`https://data.iana.org/rdap/dns.json`, RFC 9224),
  kept in memory for the visit. The longest matching suffix (normally the TLD) picks the
  registry's https RDAP URL.
- **Lookup:** `GET <registry>/domain/<name>` with `Accept: application/rdap+json`.
- **Results:** an RDAP domain object means **registered** (registrar, registration, expiry and
  last-changed dates, registry status, name servers, DNSSEC, source URL). A 404 from the
  registry means **not found in the registry: probably available**, with a note that some names
  are reserved or premium and only a registrar can confirm. For a name with more than two labels
  (e.g. `www.example.com`) a 404 is reported as “not a registered domain on its own”. A TLD
  with no RDAP service in the bootstrap (for example Bangladesh's `.bd`) is **unknown**; DNS is
  never used to decide availability. Other HTTP errors are errors, not “available”.
- **Validation:** the name is normalised like DNS Lookup (scheme and path removed, IDN to
  ASCII); IP addresses and names with `_` are refused.
- **Verification:** mocked fixtures in unit, jsdom and browser tests; live registries and their
  CORS behaviour are **not** verified from the development environment.

## Productivity tools (text, time card, card checker, notepad)

All of these run in the browser and send nothing. The pure logic is in `src/calc/textTools.ts`,
`cardCheck.ts` and `timeCard.ts`; the views share one form helper (`src/ui/tools/toolForm.ts`).
The text tools update as you type; the others use their button. Bangla digits are accepted
where numbers are typed.

- **Lorem Ipsum Generator:** paragraphs (1–50), sentences (1–200) or words (1–5,000). It uses a
  fixed seed, so the same settings always give the same text. The classic opening “Lorem ipsum
  dolor sit amet, consectetur adipiscing elit” is optional.
- **ROT13 Decoder / Encoder:** rotates A–Z and a–z by 13; the option also rotates digits by 5
  (ROT5). Applying it twice restores the text. It is not encryption. Bangla and other
  characters are unchanged.
- **Morse Code Translator:** the international table (ITU-R M.1677-1): A–Z, 0–9 and
  `. , ? ' ! / ( ) & : ; = + - _ " $ @`. Letters are separated by a space and words by `/`.
  Decoding also accepts `·` and `−`. Characters or codes with no equivalent are skipped and
  named; the tool never guesses. Bangla is not supported.
- **Small Text Generator:** maps characters to Unicode superscript, subscript or small capitals.
  Lookup ignores letter case. Some letters have no form in a style (for example superscript q,
  subscript b); they stay as typed and are listed. These are text characters, not formatting:
  screen readers and search handle them poorly, and a few fonts show boxes.
- **Runic Translator:** a decorative letter-by-letter transliteration into Elder Futhark.
  `th` becomes ᚦ and `ng` becomes ᛜ; `q` becomes ᚲᚹ and `x` becomes ᚲᛊ. The full table is shown on
  the page. It is not a translation.
- **Invisible Character Generator:** creates up to 1,000 of one chosen character from a list of
  12 (zero-width space, non-joiner, joiner, word joiner, BOM, no-break and narrow no-break
  space, soft hyphen, the two direction marks, Hangul filler and Braille blank). A second
  section lists those characters in pasted text, with counts and the position of the first,
  and offers the text without them. The page warns against using them to impersonate or evade
  moderation.
- **Time Card Calculator:** 24-hour clock-in and clock-out, unpaid break in minutes, number of
  days (1–366) and an optional hourly rate (up to 2 decimals). A clock-out earlier than the
  clock-in means the shift ends the next day. **Equal times are refused** because they cannot
  tell “no time” from “24 hours”. The break must be shorter than the shift. Decimal hours are
  minutes ÷ 60 rounded to 2 places (8 h 30 min = 8.50); pay uses the exact minutes, then
  rounds to 2 places.
- **Credit Card Number Checker:** strips spaces and hyphens, requires 12–19 digits, and applies
  the Luhn mod-10 checksum. The network is guessed from the leading digits (Visa 4; Mastercard
  51–55 and 2221–2720; American Express 34 and 37; Discover 6011, 644–649 and 65; Diners Club
  300–305, 36, 38 and 39; JCB 3528–3589; UnionPay 62) and the length is compared with what
  that network issues. This only shows a number is well-formed. It does not show a card
  exists, is active or has funds, and the page says so.
- **Notepad Online:** a note kept in this page's memory only. It survives a language switch
  but not leaving or reloading the page. Counts use the same rules as the Word & Character
  Counter. “Download .txt” saves `note.txt` using a Blob; nothing is stored or sent.

Known-answer unit tests are in `tests/calc/textTools.test.ts`, `cardCheck.test.ts` and
`timeCard.test.ts` (including the standard card test numbers, every Mastercard 2-series edge
and the Morse round trip of every supported character).

## QR Code Generator, QR Scanner and WiFi QR Scanner

**Generator.** The QR symbol is drawn in the browser by `src/calc/qr.ts`; nothing is sent to a QR
service. It encodes text as UTF-8 in byte mode (so Bangla and emoji work), in versions 1–40 at
all four error-correction levels (L ≈ 7 %, M ≈ 15 %, Q ≈ 25 %, H ≈ 30 % of the symbol can be
damaged). It picks the smallest version that fits and the mask with the lowest standard penalty
score. Capacity in bytes: version 1 holds 17 / 14 / 11 / 7 (L / M / Q / H) and version 40 holds
2,953 / 2,331 / 1,663 / 1,273. Longer text is refused with a message. The code is always black on
white with a 4-module quiet zone, in dark mode too, because scanners need that contrast.
Downloads: PNG (at least 600 px, drawn on a canvas) and SVG (a single path, no scripts).

Content types:

- **Text or link:** the text as typed.
- **Wi-Fi network:** `WIFI:T:<WPA|WEP|nopass>;S:<name>;P:<password>;H:true;;`. The characters
  `\ ; , : "` are escaped with a backslash. The name is at most 32 **bytes** (a Bangla letter
  is 3). WPA passwords are 8–63 characters; WEP passwords are 5 or 13 characters, or 10 or 26
  hex digits; an open network has no password field.
- **Contact card:** vCard 3.0 with the fields that are filled in (name is required, plus at
  least one other). Commas, semicolons, backslashes and line breaks are escaped. The phone
  number allows digits, spaces, hyphens, brackets and a leading `+`; the website must start
  with `http://` or `https://`. Long lines are not folded, which scanners accept.

The picture's accessible name is only “QR code”. It never repeats the content, which could be a
password. The page warns that anyone who scans a code can read it.

**Verification.** `tests/calc/qr.test.ts` decodes the encoder's output with an independent decoder
(jsQR) for every version at every level filled to capacity (160 symbols), with all 8 masks, and
with Bangla, accented and emoji text. One combination, **version 23 at level L, cannot be read by
jsQR at all** (it returns nothing for every mask, size and text length, and did the same for a
second, independent encoder's version 23-L symbol), so the test asserts that this is the only
failure. Because of that, version 23 at level L is verified only through its geometry (versions 22,
24 and 25 at L, and 23 at M, Q and H, all decode) and not by decoding that symbol. The view tests
also decode the picture that is actually on the page, so what is shown is what was typed.

**Scanner.** Both scanners use [jsQR](https://github.com/cozmo/jsQR) (Apache-2.0), loaded as a
separate 130 kB (47 kB gzipped) chunk only when a scan starts. It works in every browser; the
`BarcodeDetector` API is not used because Firefox and Safari do not have it. The camera starts
only after “Start camera”; frames are scaled to 640 px wide and checked about 8 times a second;
nothing is recorded or uploaded. The camera stops when a code is found, when “Stop camera” is
pressed, and when the user leaves the tool or switches language. A picture is read at up to
1,600 px and, if nothing is found, again at up to 3,200 px, trying both normal and inverted
codes. Limits: very blurry, small or damaged codes may not be read, and the generator makes only
standard (not Micro, Kanji or Structured Append) codes.

- **QR Scanner** shows the type of what it read (web link, Wi-Fi, contact card, email, phone,
  text message, map location or text) and the content. It **never opens anything by itself**. For
  a web link it shows a warning and a separate “Open link in a new tab” button
  (`rel="noopener noreferrer"`). Only `http://` and `https://` links get that button.
- **WiFi QR Scanner** reads a Wi-Fi code from the camera, a picture, or pasted text (for a code read
  somewhere else) and shows the name, security (WPA/WPA2/WPA3, WEP or none), the password and
  whether the network is hidden. The password is hidden until “Show the password” is ticked, and
  can be copied only while shown.

## BIMI Checker & Generator

**Checker** (online, Cloudflare). Before the button the page says that two DNS questions go to
Cloudflare's public resolver (`https://cloudflare-dns.com/dns-query`, the same DoH JSON API as DNS
Lookup): TXT at `<selector>._bimi.<domain>` and TXT at `_dmarc.<domain>`. Nothing is sent until
“Check BIMI”. The logo and certificate files are **not** downloaded or checked.

Record rules applied (`src/calc/bimi.ts`):

- The record must start with `v=BIMI1` exactly; tags are `tag=value` separated by `;`; a tag may
  appear only once. `l=` must be present (it may be empty). Unknown tags are a warning; `lps=` and
  `avp=` (newer optional tags in the BIMI draft) are accepted.
- `l=` must be an `https://` address and should end in `.svg` (SVG Tiny PS); a comma list is a
  warning. `a=` (the mark certificate) must be `https://` and should end in `.pem`. No `a=` (or the
  old `a=self`) is a warning: Gmail and Apple Mail show logos only with a Verified (or, for Gmail,
  Common) Mark Certificate.
- `v=BIMI1; l=; a=;` is a **declination** record (the domain asks for no logo).
- More than one `v=BIMI1` TXT record at the name is reported as an error.
- **DMARC:** the policy must be `p=quarantine` or `p=reject`, `pct=100` (the default) and not
  `sp=none`. The check reads `_dmarc.<domain>` only; for a subdomain without its own record the
  parent domain's policy may apply, and the page says so rather than guessing the organisational
  domain.

The result is a format check of the published records, **not** an official certification; each
mail service decides whether to show a logo.

**Generator** (offline). Domain, logo address (`https`, `.svg`), optional certificate address
(`https`, `.pem`) and selector (default `default`) produce the record name
(`default._bimi.example.com`) and value (`v=BIMI1; l=…; a=…;`). Nothing is sent.

## Name Checker

Checks whether a username fits each platform's **format** rules, live, entirely in the browser
(no request to any platform). It does **not** check whether a name is free and is not an official
verification; the page says so. A leading `@` is ignored; spaces and input over 100 characters
are refused. Rules (`src/calc/nameRules.ts`):

| Platform       | Length | Characters                           | Other rules                                   | Source             |
| -------------- | ------ | ------------------------------------ | --------------------------------------------- | ------------------ |
| GitHub         | 1–39   | A–Z, 0–9, `-`                        | no `-` at start/end, no `--`                  | reported \*        |
| X (Twitter)    | 5–15   | A–Z, 0–9, `_`                        | may not contain “twitter” or “admin”          | X help pages       |
| Instagram      | 1–30   | A–Z, 0–9, `.`, `_`                   | no `.` at start/end, no `..`                  | reported \*        |
| TikTok         | 2–24   | A–Z, 0–9, `.`, `_`                   | may not end with `.`                          | reported \*        |
| YouTube handle | 3–30   | letters/digits of any script, `._-·` | no separator at start/end                     | YouTube help pages |
| Facebook       | 5+     | A–Z, 0–9, `.`                        | may not end in a domain extension (`.com`, …) | reported \*        |
| Telegram       | 5–32   | A–Z, 0–9, `_`                        | starts with a letter, may not end with `_`    | reported \*        |
| Reddit         | 3–20   | A–Z, 0–9, `_`, `-`                   |                                               | reported \*        |

\* Widely documented but not found in the platform's own help pages; marked with \* on the page.
YouTube's shorter limits for Han/Hangul (1–10) and some other scripts (2–20) are not modelled. All
platforms also refuse taken, reserved or policy-breaking names, and they change their rules.

## Image to Text Converter

OCR with [Tesseract.js](https://github.com/naptha/tesseract.js) 7.0.0, run in a Web Worker in the
browser. **The picture never leaves the device.** The worker script, the engine (WebAssembly,
LSTM-only build; the worker picks the relaxed-SIMD, SIMD or plain build the browser supports) and
the language data are served by this site from `ocr/` (copied from `node_modules` at build time by
`build/ocr-assets.mjs`); no CDN is contacted and nothing is cached in IndexedDB
(`cacheMethod: 'none'`). The page says this before the first run, with the download sizes: engine
about 3.9 MB, English data 2.9 MB, Bangla data 1.4 MB, loaded only when “Extract text” is pressed.

- **Input:** the shared image picker (JPEG, PNG, WebP, GIF, BMP…, same size limits as the image
  tools). The picture is drawn on a white canvas so EXIF orientation is applied and transparency
  reads as paper; pictures over 3,000 px on the longest side are scaled down and pictures under
  1,000 px are doubled, which helps recognition.
- **Languages:** English, Bangla, or both (slower). The default follows the interface language.
- **Output:** editable text, the mean word confidence (a warning under 60 %), Copy and Download
  (`extracted-text.txt`). **Clear text** removes the text, confidence and download but keeps the
  picture open; **Reset** (on the picture card) also closes the picture. Both are disabled while
  text is being extracted. Progress shows engine loading, language loading and recognition.
- **Errors:** engine could not load, the picture could not be read, no text found (with advice),
  and Stop (the worker is terminated at once; leaving the tool also stops it).
- **Limits:** printed text works best; handwriting, decorative fonts, tilted or dark photos give
  poor results, and Bangla conjuncts and look-alike characters need checking. Only English and
  Bangla data are shipped.
- **Verification:** the Playwright tests run the real engine on generated pictures of English and
  Bangla text in Chromium (and in Firefox and WebKit in CI), and check that every request stays on
  this site, also under the GitHub Pages sub-path.

## Internet Speed Test and Reverse Image Search

**Internet Speed Test** (online, Cloudflare). Before the button the page says what it contacts
(`https://speed.cloudflare.com/__down`, the endpoint Cloudflare's own speed test uses), how much
it downloads, and that Cloudflare receives the visitor's IP address and browser details. Nothing
is requested until “Start test”. Requests go through `src/lib/net.ts`: no cookies, no referrer,
no cache.

- **Round trip:** one uncounted warm-up, then 5 empty downloads (`bytes=0`). The time to the
  server's first answer is the round trip; the median and jitter (average change between
  consecutive round trips) are shown. This is HTTPS request time, not ICMP ping.
- **Download:** the quick plan downloads 2 × 100 kB and 4 × 1 MB (4.2 MB); the standard plan adds
  3 × 10 MB (up to 34.2 MB). Each file is read as a stream and timed from the first answer to the
  last byte; transfers under 10 ms are too quick to time and are not counted. The headline is the
  90th percentile of the timed downloads, as Cloudflare reports it; the median is shown too.
- **Data saving:** if any download in a size step takes 4 s or more, the test does not move on to
  larger files.
- **Limits:** upload speed is **not** measured. Results depend on Wi-Fi, other traffic, VPNs and
  the browser; the page calls the result an estimate. A blocked request (firewall, blocker
  extension, cross-origin rules) is reported as such. “Stop” keeps the downloads completed so far;
  leaving the tool cancels the test.
- **Verification:** CI never contacts Cloudflare. Unit tests use a fake clock and fetch; the
  Playwright tests answer the endpoint with `page.route()`. Cloudflare's live CORS behaviour has
  not been tested from this project's environment.

**Reverse Image Search** (no network use by this site). The user enters the public `http(s)`
address of a picture, and the page builds links that open Google Lens, Bing Visual Search, TinEye
or Yandex Images with that address (`target="_blank"`, `rel="noopener noreferrer"`). Opening a
link sends the address to that provider, which fetches the picture; the page says so. Addresses on
this device or a private network (`localhost`, `.local`, single-label names, 10/8, 172.16/12,
192.168/16, 127/8, 169.254/16, 100.64/10, `::1`, `fc00::/7`, `fe80::/10`) are refused because no
provider could reach them, and `data:`, `file:` and `javascript:` addresses are refused. There is
**no file picker**: the site never uploads pictures. For a picture on the device, the page links to
each provider's own upload page so the picture goes only to the provider the user chooses.

## Image tools: browsers and EXIF orientation

**Browsers actually tested.** The image tools are tested with Playwright in three
engines (`playwright.config.ts`, CI job "Cross-browser image tests" plus the Chromium job):

| Engine                   | Version tested (CI)        | Specs                                                                |
| ------------------------ | -------------------------- | -------------------------------------------------------------------- |
| Chromium                 | 141.0 (Playwright 1.56.1)  | every spec                                                           |
| Firefox                  | 142.0.1 (Playwright v1495) | `e2e/cross-browser.spec.ts`, `e2e/exif.spec.ts`, `e2e/photo.spec.ts` |
| WebKit (Safari's engine) | 26.0 (Playwright v2215)    | `e2e/cross-browser.spec.ts`, `e2e/exif.spec.ts`, `e2e/photo.spec.ts` |

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
