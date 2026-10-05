import { test, expect, Page, BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { startStaticServer, StaticServer } from './utils/static-server';
import { setupUserWithBaseline } from './utils/test-helpers';

/**
 * README claim tests
 *
 * Each test below checks one claim from README.md, quoted in its name, so an
 * outside reviewer (or their AI assistant) can map claims to evidence:
 *
 *   npm run test:readme
 *
 * The app is served by a plain static file server (see utils/static-server.ts)
 * standing in for GitHub Pages, so every request the app makes is either
 * recorded by that server or caught by the browser-level checks below.
 */

const REPO_ROOT = path.resolve(__dirname, '../..');

// The one request the app makes outside its own site: reading the public
// version file on GitHub to see whether an update is available.
const VERSION_CHECK_URL =
  'https://raw.githubusercontent.com/betterlaterapp/betterlaterapp.github.io/refs/heads/main/sw_cached_pages.js';

// Third-party libraries, shipped in this repo (never loaded from elsewhere).
// They contain networking code they never use here; the runtime test proves
// nothing is sent, and the keyword test checks the app never calls into it.
const VENDOR_FILES = [
  'assets/js/jquery-3.2.1.min.js',
  'assets/js/jquery-ui.min.js',
  'assets/js/bootstrap.min.js',
  'assets/js/popper.js',
  'assets/js/chartist.min.js',
  'assets/js/confetti.min.js',
];

// Pages a visitor can load
const HTML_PAGES = ['app/index.html', 'about/index.html', 'app.html'];

const DO_LESS_BASELINE = {
  baseline: {
    specificSubject: true,
    doLess: true,
    doMore: false,
    doEqual: false,
    userSubmitted: true,
    valuesTimesDone: true,
    valuesTime: true,
    valuesMoney: true,
    valuesHealth: true,
    amountDonePerWeek: 10,
    goalDonePerWeek: 5,
    usageTimeline: 'week',
    amountSpentPerWeek: 50,
    goalSpentPerWeek: 20,
    spendingTimeline: 'week',
    currentTimeHours: 0,
    currentTimeMinutes: 0,
    goalTimeHours: 0,
    goalTimeMinutes: 0,
    timeTimeline: 'week',
    statusType: '',
    wellnessText: '',
    wellnessMood: 2,
  },
} as any;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

/** All first-party JavaScript and HTML a visitor's browser can run */
function firstPartyCodeFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true })) {
      const relative = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(relative);
      else if (/\.(js|html)$/.test(entry.name) && !VENDOR_FILES.includes(relative)) files.push(relative);
    }
  };
  ['app', 'about', 'assets/js'].forEach(walk);
  fs.readdirSync(REPO_ROOT)
    .filter(name => /\.(js|html)$/.test(name))
    .forEach(name => files.push(name));
  return files;
}

function stripHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

/** Whether a URL in a page points somewhere other than this site */
function isOffSite(url: string): boolean {
  return /^(https?:)?\/\//i.test(url.trim());
}

/** Answer the version check locally so tests never depend on the internet */
async function stubVersionCheck(context: BrowserContext): Promise<void> {
  await context.route(VERSION_CHECK_URL, route =>
    route.fulfill({ contentType: 'text/javascript', body: 'var version = "v0.0.0::pages";' })
  );
}

/** Wait until the service worker controls the page and has cached the app */
async function waitForOfflineCache(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(async () => {
    if (!navigator.serviceWorker.controller) return false;
    const required = ['/app/', '/app/app.js', '/app/js/storage.js', '/assets/js/jquery-3.2.1.min.js', '/app/app.css'];
    for (const url of required) {
      if (!(await caches.match(url))) return false;
    }
    return true;
  }), { timeout: 20000, message: 'service worker should cache the app on the first visit' }).toBe(true);
}

// ------------------------------------------------------------
// "Your Data Never Leaves Your Device"
// ------------------------------------------------------------

