import { expect, test, type Page } from '@playwright/test';
import { SUBPATH, SUBPATH_PORT } from '../playwright.config';
import { noHorizontalScroll, watchProblems } from './support';
import { CREATED, PING_DONE, TRACE_DONE } from '../tests/fixtures/globalping';
import { BOOTSTRAP_DNS, VERISIGN_DOMAIN } from '../tests/fixtures/rdap';

// Ping / Traceroute (Globalping), What Is My ISP / IP Location / IP Blacklist (Team Cymru and
// DNS blocklists through Cloudflare DoH), BIN Checker (offline) and Domain Name Search (RDAP).
// page.route() answers every external request, so these tests check what the page sends and
// how it presents the answer. They do not show that the live services accept these requests.

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, POST',
};
const GLOBALPING = 'https://api.globalping.io/';
const DOH = 'https://cloudflare-dns.com/dns-query';
const TRACE = 'https://1.1.1.1/cdn-cgi/trace';
const EXTERNAL = [GLOBALPING, DOH, TRACE, 'https://data.iana.org/', 'https://rdap.'];
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

async function mockGlobalping(page: Page, done: unknown): Promise<string[]> {
  const sent: string[] = [];
  await page.route(`${GLOBALPING}**`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (req.method() === 'POST') {
      sent.push(req.postData() ?? '');
      return route.fulfill({ status: 202, json: CREATED, headers: CORS });
    }
    return route.fulfill({ json: done, headers: CORS });
  });
  return sent;
}

async function mockDns(page: Page, records: Record<string, string[]>): Promise<string[]> {
  const asked: string[] = [];
  const codes: Record<string, number> = { A: 1, TXT: 16 };
  await page.route(TRACE, (route) =>
    route.fulfill({ body: 'ip=8.8.8.8\nloc=US\n', headers: CORS }),
  );
  await page.route(`${DOH}?**`, async (route) => {
    const u = new URL(route.request().url());
    const type = u.searchParams.get('type')!;
    const key = `${u.searchParams.get('name')} ${type}`;
    asked.push(key);
    const data = records[key];
    await route.fulfill({
      json: {
        Status: data ? 0 : 3,
        Answer: (data ?? []).map((d) => ({ name: 'x.', type: codes[type], TTL: 60, data: d })),
      },
      headers: CORS,
    });
  });
  return asked;
}

const CYMRU = {
  '8.8.8.8.origin.asn.cymru.com TXT': ['"15169 | 8.8.8.0/24 | US | arin | 2023-12-28"'],
  'AS15169.asn.cymru.com TXT': ['"15169 | US | arin | 2000-03-30 | GOOGLE, US"'],
};

test.describe('Ping and Traceroute (Globalping)', () => {
  test('sends the target only after the button and shows each probe', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const sent = await mockGlobalping(page, PING_DONE);
    await page.goto('/#/tool/ping-ipv4');
    await expect(page.locator('.net-notice')).toContainText('not from your own device');
    await page.locator('#ping4-target').fill('example.com');
    await page.waitForTimeout(200);
    expect(sent).toEqual([]);
    await page.locator('#ping4-location').selectOption('Bangladesh');
    await page.locator('#ping4-target').press('Enter');
    await expect(row(page, 'Probes')).toHaveText('1 finished, 0 failed, of 1');
    await expect(page.locator('.gp-probe')).toContainText('11.5 / 12.3 / 13.2 ms');
    expect(sent.map((s) => JSON.parse(s))).toEqual([
      {
        type: 'ping',
        target: 'example.com',
        locations: [{ magic: 'Bangladesh', limit: 1 }],
        measurementOptions: { packets: 3, ipVersion: 4 },
      },
    ]);
    expect(offSite(problems)).toEqual([]);
  });

  test('traceroute shows a hop table, keyboard-reachable raw output', async ({ page }) => {
    await mockGlobalping(page, TRACE_DONE);
    await page.goto('/#/tool/traceroute');
    await page.locator('#trace-target').fill('8.8.8.8');
    await page.getByRole('button', { name: 'Run traceroute' }).click();
    await expect(page.locator('.gp-probe tbody tr')).toHaveCount(3);
    await expect(page.locator('.gp-probe tbody tr').nth(1)).toContainText('* (no answer)');
    await page.locator('.gp-raw summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.gp-raw pre')).toBeVisible();
  });

  test('a blocked service is explained, not faked', async ({ page }) => {
    await page.route(`${GLOBALPING}**`, (route) => route.abort('blockedbyclient'));
    await page.goto('/#/tool/ping-ipv6');
    await page.locator('#ping6-target').fill('2001:4860:4860::8888');
    await page.getByRole('button', { name: 'Run ping' }).click();
    await expect(page.getByRole('alert')).toContainText('Globalping could not be reached');
    await expect(page.locator('.gp-probe')).toHaveCount(0);
  });

  test('works in Bangla, dark mode, at phone width and under the sub-path', async ({ page }) => {
    await mockGlobalping(page, PING_DONE);
    const base = `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`;
    const problems = watchProblems(page, new URL(base).origin);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`${base}#/tool/ping-ipv4`);
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.getByRole('button', { name: 'Switch language to Bangla' }).click();
    await page.locator('#ping4-target').fill('example.com');
    await page.getByRole('button', { name: 'পিং চালান' }).click();
    await expect(page.locator('.gp-probe')).toContainText('১১.৫ / ১২.৩ / ১৩.২ ms');
    await noHorizontalScroll(page);
    expect(offSite(problems)).toEqual([]);
  });
});

