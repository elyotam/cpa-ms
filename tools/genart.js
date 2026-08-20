/* ============================================================
   genart.js — renders the site's image assets.
   Opens tools/art.html in headless Chrome once per asset and
   writes a .webp into assets/img/.

   Run once:  node tools/genart.js
   Re-run only when the art direction changes; the output is
   committed alongside the site.
   ============================================================ */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'assets', 'img');
const ART = 'file:///' + path.join(__dirname, 'art.html').replace(/\\/g, '/');

// name, motif, seed, width, height
const ASSETS = [
  // service cards, 16:10
  ['svc-ecommerce', 'flow',   1471, 900, 563],
  ['svc-company',   'strata',  907, 900, 563],
  ['svc-murshe',    'ledger', 3313, 900, 563],
  ['svc-patur',     'rings',  5051, 900, 563],
  ['svc-crypto',    'cells',  7717, 900, 563],
  ['svc-payroll',   'weave',  2287, 900, 563],
  ['svc-partner',   'spiral', 6151, 900, 563],

  // article covers, 16:9
  ['art-start',     'flow',   8123, 900, 506],
  ['art-open',      'strata', 4409, 900, 506],
  ['art-paypal',    'ledger', 9931, 900, 506],
  ['art-crypto',    'cells',  1213, 900, 506],
  ['art-expenses',  'weave',  6673, 900, 506],
  ['art-letter',    'rings',  3547, 900, 506],

  // wide section backdrops
  ['bg-spotlight',  'flow',   2749, 1920, 1080],
  ['bg-process',    'wave',   8291, 1920,  900],
  ['bg-band',       'spiral', 5443, 1920,  760],

  // portrait plate, 4:5
  ['plate-portrait', 'rings', 1877, 900, 1125],

  // social share card
  ['og-cover',      'wave',   1201, 1200, 630],

  // paper twins — used as low-opacity backdrops in light mode, where the
  // night versions just turn grey
  ['bg-spotlight-l', 'flow',   2749, 1920, 1080, 1],
  ['bg-process-l',   'wave',   8291, 1920,  900, 1],
  ['bg-band-l',      'spiral', 5443, 1920,  760, 1]
];

(async () => {
  fs.mkdirSync(IMG, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--hide-scrollbars', '--force-device-scale-factor=1']
  });

  let total = 0;
  for (const [name, type, seed, w, h, light] of ASSETS) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h });
    await page.goto(`${ART}?type=${type}&seed=${seed}&w=${w}&h=${h}${light ? '&light=1' : ''}`, { waitUntil: 'load' });
    await page.waitForFunction('window.__artReady === true', { timeout: 60000 });

    const file = path.join(IMG, name + '.webp');
    await page.screenshot({ path: file, type: 'webp', quality: 86, clip: { x: 0, y: 0, width: w, height: h } });
    const kb = Math.round(fs.statSync(file).size / 1024);
    total += kb;
    console.log(`  ✓ ${name}.webp  ${type}  ${w}×${h}  ${kb}kb`);
    await page.close();
  }

  await browser.close();
  console.log(`\n${ASSETS.length} assets, ${Math.round(total / 1024 * 10) / 10}MB total.`);
})();
