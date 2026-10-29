import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { noHorizontalScroll, watchProblems } from './support';

// IP and IPv6 tools, the email header analyser and the two Cloudflare DNS tools. The offline
// tools must make no requests at all. The Cloudflare tools are answered by page.route() mocks.

const DOH = 'https://cloudflare-dns.com/dns-query';
const CORS = { 'access-control-allow-origin': '*' };

const row = (page: Page, label: string) =>
  page
    .locator('.result-row')
    .filter({
      has: page.locator('dt', {
        hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    })
    .locator('.result-value');

test.describe('offline IP and IPv6 tools', () => {
  test('IP to Decimal converts both ways with no network use', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/ip-to-decimal');
    await page.locator('#net6-value').fill('192.168.1.1');
    await page.locator('#net6-value').press('Enter');
    await expect(row(page, 'Decimal')).toHaveText('3232235777');
    await page.locator('#net6-direction').selectOption('from');
    await page.locator('#net6-value').fill('3232235777');
    await page.locator('#net6-value').press('Enter');
    await expect(row(page, 'Dotted IPv4')).toHaveText('192.168.1.1');
    expect(problems).toEqual([]);
  });

  test('IPv6 range to CIDR and back, with a keyboard-only flow', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/ipv6-range-cidr');
    await page.locator('#net6-start').focus();
    await page.keyboard.type('2001:db8::');
    await page.keyboard.press('Tab');
    await expect(page.locator('#net6-end')).toBeFocused();
    await page.keyboard.type('2001:db8::ffff');
    await page.keyboard.press('Enter');
    await expect(row(page, 'CIDR blocks')).toHaveText('2001:db8::/112');
    expect(problems).toEqual([]);
  });

  test('an invalid IPv6 address moves focus to its field with a message', async ({ page }) => {
    await page.goto('/#/tool/ipv6-compression');
    await page.locator('#net6-value').fill('1::2::3');
    await page.getByRole('button', { name: 'Compress' }).click();
    await expect(page.locator('#net6-value')).toBeFocused();
    await expect(page.locator('#net6-value')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#net6-value-error')).toHaveText(
      'Use :: only once in an IPv6 address.',
    );
  });

  test('the local address generator produces a unique-local address', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/local-ipv6-generator');
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(row(page, 'Address')).toHaveText(/^fd[0-9a-f]{2}:/);
    expect(problems).toEqual([]);
  });
});

test.describe('email header analyser', () => {
  const HEADERS = [
    'Received: from smtp.example.org (smtp.example.org [203.0.113.5]) by mx.recipient.example with ESMTP; Mon, 20 Oct 2026 10:00:10 +0000',
    'Received: from laptop (unknown [192.0.2.44]) by smtp.example.org with ESMTPSA; Mon, 20 Oct 2026 09:59:50 +0000',
    'Authentication-Results: mx.recipient.example; spf=pass; dkim=pass; dmarc=fail',
    'From: "Alice" <alice@example.org>',
    'Reply-To: alice@other.example',
    'To: bob@recipient.example',
    'Subject: Quarterly report',
    '',
    'Body text.',
  ].join('\n');

  test('lists hops oldest first, flags a failed DMARC check, and sends nothing', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/email-header-analyzer');
    await page.locator('#mail-headers').fill(HEADERS);
    await page.getByRole('button', { name: 'Analyse headers' }).click();
    await expect(row(page, 'DMARC result')).toHaveText('fail');
    const hops = page.locator('.hop-table tbody tr');
    await expect(hops).toHaveCount(2);
    await expect(hops.first().locator('td').nth(1)).toHaveText('laptop');
    await expect(page.locator('.result-notes')).toContainText('DMARC did not pass');
    expect(problems).toEqual([]);
  });

  test('a long paste stays inside a phone-width screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/email-header-analyzer');
    const long = `Received: from ${'very-long-host-name-'.repeat(12)}.example (x [198.51.100.7]) by mx.example with ESMTP; Mon, 20 Oct 2026 10:00:10 +0000`;
    await page.locator('#mail-headers').fill(`${long}\nFrom: a@example.org`);
    await page.getByRole('button', { name: 'Analyse headers' }).click();
    await expect(row(page, 'From')).toHaveText('a@example.org');
    await noHorizontalScroll(page);
  });
});

test.describe('Cloudflare DNS tools', () => {
  test('IP to Hostname sends the reverse name only after the button', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const seen: string[] = [];
    await page.route(`${DOH}?**`, (route) => {
      seen.push(route.request().url());
      return route.fulfill({
        json: {
          Status: 0,
          Answer: [{ name: '8.8.8.8.in-addr.arpa.', type: 12, TTL: 300, data: 'dns.google.' }],
        },
        headers: CORS,
      });
    });
    await page.goto('/#/tool/ip-to-hostname');
    await page.waitForTimeout(200);
    expect(seen).toHaveLength(0);
    await page.locator('#rdns-ip').fill('8.8.8.8');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(row(page, 'Hostname (PTR)')).toHaveText('dns.google');
    expect(seen).toEqual([`${DOH}?name=8.8.8.8.in-addr.arpa&type=PTR`]);
    expect(problems).toEqual([`off-origin request: ${seen[0]}`]);
  });

  test('Domain to IP asks for A and AAAA records', async ({ page }) => {
    const seen: string[] = [];
    await page.route(`${DOH}?**`, (route) => {
      const url = route.request().url();
      seen.push(url);
      const v6 = url.includes('type=AAAA');
      return route.fulfill({
        json: {
          Status: 0,
          Answer: [
            {
              name: 'example.com.',
              type: v6 ? 28 : 1,
              TTL: 60,
              data: v6 ? '2001:db8::5' : '192.0.2.10',
            },
          ],
        },
        headers: CORS,
      });
    });
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/domain-to-ip');
    await page.locator('#d2i-domain').fill('example.com');
    await page.locator('#d2i-domain').press('Enter');
    await expect(row(page, 'IPv4 addresses (A)')).toHaveText('192.0.2.10');
    await expect(row(page, 'IPv6 addresses (AAAA)')).toHaveText('2001:db8::5');
    expect(seen).toHaveLength(2);
    await noHorizontalScroll(page);
  });

  test('works under the GitHub Pages sub-path', async ({ page }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    await page.goto(`${base}#/tool/ip-to-decimal`);
    await page.locator('#net6-value').fill('10.0.0.1');
    await page.locator('#net6-value').press('Enter');
    await expect(row(page, 'Decimal')).toHaveText('167772161');
    expect(problems).toEqual([]);
  });
});