test.describe('ISP, IP location and blacklist (Cloudflare DNS)', () => {
  test('What Is My ISP asks Cloudflare, then Team Cymru through DNS', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const asked = await mockDns(page, CYMRU);
    await page.goto('/#/tool/my-isp');
    await page.waitForTimeout(200);
    expect(asked).toEqual([]);
    await page.getByRole('button', { name: 'Find my ISP' }).click();
    await expect(row(page, 'Network (AS name)')).toHaveText('GOOGLE, US');
    await expect(row(page, 'Your public IP address (IPv4)')).toHaveText('8.8.8.8');
    expect(asked).toEqual(['8.8.8.8.origin.asn.cymru.com TXT', 'AS15169.asn.cymru.com TXT']);
    expect(offSite(problems)).toEqual([]);
  });

  test('IP Location shows the registered country and says it is not a location', async ({
    page,
  }) => {
    await mockDns(page, CYMRU);
    await page.goto('/#/tool/ip-location-lookup');
    await page.locator('#iploc-address').fill('8.8.8.8');
    await page.locator('#iploc-address').press('Enter');
    await expect(row(page, 'Country the block is registered in')).toHaveText('US');
    await expect(page.locator('.tool-layout')).toContainText('This is not a physical location.');
  });

  test('IP Blacklist names every list and its result', async ({ page }) => {
    await mockDns(page, {
      '8.8.8.8.zen.spamhaus.org A': ['127.255.255.254'],
      '8.8.8.8.bl.spamcop.net A': ['127.0.0.2'],
    });
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/tool/ip-blacklist-check');
    await page.locator('#dnsbl-address').fill('8.8.8.8');
    await page.getByRole('button', { name: 'Check lists' }).click();
    await expect(row(page, 'Result')).toHaveText('Listed on 1 of the 4 lists that answered');
    await expect(page.locator('tr[data-verdict]')).toHaveCount(5);
    await expect(page.locator('tr[data-verdict="refused"]')).toContainText('Spamhaus ZEN');
    await noHorizontalScroll(page);
  });
});

test.describe('BIN Checker and Domain Name Search', () => {
  test('BIN Checker is offline and refuses a full card number', async ({ page, baseURL }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    await page.goto('/#/tool/bin-checker');
    const input = page.locator('#bin-bin');
    await input.fill('4111 1111 1111 1111');
    await expect(input).toHaveValue('4111 1111 1');
    await input.press('Enter');
    await expect(page.locator('#bin-bin-error')).toContainText('Do not enter a full card number');
    await input.fill('411111');
    await input.press('Enter');
    await expect(row(page, 'Card network')).toHaveText('Visa');
    await expect(row(page, 'Issuing bank')).toHaveText(
      'Not available: no approved BIN data source',
    );
    expect(problems).toEqual([]);
  });

  test('Domain Name Search reports registered, not found and unsupported TLDs', async ({
    page,
    baseURL,
  }) => {
    const problems = watchProblems(page, new URL(baseURL!).origin);
    const asked: string[] = [];
    for (const pattern of ['https://data.iana.org/**', /^https:\/\/rdap\./])
      await page.route(pattern, async (route) => {
        const url = route.request().url();
        asked.push(url);
        const body =
          url === 'https://data.iana.org/rdap/dns.json'
            ? BOOTSTRAP_DNS
            : url === 'https://rdap.verisign.com/com/v1/domain/example.com'
              ? VERISIGN_DOMAIN
              : null;
        await route.fulfill(
          body
            ? { json: body, headers: CORS }
            : { status: 404, json: { errorCode: 404 }, headers: CORS },
        );
      });
    await page.goto('/#/tool/domain-name-search');
    const name = page.locator('#domain-search-name');
    await name.fill('example.com');
    await page.waitForTimeout(200);
    expect(asked).toEqual([]);
    await name.press('Enter');
    await expect(row(page, 'Result')).toHaveText('Registered: this name is taken');
    await expect(row(page, 'Registrar')).toHaveText('Example Registrar, Inc.');
    await name.fill('free-name-123.com');
    await name.press('Enter');
    await expect(row(page, 'Result')).toHaveText('Not found in the registry: probably available');
    await name.fill('example.com.bd');
    await name.press('Enter');
    await expect(row(page, 'Result')).toHaveText('Unknown: the .bd registry does not offer RDAP');
    expect(asked).toEqual([
      'https://data.iana.org/rdap/dns.json',
      'https://rdap.verisign.com/com/v1/domain/example.com',
      'https://rdap.verisign.com/com/v1/domain/free-name-123.com',
    ]);
    // The registry's 404 is the expected "not found" answer; the browser also logs it.
    expect(
      offSite(problems).filter((p) => !p.startsWith('404 ') && !p.includes('status of 404')),
    ).toEqual([]);
  });
});
