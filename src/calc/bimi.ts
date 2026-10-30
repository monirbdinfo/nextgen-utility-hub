import { fail, ok, type Result } from './result';

/**
 * BIMI (Brand Indicators for Message Identification) record checks and generation.
 *
 * A BIMI record is a DNS TXT record at `<selector>._bimi.<domain>` such as
 * `v=BIMI1; l=https://example.com/logo.svg; a=https://example.com/vmc.pem`. Mail clients show
 * the logo only when the domain also has an enforcing DMARC policy. This module reads and writes
 * the record text; it never fetches the logo or certificate.
 */

export const DEFAULT_SELECTOR = 'default';

/** DNS name of the BIMI record for a selector and domain. */
export const bimiName = (selector: string, domain: string): string => `${selector}._bimi.${domain}`;
export const dmarcName = (domain: string): string => `_dmarc.${domain}`;

/** A selector is one DNS label: letters, digits and inner hyphens or underscores. */
export const isSelector = (s: string): boolean => /^(?!-)[a-z0-9_-]{1,63}(?<!-)$/i.test(s);

/**
 * The text of a TXT answer as DNS-over-HTTPS JSON gives it: one or more quoted strings that are
 * joined without spaces, with `\"`, `\\` and `\DDD` escapes. Unquoted data is returned as is.
 */
export function txtValue(data: string): string {
  const t = data.trim();
  if (!t.startsWith('"')) return t;
  let out = '';
  let i = 0;
  while (i < t.length) {
    if (t[i] !== '"') {
      i++;
      continue;
    }
    i++;
    while (i < t.length && t[i] !== '"') {
      if (t[i] === '\\' && i + 1 < t.length) {
        const dec = t.slice(i + 1, i + 4);
        if (/^\d{3}$/.test(dec)) {
          out += String.fromCharCode(Number(dec));
          i += 4;
        } else {
          out += t[i + 1];
          i += 2;
        }
      } else out += t[i++];
    }
    i++;
  }
  return out;
}

/** Problems stop mail clients from using the record; warnings are worth fixing. */
export type BimiIssue =
  | { level: 'error'; code: 'not-bimi' | 'duplicate-tag' | 'syntax' | 'no-location' | 'no-l-tag' }
  | { level: 'error'; code: 'logo-not-https' | 'cert-not-https'; value: string }
  | { level: 'warning'; code: 'logo-not-svg' | 'cert-not-pem' | 'logo-list'; value: string }
  | { level: 'warning'; code: 'unknown-tag'; value: string }
  | { level: 'warning'; code: 'cert-self' | 'no-cert' | 'no-logo' };

export type BimiState = 'valid' | 'warnings' | 'invalid' | 'declined';

export interface BimiRecord {
  /** Tag values, keys in lower case. */
  tags: Record<string, string>;
  logo: string | null;
  cert: string | null;
  issues: BimiIssue[];
  state: BimiState;
}

const isHttpsUrl = (s: string): boolean => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && !!u.hostname;
  } catch {
    return false;
  }
};
const pathEnds = (s: string, ext: string): boolean => {
  try {
    return new URL(s).pathname.toLowerCase().endsWith(ext);
  } catch {
    return false;
  }
};

