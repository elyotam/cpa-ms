/* ============================================================
   qa.js — sweeps every page in a real browser.
   Scrolls the whole document so every reveal, pin and lazy image
   fires, then reports anything that looks wrong.

   node tools/qa.js            desktop, dark
   node tools/qa.js mobile     390x844
   node tools/qa.js light      light theme
   ============================================================ */
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:4321';
const PAGES = ['/', '/about.html', '/services.html', '/tools.html', '/testimonials.html', '/articles.html',
               '/resources.html', '/contact.html', '/accessibility.html', '/terms.html', '/privacy.html'];

const mode = process.argv[2] || 'desktop';
const VIEW = mode === 'mobile' ? { width: 390, height: 844, isMobile: true, hasTouch: true }
                               : { width: 1440, height: 900 };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--ignore-gpu-blocklist', '--hide-scrollbars']
  });

  let fails = 0;
  for (const url of PAGES) {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('JS: ' + e.message.slice(0, 120)));
    page.on('console', m => { if (m.type() === 'error') errs.push('C: ' + m.text().slice(0, 120)); });
    page.on('requestfailed', r => errs.push('NET: ' + r.url().split('/').pop().slice(0, 40)));

    await page.setViewport(VIEW);
    if (mode === 'light') {
      await page.evaluateOnNewDocument(() => { try { localStorage.setItem('ms-theme', 'light'); } catch (e) {} });
    }
    await page.goto(BASE + url, { waitUntil: 'load', timeout: 45000 });
    await wait(3500);

    // walk the page so pinned sections and lazy images all resolve
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.5;
      let guard = 0;
      for (let y = 0; y < document.body.scrollHeight && guard < 220; y += step, guard++) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 90));
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    await wait(2200);

    const r = await page.evaluate(() => {
      const vis = el => +getComputedStyle(el).opacity === 0;
      const imgs = [...document.querySelectorAll('img')];
      return {
        stuck: [...document.querySelectorAll('[data-rv],.gsap-in')].filter(vis).length,
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
        noAlt: imgs.filter(i => !i.hasAttribute('alt')).length,
        imgs: imgs.length,
        h1: document.querySelectorAll('h1').length,
        flags: document.documentElement.className || '-'
      };
    });

    const bad = errs.length || r.stuck || r.overflow > 2 || r.broken || r.noAlt || r.h1 !== 1;
    if (bad) fails++;
    console.log(
      (bad ? 'FAIL ' : 'ok   ') + url.padEnd(21),
      `img:${r.imgs} stuck:${r.stuck} ovf:${r.overflow} broken:${r.broken} h1:${r.h1}`,
      errs.slice(0, 2).join(' ~ ')
    );
    await page.close();
  }

  console.log(fails ? `\n${mode}: ${fails} page(s) with findings` : `\n${mode}: all pages clean`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
