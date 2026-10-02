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
