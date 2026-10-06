// Visual check without extra dependencies: serves the built app, drives headless Edge/Chrome
// over the DevTools protocol and saves screenshots of key routes at phone/tablet/desktop sizes.
//
//   npm run build -- --configuration development
//   node scripts/screenshots.mjs [--only=map,chat] [--viewport=phone|small|tablet|desktop] [--out=screenshots]
//   --full    capture the whole scrollable page, not just the first screen
//   --audit   print elements that stick out of the viewport or of their .card (layout bugs)
//
// Compare the phone shots with design/*.png.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => a.replace(/^--/, '').split('='))
    .map(([k, v]) => [k, v ?? true]),
);
const ROOT = resolve('dist/nails-app/browser');
const OUT = resolve(args.out ?? 'screenshots');
const PORT = 4300;
const DEBUG_PORT = 9333;

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];

const VIEWPORTS = {
  phone: { width: 390, height: 844, mobile: true, scale: 2 },
  small: { width: 360, height: 740, mobile: true, scale: 2 },
  tablet: { width: 820, height: 1180, mobile: true, scale: 1 },
  desktop: { width: 1440, height: 900, mobile: false, scale: 1 },
};

/** Routes to capture; `auth` signs in the demo account first. */
const SHOTS = [
  { name: 'map', path: '/', auth: false },
  { name: 'map-signed-in', path: '/', auth: true },
  { name: 'master', path: '/masters/m-anna-serova', auth: true },
  { name: 'booking', path: '/masters/m-anna-serova?book=1', auth: true },
  { name: 'chats', path: '/chats', auth: true },
  { name: 'chat-thread', path: '/chats/chat-m-anna-serova-c-me', auth: true },
  { name: 'client-bookings', path: '/profile/client/bookings', auth: true },
  { name: 'client-favorites', path: '/profile/client/favorites', auth: true },
  { name: 'client-reviews', path: '/profile/client/reviews', auth: true },
  { name: 'client-settings', path: '/profile/client/settings', auth: true },
  { name: 'master-cabinet', path: '/profile/master', auth: true, role: 'master' },
  { name: 'cabinet-profile', path: '/profile/master/profile', auth: true, role: 'master' },
  {
    name: 'cabinet-services',
    path: '/profile/master/profile?tab=services',
    auth: true,
    role: 'master',
  },
  {
    name: 'cabinet-portfolio',
    path: '/profile/master/profile?tab=portfolio',
    auth: true,
    role: 'master',
  },
  {
    name: 'cabinet-verification',
    path: '/profile/master/profile?tab=verification',
    auth: true,
    role: 'master',
  },
  {
    name: 'cabinet-clients',
    path: '/profile/master/bookings?tab=clients',
    auth: true,
    role: 'master',
  },
  { name: 'cabinet-bookings', path: '/profile/master/bookings', auth: true, role: 'master' },
  { name: 'cabinet-schedule', path: '/profile/master/schedule', auth: true, role: 'master' },
  { name: 'cabinet-income', path: '/profile/master/income', auth: true, role: 'master' },
  { name: 'cabinet-settings', path: '/profile/master/settings', auth: true, role: 'master' },
  { name: 'login', path: '/login', auth: false },
];

/** In-page check: elements outside the viewport or wider than their .card, unless clipped. */
const AUDIT = `(() => {
  const W = __WIDTH__;
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== 'visible') return true;
    }
    return false;
  };
  const name = (el) => {
    let host = el;
    while (host && !host.tagName.includes('-')) host = host.parentElement;
    const cls = typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/ +/).slice(0, 2).join('.')
      : '';
    return (host ? host.tagName.toLowerCase() + ' > ' : '') + el.tagName.toLowerCase() + cls;
  };
  const hits = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).position === 'fixed' || clipped(el)) continue;
    let why = '';
    if (r.right > W + 1 || r.left < -1) why = 'viewport ' + Math.round(r.left) + '..' + Math.round(r.right);
    const card = el.parentElement && el.parentElement.closest('.card');
    if (!why && card) {
      const c = card.getBoundingClientRect();
      if (r.right > c.right + 1 || r.left < c.left - 1) why = 'card +' + Math.round(r.right - c.right) + 'px';
    }
    if (why) hits.push({ el, why });
  }
  // Report only the deepest offenders: a container overflows because of what is inside it.
  const out = [];
  const seen = new Set();
  for (const hit of hits) {
    if (hits.some((other) => other !== hit && hit.el.contains(other.el))) continue;
    const key = name(hit.el);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key + '  [' + hit.why + ']');
  }
  return { W, docW: document.documentElement.scrollWidth, out: out.slice(0, 25) };
})()`;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function serve() {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = join(ROOT, decodeURIComponent(url.pathname));
    if (!existsSync(file) || !extname(file)) file = join(ROOT, 'index.html'); // SPA fallback
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(PORT);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: ok, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method && listeners.has(msg.method)) {
      listeners.get(msg.method).forEach((fn) => fn(msg.params));
    }
  };
  return {
    send: (method, params = {}) =>
      new Promise((ok, reject) => {
        const n = ++id;
        pending.set(n, { resolve: ok, reject });
        ws.send(JSON.stringify({ id: n, method, params }));
      }),
    once: (method) =>
      new Promise((ok) => {
        const fns = listeners.get(method) ?? [];
        const fn = (p) => {
          listeners.set(
            method,
            (listeners.get(method) ?? []).filter((f) => f !== fn),
          );
          ok(p);
        };
        listeners.set(method, [...fns, fn]);
      }),
    close: () => ws.close(),
  };
}

