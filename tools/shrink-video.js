/* ============================================================
   shrink-video.js — re-encodes the ambient background clips.

   The originals are 1080p at ~4Mbps, which is a lot to autoplay
   behind a heavy scrim. Chrome's MediaRecorder re-encodes them
   through a canvas at the size the layout actually shows.

   node tools/shrink-video.js
   ============================================================ */
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const VID = path.join(__dirname, '..', 'assets', 'video');
const CLIPS = [
  ['brand-a.mp4', 1280, 900000],
  ['brand-b.mp4', 1280, 900000]
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle',
           '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:4321/index.html', { waitUntil: 'load' });

  for (const [file, maxW, bps] of CLIPS) {
    const src = path.join(VID, file);
    if (!fs.existsSync(src)) { console.log('  ! missing ' + file); continue; }
    const wasKb = Math.round(fs.statSync(src).size / 1024);

    console.log(`  ${file}: encoding…`);
    const b64 = await page.evaluate(async (url, maxW, bps) => {
      const v = document.createElement('video');
      v.src = url; v.muted = true; v.playsInline = true;
      await new Promise(r => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 30000); });
      if (!v.videoWidth) return null;

      const scale = Math.min(1, maxW / v.videoWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(v.videoWidth * scale / 2) * 2;
      c.height = Math.round(v.videoHeight * scale / 2) * 2;
      const x = c.getContext('2d');

      const stream = c.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E')
        ? 'video/mp4;codecs=avc1.42E01E' : 'video/webm;codecs=vp9';
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bps });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };

      const done = new Promise(r => { rec.onstop = r; });
      rec.start(250);

      let raf;
      const draw = () => { x.drawImage(v, 0, 0, c.width, c.height); raf = requestAnimationFrame(draw); };
      v.currentTime = 0;
      await v.play();
      draw();
      await new Promise(r => { v.onended = r; setTimeout(r, (v.duration + 3) * 1000); });
      cancelAnimationFrame(raf);
      rec.stop();
      await done;

      const blob = new Blob(chunks, { type: mime.split(';')[0] });
      const buf = await blob.arrayBuffer();
      let s = '';
      const bytes = new Uint8Array(buf);
      const CH = 0x8000;
      for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
      return { data: btoa(s), mime: mime.split(';')[0], w: c.width, h: c.height };
    }, 'assets/video/' + file, maxW, bps);

    if (!b64 || !b64.data) { console.log('    failed, keeping the original'); continue; }
    const out = Buffer.from(b64.data, 'base64');
    const isMp4 = b64.mime === 'video/mp4';
    const target = path.join(VID, isMp4 ? file : file.replace('.mp4', '.webm'));
    if (out.length > 1024 && out.length < fs.statSync(src).size) {
      fs.writeFileSync(target, out);
      console.log(`    ${b64.w}x${b64.h}  ${wasKb}kb -> ${Math.round(out.length / 1024)}kb  ${path.basename(target)}`);
    } else {
      console.log(`    result was not smaller (${Math.round(out.length / 1024)}kb), keeping the original`);
    }
  }

  await browser.close();
})();
