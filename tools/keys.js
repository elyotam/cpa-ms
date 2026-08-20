const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({executablePath:CHROME, headless:'new',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars']});
  const p = await b.newPage();
  await p.setViewport({width:1440,height:900});
  await p.goto('http://localhost:4321/index.html',{waitUntil:'load'});
  await wait(3500);

  const seen = [];
  let noOutline = 0, offscreen = 0;
  for (let i = 0; i < 26; i++) {
    await p.keyboard.press('Tab');
    const r = await p.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      const rect = e.getBoundingClientRect();
      return {
        tag: e.tagName.toLowerCase(),
        cls: (e.className||'').toString().split(' ')[0],
        label: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0,22),
        outline: cs.outlineStyle + ' ' + cs.outlineWidth,
        w: Math.round(rect.width), h: Math.round(rect.height),
        vis: rect.width > 0 && rect.height > 0
      };
    });
    if (!r) { seen.push('(body)'); continue; }
    if (r.outline === 'none 0px') noOutline++;
    if (!r.vis) offscreen++;
    seen.push(`${r.tag}.${r.cls} "${r.label}" ${r.outline} ${r.w}x${r.h}`);
  }
  console.log('tab order (first 26):');
  seen.forEach((s,i) => console.log(String(i+1).padStart(3)+'  '+s));
  console.log(`\nno visible outline: ${noOutline}   zero-size focus targets: ${offscreen}`);

  // drawer keyboard behaviour at mobile width
  const p2 = await b.newPage();
  await p2.setViewport({width:390,height:844});
  await p2.goto('http://localhost:4321/index.html',{waitUntil:'load'});
  await wait(3500);
  await p2.click('#burger');
  await wait(800);
  const open = await p2.evaluate(() => ({
    on: document.querySelector('#drawer').classList.contains('on'),
    expanded: document.querySelector('#burger').getAttribute('aria-expanded'),
    locked: document.body.classList.contains('is-locked')
  }));
  await p2.keyboard.press('Escape');
  await wait(600);
  const closed = await p2.evaluate(() => ({
    on: document.querySelector('#drawer').classList.contains('on'),
    expanded: document.querySelector('#burger').getAttribute('aria-expanded'),
    locked: document.body.classList.contains('is-locked')
  }));
  console.log('\ndrawer open ->', JSON.stringify(open));
  console.log('after Escape ->', JSON.stringify(closed));
  await b.close();
})();
