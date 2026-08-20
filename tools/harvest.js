/* ============================================================
   harvest.js — collects the media the client's live site uses,
   so the rebuild can carry the same logo, portrait and artwork.
   Renders each page in Chrome and records every image/video it
   actually loads, then downloads the originals.
   ============================================================ */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'harvest');
const wait = ms => new Promise(r => setTimeout(r, ms));

const PAGES = [
  'https://www.cpa-ms.com/',
  'https://www.cpa-ms.com/%D7%90%D7%95%D7%93%D7%95%D7%AA',
  'https://www.cpa-ms.com/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99-%D7%94%D7%9E%D7%A9%D7%A8%D7%93',
  'https://www.cpa-ms.com/%D7%9E%D7%A1%D7%97%D7%A8-%D7%90%D7%9C%D7%A7%D7%98%D7%A8%D7%95%D7%A0%D7%99',
  'https://www.cpa-ms.com/%D7%A2%D7%95%D7%A1%D7%A7-%D7%A4%D7%98%D7%95%D7%A8',
  'https://www.cpa-ms.com/%D7%A2%D7%95%D7%A1%D7%A7-%D7%9E%D7%95%D7%A8%D7%A9%D7%94',
  'https://www.cpa-ms.com/%D7%97%D7%91%D7%A8%D7%94',
  'https://www.cpa-ms.com/%D7%A9%D7%95%D7%AA%D7%A4%D7%95%D7%AA',
  'https://www.cpa-ms.com/%D7%91%D7%99%D7%98%D7%A7%D7%95%D7%99%D7%9F',
  'https://www.cpa-ms.com/%D7%9E%D7%99%D7%93%D7%A2-%D7%A9%D7%99%D7%9E%D7%95%D7%A9%D7%99',
  'https://www.cpa-ms.com/contact-8'
];

// Wix serves derivatives like .../<id>~mv2.jpg/v1/fill/w_300,h_200,.../file.jpg
// Trimming everything after the extension gives the untouched original.
const original = u => {
  const m = u.match(/^(https:\/\/static\.wixstatic\.com\/media\/[^/]+\.(?:jpg|jpeg|png|gif|webp|svg))/i);
  return m ? m[1] : u;
};

function download(url, file) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.cpa-ms.com/' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return download(res.headers.location, file).then(resolve);
      }
      if (res.statusCode !== 200) { res.resume(); return resolve(0); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(file, buf);
        resolve(buf.length);
      });
    }).on('error', () => resolve(0));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });
  const found = new Map();   // originalUrl -> {type, seenOn}

  for (const url of PAGES) {
    const page = await browser.newPage();
    page.on('response', r => {
      const t = r.request().resourceType();
      if (t !== 'image' && t !== 'media') return;
      const u = r.url();
      if (!/wixstatic|cpa-ms/.test(u)) return;
      const o = original(u);
      if (!found.has(o)) found.set(o, { type: t, page: url });
    });
    try {
      await page.setViewport({ width: 1440, height: 1200 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      // Wix lazy-loads; walk the page so everything requests
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y); await new Promise(r => setTimeout(r, 220));
        }
      });
      await wait(2500);
      console.log('scanned', decodeURIComponent(url.replace('https://www.cpa-ms.com', '')) || '/');
    } catch (e) {
      console.log('  skipped', decodeURIComponent(url.slice(24, 60)), '-', e.message.slice(0, 50));
    }
    await page.close();
  }
  await browser.close();

  console.log(`\n${found.size} unique media files. downloading…\n`);
  const manifest = [];
  let i = 0;
  for (const [url, meta] of found) {
    const ext = (url.match(/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm)/i) || [, 'bin'])[1].toLowerCase();
    const name = String(++i).padStart(2, '0') + '_' + url.split('/').pop().split('~')[0].slice(-14) + '.' + ext;
    const file = path.join(OUT, name);
    const size = await download(url, file);
    if (size > 0) {
      manifest.push({ name, size, url, type: meta.type });
      console.log(`  ${name.padEnd(26)} ${(size / 1024).toFixed(0).padStart(6)}kb  ${meta.type}`);
    } else {
      console.log(`  ${name.padEnd(26)}   failed`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nsaved to tools/harvest/`);
})();
