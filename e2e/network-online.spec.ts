import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { noHorizontalScroll, watchProblems } from './support';

// Online Network tools. Cloudflare is never contacted from CI: its two endpoints are
// answered by page.route() mocks (with the CORS header a cross-origin fetch needs), so these
// tests check the request the page makes, not Cloudflare's live behaviour. The latency check
// talks to the real preview server, which is the same origin as the page.

const TRACE_URL = 'https://1.1.1.1/cdn-cgi/trace';
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

test.describe('IP Lookup', () => {
  test('contacts Cloudflare only after the button, once, and shows the answer', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const seen: Array<{ url: string; headers: Record<string, string> }> = [];
    await page.route(TRACE_URL, async (route) => {
      seen.push({ url: route.request().url(), headers: route.request().headers() });
      await route.fulfill({
        body: 'fl=1\nh=1.1.1.1\nip=203.0.113.7\ncolo=DAC\nhttp=http/2\nloc=BD\ntls=TLSv1.3\n',
        headers: { ...CORS, 'content-type': 'text/plain' },
      });
    });
    await page.goto('/#/tool/my-ip-info');
    await expect(page.locator('.net-notice')).toContainText(TRACE_URL);
    await expect(page.locator('.tool-badges')).toContainText('Uses the internet when you ask');
    await page.waitForTimeout(300);
    expect(seen).toHaveLength(0);

    await page.getByRole('button', { name: 'Show my IP' }).press('Enter');
    await expect(row(page, 'Public IP address')).toHaveText('203.0.113.7');
    await expect(row(page, 'Cloudflare data centre')).toHaveText('DAC');
    await expect(page.getByRole('status').filter({ hasText: 'Done' })).toHaveText(
      'Done. Cloudflare answered.',
    );
    expect(seen).toHaveLength(1);
    // No cookies and no page address go to Cloudflare.
    expect(seen[0]!.headers.cookie).toBeUndefined();
    expect(seen[0]!.headers.referer).toBeUndefined();
    expect(problems).toEqual([`off-origin request: ${TRACE_URL}`]);
  });

  test('shows a clear error when the request is blocked', async ({ page }) => {
    await page.route(TRACE_URL, (route) => route.abort('blockedbyclient'));
    await page.goto('/#/tool/my-ip-info');
    await page.getByRole('button', { name: 'Show my IP' }).click();
    await expect(page.getByRole('alert')).toContainText('could not be completed');
    await expect(page.locator('.result-list')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Show my IP' })).toBeEnabled();
  });
});

test.describe('DNS Lookup', () => {
  test('sends only the domain and type to Cloudflare DoH and shows the records', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const seen: Array<{ url: string; accept?: string }> = [];
    await page.route(`${DOH}?**`, async (route) => {
      seen.push({ url: route.request().url(), accept: route.request().headers().accept });
      await route.fulfill({
        json: {
          Status: 0,
          AD: true,
          Answer: [
            { name: 'example.com.', type: 16, TTL: 300, data: '"v=spf1 -all"' },
            {
              name: 'example.com.',
              type: 16,
              TTL: 300,
              data: '"a-very-long-verification-token-that-must-wrap-on-small-screens-0123456789abcdef"',
            },
          ],
        },
        headers: CORS,
      });
    });
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/dns-lookup');
    await page.locator('#dns-domain').fill('Example.com');
    await page.locator('#dns-type').selectOption('TXT');
    await page.locator('#dns-domain').press('Enter');
    await expect(row(page, 'Records found')).toHaveText('2');
    await expect(row(page, 'DNSSEC validated by Cloudflare')).toHaveText('Yes');
    await expect(page.locator('.dns-table tbody tr')).toHaveCount(2);
    await expect(page.locator('.dns-table tbody tr').first()).toContainText('"v=spf1 -all"');
    expect(seen).toEqual([
      { url: `${DOH}?name=example.com&type=TXT`, accept: 'application/dns-json' },
    ]);
    expect(problems).toEqual([`off-origin request: ${DOH}?name=example.com&type=TXT`]);
    await noHorizontalScroll(page);
  });

  test('refuses an invalid domain without sending anything', async ({ page }) => {
    let calls = 0;
    await page.route(`${DOH}?**`, (route) => {
      calls++;
      return route.abort();
    });
    await page.goto('/#/tool/dns-lookup');
    await page.locator('#dns-domain').fill('not a domain');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.locator('#dns-domain')).toBeFocused();
    await expect(page.locator('#dns-domain-error')).toHaveText(
      'Enter a valid domain name such as example.com.',
    );
    expect(calls).toBe(0);
  });

  test('works in Bangla and dark mode', async ({ page }) => {
    await page.route(`${DOH}?**`, (route) => route.fulfill({ json: { Status: 3 }, headers: CORS }));
    await page.goto('/#/tool/dns-lookup');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.net-notice')).toContainText('cloudflare-dns.com');
    await page.locator('#dns-domain').fill('nope.example');
    await page.getByRole('button', { name: 'খুঁজুন' }).click();
    await expect(row(page, 'উত্তর')).toHaveText('NXDOMAIN — এই ডোমেইনটি নেই');
  });
});

test.describe('Latency & Packet-Loss Check', () => {
  test('times real same-origin requests and contacts no one else', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const probes: string[] = [];
    page.on('request', (r) => r.url().includes('latency-probe') && probes.push(r.url()));
    await page.goto('/#/tool/latency-test');
    await expect(page.locator('.net-notice')).toContainText('No third party is contacted');
    await expect(page.locator('.net-notice')).toContainText('not ICMP ping');
    expect(probes).toHaveLength(0);
    await page.locator('#latency-count').selectOption('5');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Done' })).toHaveText(
      'Done. 5 requests sent.',
      { timeout: 20_000 },
    );
    await expect(row(page, 'Failed requests')).toHaveText('0 of 5 (0%)');
    await expect(row(page, 'Average round-trip time')).toHaveText(/^\d+\.\d ms$/);
    expect(probes).toHaveLength(6); // warm-up + 5
    expect(new Set(probes).size).toBe(6);
    expect(problems).toEqual([]);
    await expect(page.getByRole('button', { name: 'Start' })).toBeFocused();
  });

  test('counts failed requests', async ({ page }) => {
    let n = 0;
    await page.route('**/latency-probe.txt?**', (route) =>
      ++n === 3 ? route.abort('failed') : route.continue(),
    );
    await page.goto('/#/tool/latency-test');
    await page.locator('#latency-count').selectOption('5');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(row(page, 'Failed requests')).toHaveText('1 of 5 (20%)', { timeout: 20_000 });
    await expect(row(page, 'Each request (ms)')).toContainText('failed');
  });

  test('works under the GitHub Pages sub-path', async ({ page }) => {
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    const probes: string[] = [];
    page.on('request', (r) => r.url().includes('latency-probe') && probes.push(r.url()));
    await page.goto(`${base}#/tool/latency-test`);
    await page.locator('#latency-count').selectOption('5');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(row(page, 'Failed requests')).toHaveText('0 of 5 (0%)', { timeout: 20_000 });
    for (const p of probes) expect(new URL(p).pathname).toBe(`${SUBPATH}latency-probe.txt`);
    expect(problems).toEqual([]);
  });
});
