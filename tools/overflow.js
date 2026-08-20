const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({executablePath:CHROME, headless:'new',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars']});
  for (const mob of [true]) {
    for (const page of ['index.html','about.html','services.html','tools.html','testimonials.html','articles.html','resources.html','contact.html','accessibility.html','terms.html','privacy.html']) {
      const p = await b.newPage();
      await p.setViewport({width:390,height:844,isMobile:mob,hasTouch:mob});
      await p.goto('http://localhost:4321/'+page,{waitUntil:'load'});
      await wait(3500);
      const r = await p.evaluate(() => ({
        inner: window.innerWidth,
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        bodyScroll: document.body.scrollWidth,
        nav: Math.round(document.querySelector('.nav').getBoundingClientRect().width)
      }));
      console.log(`isMobile=${String(mob).padEnd(5)} ${page.padEnd(11)} inner:${r.inner} client:${r.client} scroll:${r.scroll} body:${r.bodyScroll} nav:${r.nav}`);
      await p.close();
    }
  }
  await b.close();
})();
