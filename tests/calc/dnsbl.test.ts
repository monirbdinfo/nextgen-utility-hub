import { describe, expect, it } from 'vitest';
import { BLOCKLISTS, classifyAnswer, dnsblName } from '../../src/calc/dnsbl';
import type { DnsResult } from '../../src/calc/netDiag';

const res = (status: number, a: string[] = []): DnsResult => ({
  status,
  statusName: status === 2 ? 'SERVFAIL' : status === 3 ? 'NXDOMAIN' : 'NOERROR',
  answers: a.map((data) => ({ name: 'x', type: 'A', ttl: 60, data })),
  authenticated: false,
});

describe('DNS blocklists', () => {
  it('builds the reversed query name', () => {
    expect(dnsblName(0x01020304, 'bl.spamcop.net')).toBe('4.3.2.1.bl.spamcop.net');
  });

  it('names exactly the lists that are checked', () => {
    expect(BLOCKLISTS.map((b) => b.zone)).toEqual([
      'zen.spamhaus.org',
      'bl.spamcop.net',
      'psbl.surriel.com',
      'dnsbl.dronebl.org',
      'bl.mailspike.net',
    ]);
  });

  it('treats NXDOMAIN and an empty answer as not listed', () => {
    expect(classifyAnswer(res(3))).toEqual({ kind: 'not-listed' });
    expect(classifyAnswer(res(0))).toEqual({ kind: 'not-listed' });
  });

  it('reports 127.0.0.x listings with their codes', () => {
    expect(classifyAnswer(res(0, ['127.0.0.2', '127.0.0.10']))).toEqual({
      kind: 'listed',
      codes: ['127.0.0.2', '127.0.0.10'],
    });
  });

  it('never reports a refusal or an odd answer as a listing', () => {
    expect(classifyAnswer(res(0, ['127.255.255.254'])).kind).toBe('refused');
    expect(classifyAnswer(res(0, ['127.255.255.255'])).kind).toBe('refused');
    expect(classifyAnswer(res(0, ['127.0.0.1'])).kind).toBe('unexpected');
    expect(classifyAnswer(res(0, ['93.184.215.14'])).kind).toBe('unexpected');
    expect(classifyAnswer(res(2))).toEqual({ kind: 'no-answer', status: 'SERVFAIL' });
  });
});
