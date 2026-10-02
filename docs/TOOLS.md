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
