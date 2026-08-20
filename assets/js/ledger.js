/* ============================================================
   ledger.js — "The Ledger"

   The practice's material is figures, not objects, so the hero
   draws figures: a ruled ledger running back in perspective, a
   growth curve drawn across it, and a read-head that sweeps the
   line and reports the value under it.

   Two compositions off one engine:
     hero — calm, the curve already drawn, the read-head sweeping
     reel — scattered readings that converge onto the line as the
            reader scrolls, which is what the captions describe

   Canvas 2D on purpose. Precision line work and real numerals are
   what this needs, and neither survives a metal shader.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* All four are the logo's two blues, opened up for a dark ground.
     #0E2034 is the mark's ink, #26578D its steel. */
  var RULE = 'rgba(150,178,212,';        // ledger rules
  var CURVE = 'rgba(61,220,151,';        // the leading end — growth is green
  var STEEL = 'rgba(61,139,255,';        // the brand blue at full voltage
  var STEEL_HI = 'rgba(126,180,255,';
  var ACCENT = 'rgba(120,200,255,';      // the read-head
  var FIG = 'rgba(214,228,246,';         // figures

  function create(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return null;

    var W = 0, H = 0, dpr = 1;
    var raf = null, running = false;
    var t0 = performance.now();
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    var api = {
      /* 0 → 1. In the reel this is scroll; in the hero it stays at 1. */
      progress: opts.mode === 'reel' ? 0 : 1,
      shift: opts.shift || 0,
      mode: opts.mode || 'hero'
    };

    /* ---------- the series ---------- */
    // A deterministic climb with believable noise: a small correction
    // dip, then recovery. Same shape every load, which matters — the
    // hero should not look different to two people on the phone.
    var N = 44;
    var series = new Float32Array(N);
    (function build() {
      var s = 20260820;
      function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
      for (var i = 0; i < N; i++) {
        var p = i / (N - 1);
        // a firm trend, a shallow correction around the middle, and noise
        // small enough that the shape never stops climbing overall
        var trend = Math.pow(p, 0.86);
        var dip = Math.exp(-Math.pow((p - 0.52) * 6.0, 2)) * 0.085;
        var jitter = (rnd() - 0.5) * 0.030;
        series[i] = Math.max(0.04, Math.min(1, trend - dip + jitter));
      }
      // enforce the overall climb: no point may sit below the one four back
      for (var k = 4; k < N; k++) {
        if (series[k] < series[k - 4] - 0.02) series[k] = series[k - 4] - 0.02;
      }
      for (var j = 0; j < N; j++) series[j] = series[j] * 0.80 + 0.09;
    })();

    // scattered readings for the reel, pre-allocated
    var SC = 90;
    var scat = new Float32Array(SC * 4);   // x, y, targetIdx, phase
    (function scatter() {
      var s = 7717;
      function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
      for (var i = 0; i < SC; i++) {
        var idx = Math.floor(rnd() * (N - 1));
        scat[i * 4] = rnd();
        scat[i * 4 + 1] = rnd();
        scat[i * 4 + 2] = idx;
        scat[i * 4 + 3] = rnd() * Math.PI * 2;
      }
    })();

    /* ---------- geometry ---------- */
    function plotX(i) { return pad.l + (i / (N - 1)) * (W - pad.l - pad.r); }
    function plotY(v) { return pad.t + (1 - v) * (H - pad.t - pad.b); }
    var pad = { l: 0, r: 0, t: 0, b: 0 };

    function layout() {
      var narrow = W < 900;
      // RTL: the copy owns the right, so on desktop the sheet is plotted
      // entirely within the left side and never runs beneath the text
      pad.l = W * (narrow ? 0.14 : 0.09);   // room for the value labels
      pad.r = W * (narrow ? 0.08 : 0.50);
      pad.t = H * (narrow ? 0.30 : 0.28);
      pad.b = H * 0.22;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width));
      var h = Math.max(1, Math.round(r.height));
      if (W === w && H === h && canvas.width === Math.round(w * dpr)) return;
      W = w; H = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    }

    /* ---------- pieces ---------- */
    function ground(px, py) {
      ctx.clearRect(0, 0, W, H);

      // one soft light, placed behind the line's high end
      var cx = plotX(N - 1) + px * 26;
      var cy = plotY(series[N - 1]) + py * 18;
      var r = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
      r.addColorStop(0, 'rgba(61,139,255,0.26)');
      r.addColorStop(0.4, 'rgba(61,139,255,0.09)');
      r.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = r;
      ctx.fillRect(0, 0, W, H);
    }

    /* Monotone cubic control points. Straight segments between 44 samples
       read as a jagged sawtooth; this gives the line the drawn quality a
       printed report has, without letting it overshoot into false peaks. */
    function tangents() {
      if (tan) return tan;
      tan = new Float32Array(N);
      var d = new Float32Array(N - 1);
      var i;
      for (i = 0; i < N - 1; i++) d[i] = series[i + 1] - series[i];
      tan[0] = d[0];
      tan[N - 1] = d[N - 2];
      for (i = 1; i < N - 1; i++) {
        if (d[i - 1] * d[i] <= 0) tan[i] = 0;              // flatten at turns
        else tan[i] = (d[i - 1] + d[i]) / 2;
      }
      for (i = 0; i < N - 1; i++) {
        if (d[i] === 0) { tan[i] = 0; tan[i + 1] = 0; continue; }
        var a = tan[i] / d[i], b = tan[i + 1] / d[i];
        var h = a * a + b * b;
        if (h > 9) { var t = 3 / Math.sqrt(h); tan[i] = t * a * d[i]; tan[i + 1] = t * b * d[i]; }
      }
      return tan;
    }
    var tan = null;

    function tracePath(px, py, last) {
      var T = tangents();
      ctx.beginPath();
      ctx.moveTo(plotX(0) + px * 14, plotY(series[0]) + py * 10);
      for (var i = 0; i < last; i++) {
        var x0 = plotX(i) + px * 14, y0 = plotY(series[i]) + py * 10;
        var x1 = plotX(i + 1) + px * 14, y1 = plotY(series[i + 1]) + py * 10;
        var dx = (x1 - x0) / 3;
        // tangents are in value space; plotY inverts, hence the sign
        var c1y = y0 - (T[i] / 3) * (H - pad.t - pad.b);
        var c2y = y1 + (T[i + 1] / 3) * (H - pad.t - pad.b);
        ctx.bezierCurveTo(x0 + dx, c1y, x1 - dx, c2y, x1, y1);
      }
    }

    // the sheet: value gridlines with their figures, and a firm baseline
    function rules(px, py) {
      var left = plotX(0) + px * 14;
      var right = plotX(N - 1) + px * 14;
      var base = plotY(0) + py * 10;

      // horizontal value lines, four of them, each labelled
      var steps = 4;
      ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
      ctx.textBaseline = 'middle';
      for (var i = 0; i <= steps; i++) {
        var v = i / steps;
        var y = Math.round(plotY(v * 0.95) + py * 10) + 0.5;
        var major = i === 0;
        ctx.strokeStyle = RULE + (major ? '0.30)' : '0.10)');
        ctx.lineWidth = major ? 1.3 : 1;
        ctx.beginPath();
        ctx.moveTo(left - 8, y);
        ctx.lineTo(right + 10, y);
        ctx.stroke();

        if (i > 0) {
          var money = Math.round((40000 + v * 0.95 * 760000) / 1000);
          ctx.textAlign = 'right';
          ctx.fillStyle = FIG + '0.34)';
          ctx.fillText('₪' + money + 'K', left - 14, y);
        }
      }

      // period marks along the base
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      var years = 5;
      for (var q = 0; q < years; q++) {
        var f = q / (years - 1);
        var x = Math.round(left + f * (right - left)) + 0.5;
        ctx.strokeStyle = RULE + '0.20)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.lineTo(x, base + 8);
        ctx.stroke();
        ctx.fillStyle = FIG + '0.30)';
        ctx.fillText(String(2022 + q), x, base + 14);
      }

      // fine graduations between them
      ctx.strokeStyle = RULE + '0.10)';
      for (var t = 0; t < N; t += 2) {
        var tx = Math.round(plotX(t) + px * 14) + 0.5;
        ctx.beginPath();
        ctx.moveTo(tx, base);
        ctx.lineTo(tx, base + 4);
        ctx.stroke();
      }
    }

    // volume behind the line. Derived from the series so the two always
    // agree, with a little variance so it does not look like a comb.
    function bars(px, py, drawn, el) {
      var base = plotY(0) + py * 10;
      var count = 22;
      var slot = (plotX(N - 1) - plotX(0)) / count;
      var last = Math.floor(count * drawn);
      for (var i = 0; i < last; i++) {
        var f = i / (count - 1);
        var idx = Math.min(N - 1, Math.round(f * (N - 1)));
        var breathe = 1 + Math.sin(el * 0.8 + i * 0.7) * 0.035;
        var h = (series[idx] * 0.52 + 0.06) * (base - pad.t) * breathe;
        var x = plotX(0) + px * 14 + i * slot + slot * 0.22;
        var w = slot * 0.56;
        var g = ctx.createLinearGradient(0, base - h, 0, base);
        g.addColorStop(0, STEEL + '0.42)');
        g.addColorStop(1, STEEL + '0.04)');
        ctx.fillStyle = g;
        ctx.fillRect(x, base - h, w, h);
      }
    }

    // readings that have not been reconciled onto the line yet
    function scattered(px, py, conv, el) {
      if (conv >= 0.999) return;
      var spread = 1 - conv;
      for (var i = 0; i < SC; i++) {
        var idx = scat[i * 4 + 2];
        var tx = plotX(idx) + px * 14;
        var ty = plotY(series[idx]) + py * 10;
        var fx = pad.l + scat[i * 4] * (W - pad.l - pad.r);
        var fy = pad.t * 0.5 + scat[i * 4 + 1] * (H - pad.t * 0.5 - pad.b * 0.6);
        var drift = Math.sin(el * 0.7 + scat[i * 4 + 3]) * 6 * spread;

        var x = fx + (tx - fx) * conv + drift;
        var y = fy + (ty - fy) * conv + drift * 0.6;

        ctx.fillStyle = FIG + (0.12 + spread * 0.40).toFixed(3) + ')';
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
    }

    var lastEl = 0;
    function curve(px, py, drawn) {
      var last = Math.max(1, Math.floor((N - 1) * drawn));
      var base = plotY(0) + py * 10;

      // area beneath the line
      tracePath(px, py, last);
      ctx.lineTo(plotX(last) + px * 14, base);
      ctx.lineTo(plotX(0) + px * 14, base);
      ctx.closePath();
      var fill = ctx.createLinearGradient(0, pad.t, 0, base);
      fill.addColorStop(0, STEEL + '0.46)');
      fill.addColorStop(0.55, STEEL + '0.15)');
      fill.addColorStop(1, STEEL + '0)');
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // glow, wide and soft, so the line sits in light rather than on flat ink
      tracePath(px, py, last);
      ctx.strokeStyle = STEEL + '0.16)';
      ctx.lineWidth = 22;
      ctx.stroke();
      tracePath(px, py, last);
      ctx.strokeStyle = STEEL + '0.30)';
      ctx.lineWidth = 9;
      ctx.stroke();
      tracePath(px, py, last);
      ctx.strokeStyle = STEEL_HI + '0.34)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // the stroke, running from deep green at the start to near-white at the
      // leading end, which is what makes it read as travelling
      var lg = ctx.createLinearGradient(plotX(0), 0, plotX(N - 1), 0);
      lg.addColorStop(0, STEEL + '0.55)');
      lg.addColorStop(0.55, STEEL_HI + '0.95)');
      lg.addColorStop(1, CURVE + '1)');
      tracePath(px, py, last);
      ctx.strokeStyle = lg;
      ctx.lineWidth = 3;
      ctx.stroke();

      // the leading end. It keeps a slow pulse even once the line is drawn,
      // so the sheet reads as live rather than printed.
      var hx = plotX(last) + px * 14;
      var hy = plotY(series[last]) + py * 10;
      var beat = 0.5 + 0.5 * Math.sin(lastEl * 2.0);
      ctx.strokeStyle = CURVE + (0.55 - beat * 0.40).toFixed(3) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(hx, hy, 8 + beat * 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.shadowColor = CURVE + '0.9)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = CURVE + '1)';
      ctx.beginPath();
      ctx.arc(hx, hy, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // the read-head: a rule across the sheet with the value under it
    function readHead(px, py, el, conv) {
      if (conv < 0.55) return;
      var span = (Math.sin(el * 0.28) * 0.5 + 0.5);
      var i = Math.round(span * (N - 1));
      var x = plotX(i) + px * 14;
      var y = plotY(series[i]) + py * 10;
      var alpha = Math.min(1, (conv - 0.55) / 0.3);

      ctx.strokeStyle = ACCENT + (0.30 * alpha).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, pad.t - H * 0.05);
      ctx.lineTo(Math.round(x) + 0.5, H);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = ACCENT + (0.95 * alpha).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = ACCENT + (0.30 * alpha).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 8 + Math.sin(el * 2.2) * 1.6, 0, Math.PI * 2);
      ctx.stroke();

      // the figure under the head, which is the whole point
      var value = Math.round(40000 + series[i] * 760000);
      var label = '₪' + value.toLocaleString('en-US');
      ctx.font = '500 ' + (W < 760 ? 11 : 13) + 'px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = FIG + (0.80 * alpha).toFixed(3) + ')';
      ctx.fillText(label, x, y - 16);
    }

    /* ---------- loop ---------- */
    function frame(now) {
      if (!running) { raf = null; return; }
      resize();

      var el = reduced ? 6 : (now - t0) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      var px = mouse.x, py = mouse.y;

      if (opts.onFrame) opts.onFrame(api, el);

      var conv = api.mode === 'reel' ? api.progress : 1;
      // the hero draws itself in over the first beat and then holds
      var drawn = api.mode === 'reel'
        ? Math.min(1, Math.max(0, (api.progress - 0.1) / 0.55))
        : (reduced ? 1 : Math.min(1, Math.pow(Math.min(1, el / 2.0), 0.7)));

      ctx.save();
      ctx.translate(api.shift * W, 0);
      lastEl = el;
      ground(px, py);
      rules(px, py);
      bars(px, py, drawn, el);
      scattered(px, py, conv, el);
      curve(px, py, drawn);
      readHead(px, py, el, conv * drawn);
      ctx.restore();

      raf = requestAnimationFrame(frame);
    }

    api.start = function () { if (raf === null) { running = true; raf = requestAnimationFrame(frame); } };
    api.stop = function () { running = false; };
    api.pointer = function (nx, ny) { mouse.tx = nx; mouse.ty = ny; };
    api.resize = resize;

    resize();
    return api;
  }

  window.Ledger = { create: create };

  /* ---------------- hero ---------------- */
  var heroCanvas = document.getElementById('hero-canvas');
  if (!heroCanvas) return;

  var hero = create(heroCanvas, {
    mode: 'hero',
    // RTL: the copy sits right, so the sheet is nudged left
    shift: 0,
    onFrame: function (api) {
      api.shift = 0;
    }
  });
  if (!hero) return;

  window.addEventListener('pointermove', function (e) {
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = (e.clientY / window.innerHeight) * 2 - 1;
    hero.pointer(nx, ny);
    if (window.__reel) window.__reel.pointer(nx * 0.5, ny * 0.5);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    document.hidden ? hero.stop() : hero.start();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? hero.start() : hero.stop(); });
    }, { threshold: 0.01 }).observe(heroCanvas);
  }
  hero.start();

  /* ---------------- reel ---------------- */
  var reelCanvas = document.getElementById('reel-gl');
  if (reelCanvas) {
    var reel = create(reelCanvas, {
      mode: 'reel',
      shift: 0,
      onFrame: function (api) { api.shift = 0; }
    });
    if (reel) {
      window.__reel = reel;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { e.isIntersecting ? reel.start() : reel.stop(); });
        }, { threshold: 0.01 }).observe(reelCanvas);
      } else reel.start();
    }
  }

  window.addEventListener('resize', function () {
    hero.resize();
    if (window.__reel) window.__reel.resize();
  });
})();
