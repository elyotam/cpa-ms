/* Builds a favicon from the client's mark: white on the site's ink. */
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new'});
  const p = await b.newPage();
  await p.goto('http://localhost:4321/index.html',{waitUntil:'load'});
  for (const size of [64, 180]) {
    const url = await p.evaluate(async (S) => {
      const img = new Image();
      img.src = 'assets/img/logo-mark.png';
      await new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 8000); });
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d');
      const r = S * 0.22;
      x.fillStyle = '#0A0F1C';
      x.beginPath();
      x.moveTo(r,0); x.arcTo(S,0,S,S,r); x.arcTo(S,S,0,S,r); x.arcTo(0,S,0,0,r); x.arcTo(0,0,S,0,r);
      x.closePath(); x.fill();
      // draw the mark, then flip it to white
      const pad = S * 0.20, inner = S - pad * 2;
      const scale = Math.min(inner / img.naturalWidth, inner / img.naturalHeight);
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      const oc = document.createElement('canvas');
      oc.width = S; oc.height = S;
      const ox = oc.getContext('2d');
      ox.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      const d = ox.getImageData(0, 0, S, S);
      for (let i = 0; i < d.data.length; i += 4) {
        if (d.data[i+3] > 30) { d.data[i] = 245; d.data[i+1] = 228; d.data[i+2] = 184; }
      }
      ox.putImageData(d, 0, 0);
      x.drawImage(oc, 0, 0);
      return c.toDataURL('image/png');
    }, size);
    const name = size === 64 ? 'favicon.png' : 'apple-touch-icon.png';
    fs.writeFileSync(path.join(__dirname, '..', 'assets', 'img', name), Buffer.from(url.split(',')[1],'base64'));
    console.log('  ' + name, size + 'px');
  }
  await b.close();
})();