/** Read and check one BIMI record. */
export function parseBimi(text: string): BimiRecord {
  const issues: BimiIssue[] = [];
  const tags: Record<string, string> = {};
  const parts = text
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p !== '');
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 1) {
      issues.push({ level: 'error', code: 'syntax' });
      continue;
    }
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    if (key in tags) issues.push({ level: 'error', code: 'duplicate-tag' });
    else tags[key] = value;
  }
  const first = parts[0]?.replace(/\s+/g, '') ?? '';
  if (first !== 'v=BIMI1') issues.push({ level: 'error', code: 'not-bimi' });

  // lps= and avp= are newer optional tags in the BIMI draft; anything else is ignored by receivers.
  for (const key of Object.keys(tags))
    if (!['v', 'l', 'a', 'lps', 'avp'].includes(key))
      issues.push({ level: 'warning', code: 'unknown-tag', value: key });

  const l = tags.l;
  const a = tags.a;
  const logo = l ? l : null;
  const cert = a && a.toLowerCase() !== 'self' ? a : null;
  const declined = l !== undefined && l === '' && (a === undefined || a === '');

  if (!declined) {
    if (logo) {
      const urls = logo.split(',').map((u) => u.trim());
      if (urls.length > 1) issues.push({ level: 'warning', code: 'logo-list', value: logo });
      const url = urls[0]!;
      if (!isHttpsUrl(url)) issues.push({ level: 'error', code: 'logo-not-https', value: url });
      else if (!pathEnds(url, '.svg'))
        issues.push({ level: 'warning', code: 'logo-not-svg', value: url });
    }
    if (cert) {
      if (!isHttpsUrl(cert)) issues.push({ level: 'error', code: 'cert-not-https', value: cert });
      else if (!pathEnds(cert, '.pem'))
        issues.push({ level: 'warning', code: 'cert-not-pem', value: cert });
    }
    if (a !== undefined && a.toLowerCase() === 'self')
      issues.push({ level: 'warning', code: 'cert-self' });
    if (l === undefined) issues.push({ level: 'error', code: 'no-l-tag' });
    else if (!logo && !cert) issues.push({ level: 'error', code: 'no-location' });
    else if (!logo) issues.push({ level: 'warning', code: 'no-logo' });
    else if (!cert && a?.toLowerCase() !== 'self')
      issues.push({ level: 'warning', code: 'no-cert' });
  }

  const state: BimiState = issues.some((i) => i.level === 'error')
    ? 'invalid'
    : declined
      ? 'declined'
      : issues.length
        ? 'warnings'
        : 'valid';
  return { tags, logo, cert, issues, state };
}

/** The TXT strings at a BIMI name that are BIMI records (start with `v=BIMI1`). */
export const bimiRecords = (texts: readonly string[]): string[] =>
  texts.filter((t) => /^\s*v\s*=\s*BIMI1\s*(;|$)/i.test(t));

export interface DmarcPolicy {
  /** The record text. */
  record: string;
  p: string | null;
  sp: string | null;
  pct: number;
}

/** Read a DMARC record (`v=DMARC1; p=…`). Returns null if the text is not one. */
export function parseDmarc(text: string): DmarcPolicy | null {
  if (!/^\s*v\s*=\s*DMARC1\s*(;|$)/i.test(text)) return null;
  const tags: Record<string, string> = {};
  for (const part of text.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue;
    tags[part.slice(0, eq).trim().toLowerCase()] = part
      .slice(eq + 1)
      .trim()
      .toLowerCase();
  }
  const pct = tags.pct === undefined ? 100 : Number(tags.pct);
  return {
    record: text,
    p: tags.p ?? null,
    sp: tags.sp ?? null,
    pct: Number.isFinite(pct) ? pct : 100,
  };
}

export type DmarcProblem = 'none' | 'weak-policy' | 'partial' | 'weak-subdomain';

/**
 * Whether a DMARC policy is strong enough for BIMI: `p=quarantine` or `p=reject`, applied to all
 * mail (`pct=100`), and a subdomain policy that is not `none`.
 */
export function dmarcProblems(policy: DmarcPolicy | null): DmarcProblem[] {
  if (!policy) return ['none'];
  const out: DmarcProblem[] = [];
  if (policy.p !== 'quarantine' && policy.p !== 'reject') out.push('weak-policy');
  if (policy.pct < 100) out.push('partial');
  if (policy.sp === 'none') out.push('weak-subdomain');
  return out;
}

export type GenerateError =
  | 'logo-empty'
  | 'logo-not-https'
  | 'logo-not-svg'
  | 'cert-not-https'
  | 'cert-not-pem'
  | 'selector-invalid';

export interface GeneratedRecord {
  name: string;
  value: string;
}

/** Build a BIMI record. An empty certificate address leaves `a=` empty. */
export function buildBimi(opts: {
  domain: string;
  selector: string;
  logo: string;
  cert: string;
}): Result<GeneratedRecord, GenerateError> {
  const selector = opts.selector.trim() || DEFAULT_SELECTOR;
  if (!isSelector(selector)) return fail('selector-invalid');
  const logo = opts.logo.trim();
  const cert = opts.cert.trim();
  if (!logo) return fail('logo-empty');
  if (!isHttpsUrl(logo)) return fail('logo-not-https');
  if (!pathEnds(logo, '.svg')) return fail('logo-not-svg');
  if (cert && !isHttpsUrl(cert)) return fail('cert-not-https');
  if (cert && !pathEnds(cert, '.pem')) return fail('cert-not-pem');
  return ok({
    name: bimiName(selector.toLowerCase(), opts.domain),
    value: `v=BIMI1; l=${logo}; a=${cert};`,
  });
}
