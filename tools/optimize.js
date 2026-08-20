/* ============================================================
   optimize.js — brings the client's own media into the rebuild.

   The originals off the live site run 5–20MB apiece. This resizes
   and re-encodes them to webp at the sizes the layout actually
   uses, and pulls a poster frame out of every video.

   node tools/optimize.js
   ============================================================ */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.join(__dirname, '..');
const SRC = path.join(__dirname, 'harvest');
const IMG = path.join(ROOT, 'assets', 'img');
const VID = path.join(ROOT, 'assets', 'video');

// source, output name, max width, quality, mode
// mode 'contain' keeps transparency and the whole frame (logos, icons)
const IMAGES = [
  // identity
  ['02_2af6d44d44010d.png', 'logo.png',            560, 1.0, 'png'],
  ['28_9cb0fd167ff0b2.jpg', 'moshe.jpg',           1100, 0.90, 'cover'],

  // people and offices
  ['14_276a927954004d.jpg', 'photo-advisor.webp',  1400, 0.84, 'cover'],
  ['15_b945afad94.jpg.jpg', 'photo-desk-night.webp', 1600, 0.82, 'cover'],
  ['23_1480d1dbdc.jpg.jpg', 'photo-desk-calc.webp',  1600, 0.82, 'cover'],
  ['24_fe0f9fe19e27ea.jpg', 'photo-lobby.webp',    1600, 0.82, 'cover'],
  ['31_20d8c9110ee014.jpg', 'photo-signing.webp',  1600, 0.82, 'cover'],
  ['33_090716db91be23.jpg', 'photo-office.webp',   1600, 0.82, 'cover'],
  ['34_c0bc175ee5.jpg.jpg', 'photo-writing.webp',  1600, 0.82, 'cover'],
  ['36_089c42056efe9b.jpg', 'photo-corridor.webp', 1600, 0.82, 'cover'],
  ['39_b3885ae6cd5904.jpg', 'photo-laptop.webp',   1600, 0.82, 'cover'],
  ['35_f8a19bfc64.jpg.jpg', 'photo-building.webp', 1600, 0.82, 'cover'],
  ['04_12aa4018880375.jpg', 'photo-architecture.webp', 1600, 0.82, 'cover'],
  ['32_b178d48911d4e1.jpg', 'photo-ecommerce.webp', 1600, 0.82, 'cover'],
  ['37_1058e00f2a8d96.jpg', 'photo-bitcoin.webp',  1200, 0.84, 'cover'],
  ['38_65ba5d3dd3645a.jpg', 'photo-objects.webp',  1400, 0.84, 'cover'],
  ['03_9f09d63fdc9ada.jpg', 'photo-spiral.webp',   1400, 0.84, 'cover'],

  // the office's own line icons
  ['07_867c709312fbbb.png', 'icon-ecommerce.png',  256, 1.0, 'png'],
  ['06_499c8520b3da99.png', 'icon-company.png',    256, 1.0, 'png'],
  ['08_1b3e83d27e9031.png', 'icon-murshe.png',     256, 1.0, 'png'],
  ['05_0d37501632483f.png', 'icon-patur.png',      256, 1.0, 'png'],
  ['25_749c932f57a8aa.png', 'icon-partner.png',    256, 1.0, 'png'],
  ['09_3ac7773bfbdc1e.png', 'icon-crypto.png',     256, 1.0, 'png'],
  ['26_9bca0bef4e72d5.png', 'icon-quality.png',    256, 1.0, 'png'],
  ['27_e70c9e924a8738.png', 'icon-target.png',     256, 1.0, 'png'],

  // authorities, for the useful-links tiles
  ['16_015ea727634dfb.jpg', 'gov-taxes.png',       320, 1.0, 'png'],
  ['17_cb3959a7c9eed0.png', 'gov-boi.png',         320, 1.0, 'png'],
  ['18_239a2b0e66f70e.png', 'gov-btl.png',         320, 1.0, 'png']
];

// source, output, poster time in seconds
const VIDEOS = [
  ['22_file.mp4.mp4', 'brand-a.mp4',       2.0],
  ['45_file.mp4.mp4', 'brand-b.mp4',       2.0],
  ['19_file.mp4.mp4', 'story-1.mp4',       3.0],
  ['20_file.mp4.mp4', 'story-2.mp4',       3.0],
  ['21_file.mp4.mp4', 'story-3.mp4',       3.0],
  ['49_file.mp4.mp4', 'story-4.mp4',       3.0],
  ['50_file.mp4.mp4', 'story-5.mp4',       3.0],
  ['51_file.mp4.mp4', 'story-6.mp4',       3.0],
  ['52_file.mp4.mp4', 'story-7.mp4',       3.0]
];

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(IMG, { recursive: true });
  fs.mkdirSync(VID, { recursive: true });

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:4321/index.html', { waitUntil: 'load' });

  console.log('images');
  let before = 0, after = 0;
  for (const [src, out, maxW, q, mode] of IMAGES) {
    const srcPath = path.join(SRC, src);
    if (!fs.existsSync(srcPath)) { console.log(`  ! missing ${src}`); continue; }
    before += fs.statSync(srcPath).size;

    const dataUrl = await page.evaluate(async (file, maxW, q, mode) => {
      const img = new Image();
      img.src = '/tools/harvest/' + file;
      await new Promise(res => { img.onload = res; img.onerror = res; setTimeout(res, 20000); });
      if (!img.naturalWidth) return null;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, w, h);
      return mode === 'png' ? c.toDataURL('image/png') : c.toDataURL('image/webp', q);
    }, src, maxW, q, mode);

    if (!dataUrl) { console.log(`  ! failed ${src}`); continue; }
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    fs.writeFileSync(path.join(IMG, out), buf);
    after += buf.length;
    console.log(`  ${out.padEnd(26)} ${(buf.length / 1024).toFixed(0).padStart(5)}kb`);
  }
  console.log(`  ${(before / 1048576).toFixed(1)}MB in -> ${(after / 1048576).toFixed(1)}MB out`);

  console.log('\nvideos + posters');
  for (const [src, out, t] of VIDEOS) {
    const srcPath = path.join(SRC, src);
    if (!fs.existsSync(srcPath)) { console.log(`  ! missing ${src}`); continue; }
    fs.copyFileSync(srcPath, path.join(VID, out));

    const poster = await page.evaluate(async (file, t) => {
      const v = document.createElement('video');
      v.src = '/tools/harvest/' + file; v.muted = true; v.preload = 'auto';
      await new Promise(res => { v.onloadeddata = res; v.onerror = res; setTimeout(res, 25000); });
      if (!v.videoWidth) return null;
      v.currentTime = Math.min(t, (v.duration || 4) - 0.2);
      await new Promise(res => { v.onseeked = res; setTimeout(res, 8000); });
      const scale = Math.min(1, 900 / v.videoWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL('image/webp', 0.82);
    }, src, t);

    const size = (fs.statSync(path.join(VID, out)).size / 1048576).toFixed(1);
    if (poster) {
      const pbuf = Buffer.from(poster.split(',')[1], 'base64');
      fs.writeFileSync(path.join(VID, out.replace('.mp4', '.webp')), pbuf);
      console.log(`  ${out.padEnd(16)} ${size}MB  + poster ${(pbuf.length / 1024).toFixed(0)}kb`);
    } else {
      console.log(`  ${out.padEnd(16)} ${size}MB  (no poster)`);
    }
  }

  await browser.close();
  console.log('\ndone.');
})();
