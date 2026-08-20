const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:4321';
const PAGES = ['/', '/services.html', '/tools.html', '/articles.html', '/contact.html'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const kb = n => (n/1024).toFixed(0) + 'kb';

(async () => {
  const b = await puppeteer.launch({executablePath:CHROME, headless:'new',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars']});
  for (const url of PAGES) {
    const p = await b.newPage();
    const bytes = {};
    p.on('response', async r => {
      try {
        const h = r.headers()['content-length'];
        const t = (r.request().resourceType());
        const n = h ? +h : (await r.buffer().catch(()=>({length:0}))).length || 0;
        bytes[t] = (bytes[t]||0) + n;
      } catch(e){}
    });
    await p.setViewport({width:1440,height:900});
    const t0 = Date.now();
    await p.goto(BASE+url,{waitUntil:'load'});
    const loadMs = Date.now()-t0;
    await wait(2500);
    const m = await p.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const lcp = performance.getEntriesByType('largest-contentful-paint').pop();
      return {
        dom: Math.round(nav.domContentLoadedEventEnd || 0),
        fcp: Math.round((performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime || 0),
        lcp: lcp ? Math.round(lcp.startTime) : null,
        nodes: document.querySelectorAll('*').length
      };
    });
    const total = Object.values(bytes).reduce((a,c)=>a+c,0);
    console.log(url.padEnd(17),
      `total ${kb(total).padStart(7)}`,
      `img ${kb(bytes.image||0).padStart(7)}`,
      `js ${kb(bytes.script||0).padStart(6)}`,
      `css ${kb(bytes.stylesheet||0).padStart(6)}`,
      `font ${kb(bytes.font||0).padStart(6)}`,
      `| fcp ${m.fcp}ms lcp ${m.lcp}ms nodes ${m.nodes}`);
    await p.close();
  }
  await b.close();
})();
