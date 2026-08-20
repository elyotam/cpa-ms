/* Slices every page into screen-height frames so the whole site can be
   reviewed as it actually renders, pins and reveals included. */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.SHOT_OUT || 'C:/Users/cohen/AppData/Local/Temp/claude/c--Users-cohen-OneDrive-Desktop-Claude-Code/d877ec16-a721-42b5-a455-83287e2f0cd0/scratchpad/audit/';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PAGES = process.argv[2] ? process.argv[2].split(',') : ['index.html'];
const STEP = 0.9;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars'] });
  for (const page of PAGES) {
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto('http://localhost:4321/' + page, { waitUntil: 'load' });
    await wait(5000);
    const h = await p.evaluate(() => document.body.scrollHeight);
    const frames = Math.min(14, Math.ceil(h / (900 * STEP)));
    const base = page.replace('.html', '');
    for (let i = 0; i < frames; i++) {
      await p.evaluate((y) => window.scrollTo(0, y), i * 900 * STEP);
      await wait(1300);
      await p.screenshot({ path: `${OUT}${base}-${String(i).padStart(2,'0')}.png` });
    }
    console.log(`${base}: ${frames} frames (${h}px)`);
    await p.close();
  }
  await b.close();
})();