test.describe('README: "Your Data Never Leaves Your Device"', () => {
  // Block the service worker so every request the page makes is visible here
  // (the service worker only replays the page's own GET requests; the update
  // and offline tests below cover it).
  test.use({ serviceWorkers: 'block' });

  let server: StaticServer;
  test.beforeEach(async () => { server = await startStaticServer(REPO_ROOT); });
  test.afterEach(async () => { await server.close(); });

  test('using every feature sends none of your data anywhere, and nothing goes to third parties', async ({ page, context }) => {
    // Unique text typed into the app; it must never appear in any request
    const marker = 'zq' + Math.random().toString(36).slice(2, 10);
    const customUnit = marker + 'unit';
    const journalText = 'private note ' + marker;

    const browserRequests: { method: string; url: string; postData: string | null }[] = [];
    const blockedOffSite: string[] = [];
    const versionChecks: { method: string; postData: string | null }[] = [];
    const websockets: string[] = [];

    context.on('request', request => {
      browserRequests.push({ method: request.method(), url: request.url(), postData: request.postData() });
    });
    page.on('websocket', ws => websockets.push(ws.url()));
    await context.route('**/*', async route => {
      const request = route.request();
      const url = request.url();
      if (url.startsWith(server.origin + '/') || url.startsWith('data:') || url.startsWith('blob:')) {
        return route.continue();
      }
      if (url === VERSION_CHECK_URL) {
        versionChecks.push({ method: request.method(), postData: request.postData() });
        return route.fulfill({ contentType: 'text/javascript', body: 'var version = "v0.0.0::pages";' });
      }
      blockedOffSite.push(`${request.method()} ${url}`);
      return route.abort();
    });

    await setupUserWithBaseline(page, DO_LESS_BASELINE);
    await page.goto(server.origin + '/app/');
    await expect(page.locator('#use-button')).toBeVisible();

    // "Did it" with an amount in a custom unit
    await page.click('#use-button');
    await page.click('.use.log-more-info .use-dialog-tab[data-tab="how-much"]');
    await page.fill('.how-much-amount', '0.5');
    await page.selectOption('.how-much-unit-select', '__custom__');
    await page.fill('.how-much-custom-unit', customUnit);
    await page.click('.custom-unit-save-btn');
    await page.click('.use.log-more-info button.submit');
    await expect(page.locator('#use-total')).toHaveText('1');

    // Resisted, spent, and a journal entry
    await page.click('#crave-button');
    await page.click('#bought-button');
    await page.fill('#spentInput', '37');
    await page.click('.cost.log-more-info button.submit');
    await expect(page.locator('#bought-total')).toHaveText('1');

    await page.evaluate(() => $('.journal-tab-toggler').first().click());
    await page.fill('#mood-tracker-area textarea', journalText);
    await page.click('#mood-tracker-area .submit');

    // Charts in every view, the goals tab, and the about page
    await page.evaluate(() => $('.statistics-tab-toggler').first().click());
    for (const metric of ['usage', 'amount', 'time', 'cost']) {
      for (const period of ['day', 'week', 'month']) {
        await page.evaluate(([m, p]) => {
          $('#reportMetricFilter').val(m);
          $('#reportPeriodFilter').val(p).trigger('change');
        }, [metric, period]);
      }
    }
    await page.evaluate(() => $('.goals-tab-toggler').first().click());
    await page.goto(server.origin + '/about/');
    await page.goto(server.origin + '/app/');

    // Give anything delayed a chance to fire
    await page.waitForTimeout(3000);

    // The data is on the device...
    const stored = await page.evaluate(() => localStorage.getItem('esCrave') || '');
    expect(stored).toContain(customUnit);
    expect(stored).toContain(journalText);

    // ...and nowhere else
    expect(blockedOffSite, 'requests to anywhere other than this site or the GitHub version check').toEqual([]);
    expect(websockets, 'WebSocket connections').toEqual([]);

    for (const request of [...browserRequests]) {
      expect(['GET', 'HEAD'], `only downloads, never uploads: ${request.method} ${request.url}`).toContain(request.method);
      expect(request.url, 'request URLs never include your entries').not.toContain(marker);
      expect(request.postData || '', 'requests never carry your entries').not.toContain(marker);
    }
    for (const check of versionChecks) {
      expect(check.method).toBe('GET');
      expect(check.postData).toBeNull();
    }
    for (const received of server.requests) {
      expect(received.url).not.toContain(marker);
      expect(received.body).toBe('');
    }

    // No cookies of any kind
    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => document.cookie)).toBe('');
  });

  test('"Runs Entirely in Your Browser (No Server Backend)": a plain file server is all the app needs', async ({ page, context }) => {
    await stubVersionCheck(context);
    await setupUserWithBaseline(page, DO_LESS_BASELINE);
    await page.goto(server.origin + '/app/');
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await expect(page.locator('#use-total')).toHaveText('1');
    await page.reload();
    await expect(page.locator('#use-total')).toHaveText('1');

    // The server only ever handed out files; the app never sent it anything
    expect(server.requests.length).toBeGreaterThan(0);
    for (const received of server.requests) {
      expect(['GET', 'HEAD']).toContain(received.method);
      expect(received.body).toBe('');
    }
  });
});

