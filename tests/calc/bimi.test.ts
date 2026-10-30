import { describe, expect, it } from 'vitest';
import {
  bimiName,
  bimiRecords,
  buildBimi,
  dmarcProblems,
  isSelector,
  parseBimi,
  parseDmarc,
  txtValue,
} from '../../src/calc/bimi';

const LOGO = 'https://example.com/brand/logo.svg';
const VMC = 'https://example.com/brand/vmc.pem';

describe('txtValue', () => {
  it('joins quoted strings and undoes escapes', () => {
    expect(txtValue('"v=BIMI1; l=https://a.example/x.svg"')).toBe(
      'v=BIMI1; l=https://a.example/x.svg',
    );
    expect(txtValue('"v=BIMI1; l=https://a.exa" "mple/x.svg; a=;"')).toBe(
      'v=BIMI1; l=https://a.example/x.svg; a=;',
    );
    expect(txtValue('"say \\"hi\\" \\\\ \\059"')).toBe('say "hi" \\ ;');
    expect(txtValue('plain text')).toBe('plain text');
  });
});

describe('parseBimi', () => {
  it('accepts a complete record', () => {
    const r = parseBimi(`v=BIMI1; l=${LOGO}; a=${VMC};`);
    expect(r).toMatchObject({ state: 'valid', logo: LOGO, cert: VMC, issues: [] });
  });

  it('accepts newer optional tags and spaces around separators', () => {
    expect(parseBimi(`v=BIMI1 ;l = ${LOGO} ; a=${VMC}; avp=brand`).state).toBe('valid');
  });

  it('warns when there is no mark certificate', () => {
    const r = parseBimi(`v=BIMI1; l=${LOGO}`);
    expect(r.state).toBe('warnings');
    expect(r.issues).toEqual([{ level: 'warning', code: 'no-cert' }]);
    expect(parseBimi(`v=BIMI1; l=${LOGO}; a=self`).issues).toEqual([
      { level: 'warning', code: 'cert-self' },
    ]);
  });

  it('recognises a declination record', () => {
    expect(parseBimi('v=BIMI1; l=; a=;').state).toBe('declined');
    expect(parseBimi('v=BIMI1; l=').state).toBe('declined');
  });

  it.each([
    ['v=bimi1; l=' + LOGO, 'not-bimi'],
    ['l=' + LOGO + '; v=BIMI1', 'not-bimi'],
    ['v=BIMI1; a=' + VMC, 'no-l-tag'],
    [`v=BIMI1; l=${LOGO}; l=${LOGO}`, 'duplicate-tag'],
    [`v=BIMI1; l=http://example.com/logo.svg`, 'logo-not-https'],
    [`v=BIMI1; l=${LOGO}; a=http://example.com/vmc.pem`, 'cert-not-https'],
    [`v=BIMI1; l=${LOGO}; junk`, 'syntax'],
  ])('%s has the problem %s', (text, code) => {
    const r = parseBimi(text);
    expect(r.state).toBe('invalid');
    expect(r.issues.map((i) => i.code)).toContain(code);
  });

  it('warns about non-SVG logos, non-PEM certificates, lists and unknown tags', () => {
    const codes = (t: string) => parseBimi(t).issues.map((i) => i.code);
    expect(codes(`v=BIMI1; l=https://example.com/logo.png; a=${VMC}`)).toEqual(['logo-not-svg']);
    expect(codes(`v=BIMI1; l=${LOGO}; a=https://example.com/vmc.crt`)).toEqual(['cert-not-pem']);
    expect(codes(`v=BIMI1; l=${LOGO},${LOGO}; a=${VMC}`)).toEqual(['logo-list']);
    expect(codes(`v=BIMI1; l=${LOGO}; a=${VMC}; x=1`)).toEqual(['unknown-tag']);
    expect(codes(`v=BIMI1; l=; a=${VMC}`)).toEqual(['no-logo']);
  });
});

describe('bimiRecords', () => {
  it('keeps only BIMI records', () => {
    expect(bimiRecords(['v=spf1 -all', `v=BIMI1; l=${LOGO}`, 'v=BIMI1'])).toEqual([
      `v=BIMI1; l=${LOGO}`,
      'v=BIMI1',
    ]);
    expect(bimiRecords(['v=BIMI10; l=x'])).toEqual([]);
  });
});

describe('DMARC', () => {
  it('reads the policy, defaulting pct to 100', () => {
    expect(parseDmarc('v=DMARC1; p=reject; rua=mailto:d@example.com')).toMatchObject({
      p: 'reject',
      sp: null,
      pct: 100,
    });
    expect(parseDmarc('v=spf1 -all')).toBeNull();
  });

  it('says whether the policy is strong enough for BIMI', () => {
    const problems = (t: string | null) => dmarcProblems(t === null ? null : parseDmarc(t));
    expect(problems('v=DMARC1; p=quarantine')).toEqual([]);
    expect(problems('v=DMARC1; p=reject; sp=quarantine; pct=100')).toEqual([]);
    expect(problems('v=DMARC1; p=none')).toEqual(['weak-policy']);
    expect(problems('v=DMARC1; p=reject; pct=50')).toEqual(['partial']);
    expect(problems('v=DMARC1; p=reject; sp=none')).toEqual(['weak-subdomain']);
    expect(problems(null)).toEqual(['none']);
  });
});

describe('buildBimi', () => {
  it('builds the record name and value', () => {
    expect(buildBimi({ domain: 'example.com', selector: '', logo: LOGO, cert: VMC })).toEqual({
      ok: true,
      value: { name: 'default._bimi.example.com', value: `v=BIMI1; l=${LOGO}; a=${VMC};` },
    });
    expect(buildBimi({ domain: 'example.com', selector: 'Brand2', logo: LOGO, cert: '' })).toEqual({
      ok: true,
      value: { name: 'brand2._bimi.example.com', value: `v=BIMI1; l=${LOGO}; a=;` },
    });
  });

  it('round-trips through the checker', () => {
    const r = buildBimi({ domain: 'example.com', selector: 'default', logo: LOGO, cert: VMC });
    if (!r.ok) throw new Error(r.error);
    expect(parseBimi(r.value.value).state).toBe('valid');
  });

  it.each([
    [{ logo: '' }, 'logo-empty'],
    [{ logo: 'http://example.com/l.svg' }, 'logo-not-https'],
    [{ logo: 'https://example.com/l.png' }, 'logo-not-svg'],
    [{ cert: 'ftp://example.com/v.pem' }, 'cert-not-https'],
    [{ cert: 'https://example.com/v.crt' }, 'cert-not-pem'],
    [{ selector: '-bad' }, 'selector-invalid'],
    [{ selector: 'a.b' }, 'selector-invalid'],
  ])('%o → %s', (over, error) => {
    expect(
      buildBimi({ domain: 'example.com', selector: 'default', logo: LOGO, cert: '', ...over }),
    ).toEqual({ ok: false, error });
  });

  it('names the record and checks selectors', () => {
    expect(bimiName('default', 'example.com')).toBe('default._bimi.example.com');
    expect(isSelector('brand_2')).toBe(true);
    expect(isSelector('bad-')).toBe(false);
  });
});
