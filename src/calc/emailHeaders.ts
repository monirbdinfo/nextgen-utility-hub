import { fail, ok, type Result } from './result';

/**
 * Parse pasted email headers (RFC 5322 / 7601 field syntax). Works only on the text given:
 * nothing is looked up or sent. Header values can contain IP addresses and names, so they
 * should be treated as private data by the caller.
 */

export const MAX_HEADER_CHARS = 200_000;

export interface HeaderField {
  name: string;
  value: string;
}

export interface Hop {
  from: string | null;
  by: string | null;
  with: string | null;
  ip: string | null;
  /** Epoch milliseconds from the Received date, or null when missing or unreadable. */
  time: number | null;
  /** Seconds since the previous (earlier) hop; null for the first hop or unknown times. */
  delaySeconds: number | null;
}

export interface AuthResults {
  spf: string | null;
  dkim: string | null;
  dmarc: string | null;
}

export interface EmailAnalysis {
  fieldCount: number;
  from: string | null;
  fromDomain: string | null;
  to: string | null;
  subject: string | null;
  date: string | null;
  messageId: string | null;
  returnPath: string | null;
  replyTo: string | null;
  dkimSigned: boolean;
  auth: AuthResults;
  /** Oldest first: the order the message travelled. */
  hops: Hop[];
  warnings: WarningKey[];
}

export type WarningKey =
  | 'no-received'
  | 'no-auth-results'
  | 'spf-not-pass'
  | 'dkim-not-pass'
  | 'dmarc-not-pass'
  | 'from-missing'
  | 'return-path-domain-differs'
  | 'reply-to-domain-differs'
  | 'clock-skew';

export type ParseError = 'empty' | 'too-long' | 'no-headers';

/** Split a header block into fields, joining folded (continuation) lines. */
export function parseHeaderBlock(text: string): HeaderField[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const fields: HeaderField[] = [];
  for (const line of lines) {
    if (line === '') break; // the blank line ends the header block
    if (/^[ \t]/.test(line) && fields.length) {
      fields[fields.length - 1]!.value += ' ' + line.trim();
      continue;
    }
    const colon = line.indexOf(':');
    if (colon <= 0) continue; // not a field; ignored rather than guessed at
    fields.push({
      name: line.slice(0, colon).trim().toLowerCase(),
      value: line.slice(colon + 1).trim(),
    });
  }
  return fields;
}

const IP_IN_BRACKETS = /\[((?:\d{1,3}\.){3}\d{1,3}|[0-9a-f:]*:[0-9a-f:.]*)\]/i;

/** Read one Received field: `from X by Y with Z ...; date`. */
export function parseReceived(value: string): Omit<Hop, 'delaySeconds'> {
  const semi = value.lastIndexOf(';');
  const clauses = semi >= 0 ? value.slice(0, semi) : value;
  const dateText = semi >= 0 ? value.slice(semi + 1).trim() : '';
  const pick = (word: string): string | null => {
    const m = new RegExp(`\\b${word}\\s+([^\\s(;]+)`, 'i').exec(clauses);
    return m ? m[1]! : null;
  };
  const time = dateText ? Date.parse(dateText) : NaN;
  return {
    from: pick('from'),
    by: pick('by'),
    with: pick('with'),
    ip: IP_IN_BRACKETS.exec(clauses)?.[1] ?? null,
    time: Number.isFinite(time) ? time : null,
  };
}

/** The address inside a header such as `Name <user@example.com>`, or null. */
export function addressOf(value: string | undefined): string | null {
  if (!value) return null;
  const angle = /<([^<>\s]+@[^<>\s]+)>/.exec(value);
  if (angle) return angle[1]!;
  const bare = /([^\s,<>"]+@[^\s,<>"]+)/.exec(value);
  return bare ? bare[1]! : null;
}

const domainOf = (address: string | null): string | null => {
  const at = address?.lastIndexOf('@') ?? -1;
  return address && at >= 0
    ? address
        .slice(at + 1)
        .toLowerCase()
        .replace(/[>)]$/, '')
    : null;
};

function authResult(value: string | undefined, method: 'spf' | 'dkim' | 'dmarc'): string | null {
  if (!value) return null;
  const m = new RegExp(`\\b${method}=([a-z]+)`, 'i').exec(value);
  return m ? m[1]!.toLowerCase() : null;
}

/** Analyse a pasted header block. */
export function analyzeHeaders(text: string): Result<EmailAnalysis, ParseError> {
  if (!text.trim()) return fail('empty');
  if (text.length > MAX_HEADER_CHARS) return fail('too-long');
  const fields = parseHeaderBlock(text);
  if (!fields.length) return fail('no-headers');

  const first = (name: string): string | undefined => fields.find((f) => f.name === name)?.value;
  const all = (name: string): string[] => fields.filter((f) => f.name === name).map((f) => f.value);

  const from = addressOf(first('from'));
  const returnPath = addressOf(first('return-path'));
  const replyTo = addressOf(first('reply-to'));
  const authValue = all('authentication-results').join(' ');
  const auth: AuthResults = {
    spf: authResult(authValue, 'spf') ?? authResult(first('received-spf'), 'spf'),
    dkim: authResult(authValue, 'dkim'),
    dmarc: authResult(authValue, 'dmarc'),
  };

  // Received lines are newest first; reverse them so the hops read in travel order.
  const parsed = all('received').map(parseReceived).reverse();
  const hops: Hop[] = parsed.map((h, i) => {
    const prev = i > 0 ? parsed[i - 1]!.time : null;
    const delay = h.time !== null && prev !== null ? Math.round((h.time - prev) / 1000) : null;
    return { ...h, delaySeconds: delay };
  });

  const warnings: WarningKey[] = [];
  if (!from) warnings.push('from-missing');
  if (!hops.length) warnings.push('no-received');
  if (!all('authentication-results').length && !first('received-spf'))
    warnings.push('no-auth-results');
  if (auth.spf && auth.spf !== 'pass') warnings.push('spf-not-pass');
  if (auth.dkim && auth.dkim !== 'pass') warnings.push('dkim-not-pass');
  if (auth.dmarc && auth.dmarc !== 'pass') warnings.push('dmarc-not-pass');
  if (domainOf(from) && domainOf(returnPath) && domainOf(from) !== domainOf(returnPath))
    warnings.push('return-path-domain-differs');
  if (domainOf(from) && domainOf(replyTo) && domainOf(from) !== domainOf(replyTo))
    warnings.push('reply-to-domain-differs');
  if (hops.some((h) => h.delaySeconds !== null && h.delaySeconds < 0)) warnings.push('clock-skew');

  return ok({
    fieldCount: fields.length,
    from,
    fromDomain: domainOf(from),
    to: addressOf(first('to')),
    subject: first('subject') ?? null,
    date: first('date') ?? null,
    messageId: first('message-id') ?? null,
    returnPath,
    replyTo,
    dkimSigned: all('dkim-signature').length > 0,
    auth,
    hops,
    warnings: [...new Set(warnings)],
  });
}
