import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { noHorizontalScroll, watchProblems } from './support';
import { ARIN_V4, APNIC_V6, BOOTSTRAP_V4, BOOTSTRAP_V6 } from '../tests/fixtures/rdap';

// IPv6 Compatibility Checker (Cloudflare DoH) and the IPv4/IPv6 WHOIS tools (IANA bootstrap +
// registry RDAP). No real service is contacted: page.route() answers every external request with
// the CORS header a cross-origin fetch needs, so these tests check what the page asks for and
// how it presents the answer, not the live services.

const DOH = 'https://cloudflare-dns.com/dns-query';
const CORS = { 'access-control-allow-origin': '*' };
const EXTERNAL = [DOH, 'https://data.iana.org/', 'https://rdap.'];
const offSite = (problems: string[]): string[] =>
  problems.filter((p) => !EXTERNAL.some((e) => p.startsWith(`off-origin request: ${e}`)));

const row = (page: Page, label: string) =>
  page
    .locator('.result-row')
    .filter({
      has: page.locator('dt', {
        hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    })
    .locator('.result-value');

async function mockDoh(page: Page, records: Record<string, string[]>): Promise<string[]> {
  const codes: Record<string, number> = { A: 1, NS: 2, MX: 15, AAAA: 28 };
  const asked: string[] = [];
  await page.route(`${DOH}?**`, async (route) => {
    const u = new URL(route.request().url());
    const key = `${u.searchParams.get('name')} ${u.searchParams.get('type')}`;
    asked.push(key);
    const data = records[key] ?? [];
    await route.fulfill({
      json: {
        Status: 0,
        Answer: data.map((d) => ({
          name: `${u.searchParams.get('name')}.`,
          type: codes[u.searchParams.get('type')!],
          TTL: 60,
          data: d,
        })),
      },
      headers: CORS,
    });
  });
  return asked;
}

async function mockRdap(page: Page): Promise<string[]> {
  const asked: string[] = [];
  const answers: Record<string, unknown> = {
    'https://data.iana.org/rdap/ipv4.json': BOOTSTRAP_V4,
    'https://data.iana.org/rdap/ipv6.json': BOOTSTRAP_V6,
    'https://rdap.arin.net/registry/ip/8.8.8.8': ARIN_V4,
    'https://rdap.apnic.net/ip/2404%3A6800%3A%3A1': APNIC_V6,
  };
  for (const pattern of ['https://data.iana.org/**', /^https:\/\/rdap\./])
    await page.route(pattern, async (route) => {
      const url = route.request().url();
      asked.push(url);
      const body = answers[url];
      await route.fulfill(
        body
          ? { json: body, headers: CORS }
          : { status: 404, json: { errorCode: 404 }, headers: CORS },
      );
    });
  return asked;
}

test.describe('IPv6 Compatibility Checker', () => {
  test('asks Cloudflare only after the button and keeps connectivity untested', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const asked = await mockDoh(page, {
      'example.com A': ['192.0.2.1'],
      'example.com AAAA': ['2001:db8::1'],
      'www.example.com A': ['192.0.2.1'],
      'www.example.com AAAA': ['2001:db8::1'],
      'example.com NS': ['ns1.example.net.'],
      'ns1.example.net AAAA': ['2001:db8::53'],
    });
    await page.goto('/#/tool/ipv6-compatibility');
    await page.locator('#v6c-domain').fill('example.com');
    await page.waitForTimeout(200);
    expect(asked).toEqual([]);
    await page.locator('#v6c-domain').press('Enter');
    await expect(row(page, 'IPv6 in DNS')).toHaveText(
      'Ready: the website, name servers and mail servers publish IPv6 addresses',
    );
    await expect(row(page, 'Mail servers with IPv6')).toHaveText('No mail servers (MX) published');
    await expect(row(page, 'Your browser’s IPv6 connection')).toHaveText('Not tested');
    await expect(row(page, 'Whether the site answers over IPv6')).toHaveText('Not tested');
    expect(asked).toHaveLength(7);
    expect(offSite(problems)).toEqual([]);
  });

  test('works in Bangla, dark mode and at phone width', async ({ page }) => {
    await mockDoh(page, { 'example.com A': ['192.0.2.1'] });
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/ipv6-compatibility');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await page.locator('#v6c-domain').fill('example.com');
    await page.getByRole('button', { name: 'IPv6 পরীক্ষা করুন' }).click();
    await expect(row(page, 'DNS-এ IPv6')).toHaveText(
      'প্রস্তুত নয়: কোনো IPv6 অ্যাড্রেস প্রকাশিত নেই',
    );
    await noHorizontalScroll(page);
  });
});

test.describe('IP WHOIS and IPv6 WHOIS (RDAP)', () => {
  test('IPv4: bootstrap, then the responsible registry, only after the button', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const asked = await mockRdap(page);
    await page.goto('/#/tool/ip-whois');
    await expect(page.locator('.net-notice')).toContainText('never looked up automatically');
    await expect(page.locator('#whois4-address')).toHaveValue('');
    await page.waitForTimeout(200);
    expect(asked).toEqual([]);
    await page.locator('#whois4-address').fill('8.8.8.8');
    await page.locator('#whois4-address').press('Enter');
    await expect(row(page, 'Registered network')).toHaveText('8.8.8.0 – 8.8.8.255');
    await expect(row(page, 'Source (authoritative registry)')).toHaveText(
      'https://rdap.arin.net/registry/ip/8.8.8.8',
    );
    expect(asked).toEqual([
      'https://data.iana.org/rdap/ipv4.json',
      'https://rdap.arin.net/registry/ip/8.8.8.8',
    ]);
    expect(offSite(problems).filter((p) => !p.startsWith('404 '))).toEqual([]);
  });

  test('IPv6 uses the same service; a missing record is explained', async ({ page }) => {
    await mockRdap(page);
    await page.goto('/#/tool/ipv6-whois');
    await page.locator('#whois6-address').fill('2404:6800::1');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(row(page, 'Country (as registered)')).toHaveText('BD');
    await page.locator('#whois6-address').fill('2404:6800::2');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'The registry has no record for this address.',
    );
  });

  test('a blocked registry and a private address are explained', async ({ page }) => {
    await page.route('https://data.iana.org/**', (route) => route.abort('blockedbyclient'));
    await page.goto('/#/tool/ip-whois');
    await page.locator('#whois4-address').fill('10.1.2.3');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.locator('#whois4-address-error')).toContainText('special-purpose');
    await page.locator('#whois4-address').fill('8.8.8.8');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.getByRole('alert')).toContainText('could not be completed');
  });

  test('works in Bangla, dark mode, at phone width and under the sub-path', async ({ page }) => {
    await mockRdap(page);
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`${base}#/tool/ip-whois`);
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await page.locator('#whois4-address').fill('8.8.8.8');
    await page.getByRole('button', { name: 'খুঁজুন' }).click();
    await expect(row(page, 'নেটওয়ার্কের নাম')).toHaveText('GOGL');
    await noHorizontalScroll(page);
    expect(offSite(problems)).toEqual([]);
  });
});