async function main() {
  if (!existsSync(join(ROOT, 'index.html'))) {
    console.error('Build first: npm run build -- --configuration development');
    process.exit(1);
  }
  const browserPath = BROWSERS.find(existsSync);
  if (!browserPath) throw new Error('Edge/Chrome not found');
  mkdirSync(OUT, { recursive: true });

  const server = serve();
  const browser = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${join(tmpdir(), 'nails-screens-profile')}`,
    '--no-first-run',
    '--hide-scrollbars',
    'about:blank',
  ]);

  let version;
  for (let i = 0; i < 50 && !version; i++) {
    await sleep(200);
    version = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)
      .then((r) => r.json())
      .catch(() => null);
  }
  if (!version) throw new Error('Browser did not start');
  const target = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, {
    method: 'PUT',
  }).then((r) => r.json());
  const page = await cdp(target.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');

  const origin = `http://127.0.0.1:${PORT}`;
  // --only matches shot names (e.g. --only=chat); leading-slash paths get mangled by Git Bash.
  const only = args.only ? String(args.only).split(',') : null;
  const shots = only
    ? SHOTS.filter((s) => only.some((o) => s.name.includes(o) || s.path === o))
    : SHOTS;
  if (!shots.length) throw new Error(`No shots match --only=${args.only}`);
  const viewports = args.viewport ? { [args.viewport]: VIEWPORTS[args.viewport] } : VIEWPORTS;

  for (const [vpName, vp] of Object.entries(viewports)) {
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.scale,
      mobile: vp.mobile,
    });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
    for (const shot of shots) {
      // Set the mock session on the app origin, then load the route fresh.
      let loaded = page.once('Page.loadEventFired');
      await page.send('Page.navigate', { url: `${origin}/login` });
      await loaded;
      const session = JSON.stringify({ authenticated: shot.auth, role: shot.role ?? 'client' });
      await page.send('Runtime.evaluate', {
        expression: `localStorage.setItem('nails.session', ${JSON.stringify(session)})`,
      });
      loaded = page.once('Page.loadEventFired');
      await page.send('Page.navigate', { url: origin + shot.path });
      await loaded;
      await sleep(Number(args.wait ?? 1800)); // mock latency + map tiles
      if (args.audit) {
        const { result } = await page.send('Runtime.evaluate', {
          expression: AUDIT.replace('__WIDTH__', String(vp.width)),
          returnByValue: true,
        });
        const report = result.value;
        const issues = report.out.length || report.docW > report.W;
        const status = issues ? 'ISSUES' : 'ok    ';
        console.log(
          `${status} ${vpName}-${shot.name} (page ${report.docW}px / viewport ${report.W}px)`,
        );
        for (const line of report.out) console.log('   ', line);
      }
      const shotOpts = { format: 'png' };
      if (args.full) {
        // The bottom tab bar is position: fixed and would be painted mid-page in a tall capture.
        await page.send('Runtime.evaluate', {
          expression:
            "document.querySelector('app-bottom-nav')?.style.setProperty('display', 'none')",
        });
        const { result } = await page.send('Runtime.evaluate', {
          expression: 'Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)',
          returnByValue: true,
        });
        shotOpts.captureBeyondViewport = true;
        shotOpts.clip = { x: 0, y: 0, width: vp.width, height: result.value, scale: 1 };
      }
      const { data } = await page.send('Page.captureScreenshot', shotOpts);
      const file = join(OUT, `${vpName}-${shot.name}.png`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      console.log('saved', file);
    }
  }

  page.close();
  browser.kill();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