// ------------------------------------------------------------
// "Verify this code doesn't send data anywhere" (keyword search)
// ------------------------------------------------------------

test.describe('README: "Verify this code doesn\'t send data anywhere"', () => {
  test('the only network calls in the app\'s own code are the version check and the offline cache', () => {
    const networkApis: [string, RegExp][] = [
      ['fetch', /\bfetch\s*\(/g],
      ['XMLHttpRequest', /XMLHttpRequest/g],
      ['WebSocket', /WebSocket/g],
      ['navigator.sendBeacon', /sendBeacon/g],
      ['EventSource', /EventSource/g],
      ['RTCPeerConnection', /RTCPeerConnection|RTCDataChannel/g],
      ['jQuery networking', /\$\.(ajax|get|post|getJSON|getScript)\s*\(|\.load\(\s*['"]/g],
      ['importScripts / dynamic import', /importScripts\s*\(|\bimport\s*\(/g],
      ['form submission to a server', /<form[^>]*\baction\s*=/gi],
      ['tracking pixel', /new\s+Image\s*\(/g],
    ];

    // Each allowed call, and why it's harmless
    const allowed: { file: string; code: string; reason: string }[] = [
      { file: 'sw_cached_pages.js', code: 'fetch(event.request)', reason: 'offline cache: re-requests the file the page asked for' },
      { file: 'assets/js/version.js', code: 'fetch(githubUrl)', reason: 'version check: downloads the public version file' },
      { file: 'app/index.html', code: `fetch('${VERSION_CHECK_URL}')`, reason: 'version check if the app fails to load' },
    ];

    const found: string[] = [];
    for (const file of firstPartyCodeFiles()) {
      const lines = readRepoFile(file).split('\n');
      lines.forEach((line, i) => {
        for (const [name, pattern] of networkApis) {
          pattern.lastIndex = 0;
          if (!pattern.test(line)) continue;
          const isAllowed = allowed.some(a => a.file === file && line.includes(a.code));
          if (!isAllowed) found.push(`${file}:${i + 1} uses ${name}: ${line.trim()}`);
        }
      });
    }
    expect(found, 'unexpected networking code').toEqual([]);

    // The version check reads exactly the public version file, with a plain GET
    expect(readRepoFile('assets/js/version.js')).toContain(`const githubUrl = '${VERSION_CHECK_URL}';`);
    for (const a of allowed) {
      expect(readRepoFile(a.file), `${a.file} still contains the reviewed call (${a.reason})`).toContain(a.code);
    }
  });

  test('"We load zero third-party scripts": every script, style, font, and image comes from this repo', () => {
    const offSite: string[] = [];
    const resourceAttributes =
      /<(script|link|img|iframe|source|video|audio|embed|object)\b[^>]*?\s(src|href|data)\s*=\s*["']([^"']+)["']/gi;

    for (const page of HTML_PAGES) {
      const html = stripHtmlComments(readRepoFile(page));
      for (const match of html.matchAll(resourceAttributes)) {
        const [, tag, , url] = match;
        if (isOffSite(url)) offSite.push(`${page}: <${tag}> loads ${url}`);
      }
    }

    // Stylesheets can load fonts and images too
    const cssFiles = ['app/app.css', 'about/about.css', 'assets/fonts/fonts.css'];
    for (const dir of ['assets/css', 'assets/icons/css']) {
      fs.readdirSync(path.join(REPO_ROOT, dir)).filter(f => f.endsWith('.css')).forEach(f => cssFiles.push(`${dir}/${f}`));
    }
    for (const file of cssFiles) {
      const css = readRepoFile(file).replace(/\/\*[\s\S]*?\*\//g, '');
      for (const match of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)) {
        const url = match[1] || match[2];
        if (isOffSite(url)) offSite.push(`${file} loads ${url}`);
      }
    }

    expect(offSite).toEqual([]);
  });
});

// ------------------------------------------------------------
// "No Account, No Email, No Phone Number"
// ------------------------------------------------------------

test.describe('README: "No Account, No Email, No Phone Number"', () => {
  test('no page asks for an email, phone number, password, or account', () => {
    const problems: string[] = [];
    for (const page of HTML_PAGES) {
      const html = stripHtmlComments(readRepoFile(page));
      for (const match of html.matchAll(/<(input|textarea|select)\b[^>]*>/gi)) {
        const tag = match[0];
        if (/type\s*=\s*["'](email|tel|password)["']/i.test(tag)) problems.push(`${page}: ${tag}`);
        if (/(name|id|placeholder|autocomplete)\s*=\s*["'][^"']*(e-?mail|phone|password|username|log ?in|sign ?up)/i.test(tag)) {
          problems.push(`${page}: ${tag}`);
        }
      }
      if (/(create an account|sign up|log in|sign in)\b/i.test(html.replace(/<[^>]+>/g, ' '))) {
        problems.push(`${page}: mentions signing up or logging in`);
      }
    }
    expect(problems).toEqual([]);
  });
});

// ------------------------------------------------------------
// Offline use and update control (service worker running, as on the live site)
// ------------------------------------------------------------

test.describe('README: offline use and update control', () => {
  let server: StaticServer;
  test.beforeEach(async ({ context }) => {
    server = await startStaticServer(REPO_ROOT);
    await stubVersionCheck(context);
  });
  test.afterEach(async () => { await server.close(); });

  test('"After having visited Better Later at least once, put your phone in airplane mode... use it normally"', async ({ page }) => {
    await setupUserWithBaseline(page, DO_LESS_BASELINE);

    // One visit, online
    await page.goto(server.origin + '/app/');
    await waitForOfflineCache(page);

    // Offline: the site can't be reached at all
    server.setOnline(false);
    await page.reload();
    await expect(page.locator('#header')).toBeVisible();

    // Use it normally: add entries and check stats
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await expect(page.locator('#use-total')).toHaveText('1');
    await page.click('#crave-button');
    await page.evaluate(() => $('.statistics-tab-toggler').first().click());
    await expect(page.locator('.weekly-report')).toBeVisible();

    const actions = await page.evaluate(() => JSON.parse(localStorage.getItem('esCrave') || '{}').action || []);
    expect(actions.map((a: any) => a.clickType)).toEqual(['used', 'craved']);

    // "What if the app just waits until I'm back online and then steals my data?"
    const receivedBefore = server.requests.length;
    server.setOnline(true);
    await page.reload();
    await page.waitForTimeout(3000);
    for (const received of server.requests.slice(receivedBefore)) {
      expect(['GET', 'HEAD']).toContain(received.method);
      expect(received.body).toBe('');
    }
  });

  test('"Better Later only updates when YOU choose to press the update button"', async ({ page, context }) => {
    test.setTimeout(90000);
    const url = server.origin + '/app/';

    // Installed and cached
    await page.goto(url);
    await waitForOfflineCache(page);
    await expect(page).toHaveTitle(/^Better Later/);

    // A new release is published: new service worker version and a visible change
    server.setFileOverride('/sw_cached_pages.js', js => js.replace(/v[\d.]+::pages/, 'v999.0.0::pages'));
    server.setFileOverride('/app/index.html', html => html.replace('<title>', '<title>NEW RELEASE - '));

    // Keep using the app: reload, navigate, and close every tab and come back
    // (the browser checks for updates by itself along the way)
    for (let i = 0; i < 3; i++) {
      await page.goto(url);
      await page.waitForTimeout(1000);
      await expect(page).toHaveTitle(/^Better Later/);
    }
    await page.close();
    let reopened = await context.newPage();
    for (let i = 0; i < 2; i++) {
      await reopened.goto(url);
      await reopened.waitForTimeout(1500);
      await expect(reopened, 'the new release must not apply without pressing update').toHaveTitle(/^Better Later/);
    }

    // Press the update button in Settings
    await Promise.all([
      reopened.waitForEvent('load'),
      reopened.evaluate(() => (document.getElementById('refreshServiceWorkerButton') as HTMLButtonElement).click()),
    ]);
    await expect(reopened).toHaveTitle(/^NEW RELEASE/);
    await expect.poll(() => reopened.evaluate(() => caches.keys()), { timeout: 15000 }).toContain('v999.0.0::pages');
  });
});
