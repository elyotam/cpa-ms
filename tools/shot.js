const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.SHOT_OUT || 'C:/Users/cohen/AppData/Local/Temp/claude/c--Users-cohen-OneDrive-Desktop-Claude-Code/d877ec16-a721-42b5-a455-83287e2f0cd0/scratchpad/';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--hide-scrollbars','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
  });
  for (const j of JSON.parse(process.argv[2])) {
    const p = await b.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('JS: ' + e.message));
    p.on('console', m => { if (m.type()==='error'||m.type()==='warning') errs.push(m.type()+': '+m.text().slice(0,140)); });
    await p.setViewport({width: j.w||1440, height: j.h||900, isMobile: !!j.mobile, hasTouch: !!j.mobile});
    if (j.theme) await p.evaluateOnNewDocument(t => { try { localStorage.setItem('ms-theme', t); } catch(e){} }, j.theme);
    await p.goto('http://localhost:4321' + j.url, {waitUntil:'load'});
    await wait(j.settle || 4500);
    if (j.sel) {
      const top = await p.evaluate(sel => {
        const el = document.querySelector(sel);
        return el ? el.getBoundingClientRect().top + window.scrollY : 0;
      }, j.sel);
      await p.evaluate(y => window.scrollTo(0, y), top + (j.plus || 0));
      await wait(2200);
    } else if (j.scroll) { await p.evaluate(y => window.scrollTo(0,y), j.scroll); await wait(1800); }
    await p.screenshot({path: OUT + j.name + '.png'});
    console.log('✓', j.name, errs.length ? '| ' + errs.slice(0,3).join(' ~ ') : '');
    await p.close();
  }
  await b.close();
})();
