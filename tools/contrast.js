/* ============================================================
   contrast.js — WCAG AA audit across every page and both themes.

   Walks each text node's element, resolves the first opaque
   background behind it, and reports anything under 4.5:1
   (3:1 for large text). Elements sitting on an image or gradient
   are listed separately, since the maths cannot settle those.

   node tools/contrast.js
   ============================================================ */
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:4321';
const PAGES = ['/', '/about.html', '/services.html', '/tools.html', '/testimonials.html', '/articles.html',
               '/resources.html', '/contact.html', '/accessibility.html', '/terms.html', '/privacy.html'];
const wait = ms => new Promise(r => setTimeout(r, ms));

const AUDIT = () => {
  const parse = c => {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1
  });
  const lum = c => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const fails = [], onArt = [];
  const els = [...document.querySelectorAll('body *')];

  for (const el of els) {
    // only elements that render their own text
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (el.closest('#loader')) continue;
    if (el.closest('[aria-hidden="true"]')) continue;   // decoration, not content

    const fg = parse(cs.color);
    if (!fg || fg.a === 0) continue;

    // Regions that are painted dark in both themes are not discoverable by
    // walking ancestors: the header floats over them with no background of
    // its own. Declare their real backdrop instead of guessing.
    const ownBg = cs.backgroundImage && cs.backgroundImage !== 'none';
    const ownSolid = parse(cs.backgroundColor);
    const paintsItself = ownBg || (ownSolid && ownSolid.a >= 0.98);
    const darkRegion = el.closest('.hero, .phero, .band, .reel, .film, .vcard, .nav:not(.solid), .drawer:not(.on)');
    let node = el, bg = null, image = ownBg;
    if (!paintsItself && darkRegion && !el.closest('.drawer')) {
      bg = { r: 8, g: 13, b: 24, a: 1 };
      node = null;
    }
    while (node && node !== document.documentElement) {
      const s = getComputedStyle(node);
      if (s.backgroundImage && s.backgroundImage !== 'none') { image = true; break; }
      const c = parse(s.backgroundColor);
      if (c && c.a >= 0.98) { bg = c; break; }
      if (c && c.a > 0) { bg = bg ? over(c, bg) : c; }
      node = node.parentElement;
    }

    const label = el.tagName.toLowerCase() + (el.className ? '.' + el.className.toString().trim().split(/\s+/)[0] : '');
    const text = el.textContent.trim().slice(0, 26);

    if (image || !bg) { onArt.push(`${label} "${text}"`); continue; }

    const solid = fg.a < 1 ? over(fg, bg) : fg;
    const cr = ratio(solid, bg);
    const px = parseFloat(cs.fontSize);
    const bold = +cs.fontWeight >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;

    if (cr < need) {
      fails.push(`${label} "${text}" ${cr.toFixed(2)}:1 (needs ${need}) ${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}) ${px}px`);
    }
  }
  return { fails, onArt: onArt.length };
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars']
  });

  let total = 0;
  for (const theme of ['dark', 'light']) {
    console.log(`\n── ${theme} ──`);
    for (const url of PAGES) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.evaluateOnNewDocument(t => { try { localStorage.setItem('ms-theme', t); } catch (e) {} }, theme);
      await page.goto(BASE + url, { waitUntil: 'load' });
      await wait(3000);
      // reveal everything so hidden text is measured too
      await page.evaluate(() => {
        document.querySelectorAll('[data-rv],.gsap-in').forEach(e => {
          e.style.opacity = 1; e.style.transform = 'none';
        });
        document.querySelectorAll('.reel-cap,.pain-pane').forEach(e => e.classList.add('on'));
      });
      await wait(400);
      const r = await page.evaluate(AUDIT);
      total += r.fails.length;
      console.log(`${r.fails.length ? 'FAIL' : 'ok  '} ${url.padEnd(21)} fails:${r.fails.length} on-art:${r.onArt}`);
      r.fails.slice(0, 6).forEach(f => console.log('      ' + f));
      await page.close();
    }
  }
  console.log(total ? `\n${total} contrast failure(s)` : '\nno contrast failures');
  await browser.close();
})();
