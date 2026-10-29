import { describe, expect, it } from 'vitest';
import {
  addressOf,
  analyzeHeaders,
  MAX_HEADER_CHARS,
  parseHeaderBlock,
  parseReceived,
} from '../../src/calc/emailHeaders';

// Oldest hop first in the output; the newest Received line is first in the text.
const MESSAGE = [
  'Return-Path: <bounce@mailer.example.org>',
  'Received: from mx.recipient.example (mx.recipient.example [198.51.100.9])',
  '\tby inbox.local with ESMTPS id 123; Mon, 20 Oct 2026 10:00:45 +0000',
  'Received: from smtp.example.org (smtp.example.org [203.0.113.5])',
  '  by mx.recipient.example with ESMTP id 456; Mon, 20 Oct 2026 10:00:10 +0000',
  'Received: from laptop (unknown [192.0.2.44]) by smtp.example.org with ESMTPSA; Mon, 20 Oct 2026 09:59:50 +0000',
  'Authentication-Results: inbox.local; spf=pass smtp.mailfrom=example.org;',
  ' dkim=pass header.d=example.org; dmarc=fail header.from=example.org',
  'DKIM-Signature: v=1; a=rsa-sha256; d=example.org; s=mail; b=abc',
  'From: "Alice Example" <alice@example.org>',
  'To: Bob <bob@recipient.example>',
  'Reply-To: alice@other.example',
  'Subject: Quarterly report',
  'Date: Mon, 20 Oct 2026 09:59:49 +0000',
  'Message-ID: <abc@example.org>',
  '',
  'Body text that must be ignored.',
  'From: attacker@ignored.example',
].join('\n');

describe('parseHeaderBlock', () => {
  it('joins folded lines and stops at the blank line', () => {
    const fields = parseHeaderBlock(MESSAGE);
    const auth = fields.find((f) => f.name === 'authentication-results');
    expect(auth?.value).toBe(
      'inbox.local; spf=pass smtp.mailfrom=example.org; dkim=pass header.d=example.org; dmarc=fail header.from=example.org',
    );
    expect(fields.some((f) => f.value.includes('attacker'))).toBe(false);
  });

  it('accepts CRLF line endings and ignores lines that are not fields', () => {
    const fields = parseHeaderBlock('Subject: Hi\r\nnot a field\r\nTo: x@y.z\r\n');
    expect(fields.map((f) => f.name)).toEqual(['subject', 'to']);
  });
});

describe('parseReceived', () => {
  it('reads from, by, with, the bracketed IP and the date', () => {
    const r = parseReceived(
      'from smtp.example.org (smtp.example.org [203.0.113.5]) by mx.recipient.example with ESMTP id 456; Mon, 20 Oct 2026 10:00:10 +0000',
    );
    expect(r).toEqual({
      from: 'smtp.example.org',
      by: 'mx.recipient.example',
      with: 'ESMTP',
      ip: '203.0.113.5',
      time: Date.parse('Mon, 20 Oct 2026 10:00:10 +0000'),
    });
  });

  it('copes with a missing date and missing parts', () => {
    expect(parseReceived('by local')).toEqual({
      from: null,
      by: 'local',
      with: null,
      ip: null,
      time: null,
    });
  });
});

describe('addressOf', () => {
  it('reads the address from display-name forms and bare addresses', () => {
    expect(addressOf('"Alice Example" <alice@example.org>')).toBe('alice@example.org');
    expect(addressOf('bob@example.net')).toBe('bob@example.net');
    expect(addressOf('no address here')).toBeNull();
    expect(addressOf(undefined)).toBeNull();
  });
});

describe('analyzeHeaders', () => {
  it('summarises the message and lists hops in travel order with delays', () => {
    const r = analyzeHeaders(MESSAGE);
    if (!r.ok) throw new Error(r.error);
    const a = r.value;
    expect(a.from).toBe('alice@example.org');
    expect(a.fromDomain).toBe('example.org');
    expect(a.to).toBe('bob@recipient.example');
    expect(a.subject).toBe('Quarterly report');
    expect(a.messageId).toBe('<abc@example.org>');
    expect(a.dkimSigned).toBe(true);
    expect(a.auth).toEqual({ spf: 'pass', dkim: 'pass', dmarc: 'fail' });

    expect(a.hops.map((h) => h.from)).toEqual([
      'laptop',
      'smtp.example.org',
      'mx.recipient.example',
    ]);
    expect(a.hops.map((h) => h.ip)).toEqual(['192.0.2.44', '203.0.113.5', '198.51.100.9']);
    expect(a.hops.map((h) => h.delaySeconds)).toEqual([null, 20, 35]);
  });

  it('flags failed authentication and mismatched sender domains', () => {
    const r = analyzeHeaders(MESSAGE);
    if (!r.ok) throw new Error(r.error);
    expect(r.value.warnings).toEqual(
      expect.arrayContaining([
        'dmarc-not-pass',
        'return-path-domain-differs',
        'reply-to-domain-differs',
      ]),
    );
    expect(r.value.warnings).not.toContain('spf-not-pass');
  });

  it('reports clock skew when a later hop is stamped earlier', () => {
    const text = [
      'Received: from b by c; Mon, 20 Oct 2026 10:00:00 +0000',
      'Received: from a by b; Mon, 20 Oct 2026 09:00:00 +0000',
      'From: x@y.example',
    ].join('\n');
    const r = analyzeHeaders(text);
    if (!r.ok) throw new Error(r.error);
    // Oldest first: the 09:00 hop is first, then 10:00. Only a backwards step is skew.
    expect(r.value.hops.map((h) => h.delaySeconds)).toEqual([null, 3600]);
    expect(r.value.warnings).toEqual(['no-auth-results']);
  });

  it('warns when there is no routing or authentication information', () => {
    const r = analyzeHeaders('Subject: Only a subject');
    if (!r.ok) throw new Error(r.error);
    expect(r.value.warnings).toEqual(['from-missing', 'no-received', 'no-auth-results']);
  });

  it('refuses empty, oversized and non-header input', () => {
    expect(analyzeHeaders('   ')).toEqual({ ok: false, error: 'empty' });
    expect(analyzeHeaders('x'.repeat(MAX_HEADER_CHARS + 1))).toEqual({
      ok: false,
      error: 'too-long',
    });
    expect(analyzeHeaders('just some words')).toEqual({ ok: false, error: 'no-headers' });
  });
});
