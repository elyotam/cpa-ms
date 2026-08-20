/* ============================================================
   app.js — site behaviour
   No dependencies. Everything degrades gracefully.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------------- theme ---------------- */
  var THEME_KEY = 'ms-theme';
  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
    $$('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', mode === 'light' ? 'מעבר למצב כהה' : 'מעבר למצב בהיר');
      var sun = $('.i-sun', b), moon = $('.i-moon', b);
      if (sun && moon) {
        sun.style.display = mode === 'light' ? 'none' : '';
        moon.style.display = mode === 'light' ? '' : 'none';
      }
    });
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'light' ? '#F6F4F0' : '#070B14');
  }
  var saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
  applyTheme(saved || 'dark');
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme-toggle]');
    if (!b) return;
    applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  });

  /* ---------------- loader ---------------- */
  (function loader() {
    var el = $('#loader');
    if (!el) return;
    var fill = $('#load-fill'), pct = $('#load-pct');
    var v = 0, done = false;
    var tick = setInterval(function () {
      v += Math.random() * 13 + 5;
      if (v > 92 && !done) v = 92;
      render(Math.min(v, 100));
    }, 130);

    function render(n) {
      if (fill) fill.style.width = n + '%';
      if (pct) pct.textContent = Math.round(n) + '%';
    }
    function finish() {
      if (done) return;
      done = true;
      v = 100; render(100);
      clearInterval(tick);
      setTimeout(function () {
        el.classList.add('done');
        document.body.classList.remove('is-locked');
        kickHero();
        setTimeout(function () { el.remove(); }, 900);
      }, 340);
    }
    document.body.classList.add('is-locked');
    if (document.readyState === 'complete') setTimeout(finish, 420);
    else window.addEventListener('load', function () { setTimeout(finish, 420); });
    setTimeout(finish, 4200); // hard ceiling
  })();

  function kickHero() {
    var h = $('.hero-in');
    if (h) h.classList.add('in');
    $$('.hero-in [data-rv]').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('in'); }, 90 * i);
    });
  }
  if (!$('#loader')) { setTimeout(kickHero, 60); }

  /* ---------------- split words for masked reveal ---------------- */
  $$('[data-split]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var outer = document.createElement('span');
      outer.className = 'word';
      var inner = document.createElement('span');
      inner.textContent = w;
      inner.style.transitionDelay = (i * 0.055) + 's';
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------------- reveal on scroll ---------------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        var kids = en.target.classList.contains('stagger') ? $$(':scope > *', en.target) : [];
        kids.forEach(function (k, i) { k.style.transitionDelay = (i * 0.08) + 's'; });
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('[data-rv], .stagger, .proc-line').forEach(function (el) {
      if (el.closest('.hero-in')) return;
      io.observe(el);
    });
  } else {
    $$('[data-rv], .stagger, .proc-line').forEach(function (el) { el.classList.add('in'); });
  }

  /* A fast scroll can carry an element past the observer without it ever
     reporting an intersection, leaving it invisible. Sweep up the stragglers. */
  (function revealSafetyNet() {
    var queued = false;
    function sweep() {
      queued = false;
      var limit = window.innerHeight * 0.94;
      $$('[data-rv]:not(.in), .stagger:not(.in), .proc-line:not(.in)').forEach(function (el) {
        if (el.getBoundingClientRect().top < limit) el.classList.add('in');
      });
    }
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(sweep); }
    }, { passive: true });
    window.addEventListener('resize', sweep);
    setTimeout(sweep, 1200);
  })();

  /* ---------------- nav ---------------- */
  (function nav() {
    var bar = $('.nav');
    if (!bar) return;
    // pages with a sticky sub-nav keep the header pinned, otherwise the
    // sub-nav floats over the content with a 74px hole above it
    var pinned = !!$('.subnav');
    var last = 0;
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    function onScroll() {
      var y = window.scrollY;
      bar.classList.toggle('solid', y > 28);
      if (!pinned && y > 380 && y > last + 4) bar.classList.add('hide');
      else if (pinned || y < last - 4 || y < 380) bar.classList.remove('hide');
      last = y;
    }
  })();

  (function drawer() {
    var burger = $('#burger'), panel = $('#drawer');
    if (!burger || !panel) return;
    var links = $$('.d-link', panel);
    links.forEach(function (l, i) { l.style.transitionDelay = (0.07 + i * 0.055) + 's'; });
    function toggle(force) {
      var open = force !== undefined ? force : !panel.classList.contains('on');
      panel.classList.toggle('on', open);
      burger.classList.toggle('on', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
    }
    burger.addEventListener('click', function () { toggle(); });
    $$('a', panel).forEach(function (a) { a.addEventListener('click', function () { toggle(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  })();

  /* ---------------- scroll progress + back to top ---------------- */
  (function progress() {
    var bar = $('#progress i'), top = $('#to-top');
    if (!bar && !top) return;
    window.addEventListener('scroll', function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      if (bar) bar.style.width = p.toFixed(2) + '%';
      if (top) top.classList.toggle('on', window.scrollY > 620);
    }, { passive: true });
    if (top) top.addEventListener('click', function () {
      if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.2 });
      else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  })();

  /* ---------------- card spotlight ---------------- */
  $$('.svc').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });

  /* ---------------- animated counters ---------------- */
  (function counters() {
    var els = $$('[data-count]');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(function (e) {
        var v = parseFloat(e.getAttribute('data-count'));
        e.textContent = (v >= 10000 ? v.toLocaleString('en-US') : String(v)) + (e.getAttribute('data-suffix') || '');
      });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        obs.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        var group = target >= 10000;
        var fmt = function (n) { return (group ? n.toLocaleString('en-US') : String(n)) + suffix; };
        var dur = 1500, t0 = null;
        if (reduced) { el.textContent = fmt(target); return; }
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    els.forEach(function (e) { obs.observe(e); });
  })();

  /* ---------------- pain-point selector ---------------- */
  (function pain() {
    var btns = $$('.pain-btn');
    if (!btns.length) return;
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-pain');
        btns.forEach(function (o) { o.classList.toggle('on', o === b); o.setAttribute('aria-selected', String(o === b)); });
        $$('.pain-pane').forEach(function (p) { p.classList.toggle('on', p.id === 'pain-' + id); });
      });
    });
  })();

  /* ---------------- testimonials ---------------- */
  (function testimonials() {
    var track = $('#tst-track');
    if (!track) return;
    var slides = $$('.tst', track);
    var dotsWrap = $('#tst-dots');
    var i = 0, timer = null;

    slides.forEach(function (_, n) {
      var d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'המלצה ' + (n + 1));
      d.addEventListener('click', function () { go(n, true); });
      dotsWrap.appendChild(d);
    });

    function go(n, manual) {
      i = (n + slides.length) % slides.length;
      // RTL: slides advance to the right visually, translate positive
      track.style.transform = 'translateX(' + (i * 100) + '%)';
      $$('button', dotsWrap).forEach(function (d, k) { d.classList.toggle('on', k === i); });
      slides.forEach(function (s, k) { s.setAttribute('aria-hidden', String(k !== i)); });
      if (manual) restart();
    }
    function restart() {
      clearInterval(timer);
      if (!reduced) timer = setInterval(function () { go(i + 1); }, 7000);
    }
    $('#tst-prev') && $('#tst-prev').addEventListener('click', function () { go(i - 1, true); });
    $('#tst-next') && $('#tst-next').addEventListener('click', function () { go(i + 1, true); });

    // swipe
    var sx = null;
    track.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    track.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var d = e.clientX - sx;
      if (Math.abs(d) > 44) go(i + (d > 0 ? -1 : 1), true);
      sx = null;
    });

    go(0);
    restart();
  })();

  /* ---------------- sub-nav scroll spy ---------------- */
  (function spy() {
    var links = $$('.subnav a[href^="#"]');
    if (!links.length) return;
    var targets = links.map(function (l) { return $(l.getAttribute('href')); }).filter(Boolean);
    if (!targets.length) return;
    window.addEventListener('scroll', function () {
      var y = window.scrollY + 190;
      var cur = targets[0];
      targets.forEach(function (t) { if (t.offsetTop <= y) cur = t; });
      links.forEach(function (l) { l.classList.toggle('on', l.getAttribute('href') === '#' + cur.id); });
    }, { passive: true });
  })();

  /* ---------------- select float-label helper ---------------- */
  $$('.f-field select').forEach(function (s) {
    var sync = function () { s.classList.toggle('filled', !!s.value); };
    s.addEventListener('change', sync); sync();
  });

  /* ---------------- contact form ---------------- */
  (function form() {
    var f = $('#lead-form');
    if (!f) return;
    var ok = $('#form-ok');

    var rules = {
      first: function (v) { return v.trim().length >= 2 || 'נא למלא שם פרטי'; },
      last: function (v) { return v.trim().length >= 2 || 'נא למלא שם משפחה'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'כתובת דוא״ל לא תקינה'; },
      phone: function (v) { return /^0(5\d|[2-4|8-9])[-\s]?\d{7}$/.test(v.replace(/\s|-/g, '')) || 'מספר טלפון ישראלי לא תקין'; },
      topic: function (v) { return v !== '' || 'נא לבחור נושא'; },
      msg: function (v) { return v.trim().length >= 3 || 'נא לכתוב הודעה קצרה'; }
    };

    function validateField(name) {
      var input = f.elements[name];
      if (!input) return true;
      var wrap = input.closest('.f-field');
      var errEl = wrap ? $('.f-err', wrap) : null;
      var res = rules[name] ? rules[name](input.value) : true;
      var bad = res !== true;
      if (wrap) wrap.classList.toggle('err', bad);
      if (errEl) errEl.textContent = bad ? res : '';
      input.setAttribute('aria-invalid', String(bad));
      return !bad;
    }

    Object.keys(rules).forEach(function (n) {
      var el = f.elements[n];
      if (!el) return;
      el.addEventListener('blur', function () { validateField(n); });
      el.addEventListener('input', function () {
        var w = el.closest('.f-field');
        if (w && w.classList.contains('err')) validateField(n);
      });
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      // validate every field, not just up to the first failure —
      // .every() short-circuits and would mark only one input
      var valid = Object.keys(rules)
        .map(function (n) { return validateField(n); })
        .every(Boolean);
      var consent = f.elements['consent'];
      if (consent && !consent.checked) {
        valid = false;
        consent.focus();
        consent.closest('.f-consent').style.color = '#E0645C';
      } else if (consent) {
        consent.closest('.f-consent').style.color = '';
      }
      if (!valid) {
        var firstErr = $('.f-field.err input, .f-field.err select, .f-field.err textarea', f);
        if (firstErr) firstErr.focus();
        return;
      }

      // No backend on a static site: hand the enquiry to WhatsApp,
      // and show the confirmation state either way.
      var d = {
        first: f.elements['first'].value.trim(),
        last: f.elements['last'].value.trim(),
        email: f.elements['email'].value.trim(),
        phone: f.elements['phone'].value.trim(),
        topic: f.elements['topic'].options[f.elements['topic'].selectedIndex].text,
        msg: f.elements['msg'].value.trim()
      };
      var text =
        'פנייה חדשה מהאתר\n' +
        'שם: ' + d.first + ' ' + d.last + '\n' +
        'טלפון: ' + d.phone + '\n' +
        'דוא״ל: ' + d.email + '\n' +
        'נושא: ' + d.topic + '\n' +
        'הודעה: ' + d.msg;

      var url = 'https://wa.me/972544966495?text=' + encodeURIComponent(text);
      window.open(url, '_blank', 'noopener');

      f.style.display = 'none';
      if (ok) {
        ok.classList.add('on');
        ok.setAttribute('tabindex', '-1');
        ok.focus();
      }
    });
  })();

  /* ---------------- accessibility widget ---------------- */
  (function a11y() {
    var btn = $('#a11y-btn'), panel = $('#a11y-panel');
    if (!btn || !panel) return;
    var root = document.documentElement;
    var KEY = 'ms-a11y';
    var state = { size: 0, contrast: false, links: false, nomotion: false, readable: false };
    try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}

    function paint() {
      root.style.fontSize = state.size ? (100 + state.size * 12.5) + '%' : '';
      root.classList.toggle('a11y-contrast', state.contrast);
      root.classList.toggle('a11y-links', state.links);
      root.classList.toggle('a11y-nomotion', state.nomotion);
      root.classList.toggle('a11y-readable', state.readable);
      $$('[data-a11y]', panel).forEach(function (b) {
        var k = b.getAttribute('data-a11y');
        if (k === 'bigger' || k === 'smaller') return;
        b.classList.toggle('on', !!state[k]);
      });
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    }

    function toggle(open) {
      var o = open !== undefined ? open : !panel.classList.contains('on');
      panel.classList.toggle('on', o);
      btn.setAttribute('aria-expanded', String(o));
    }
    btn.addEventListener('click', function () { toggle(); });
    $('#a11y-close') && $('#a11y-close').addEventListener('click', function () { toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target) && !btn.contains(e.target)) toggle(false);
    });

    $$('[data-a11y]', panel).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-a11y');
        if (k === 'bigger') state.size = Math.min(3, state.size + 1);
        else if (k === 'smaller') state.size = Math.max(-1, state.size - 1);
        else state[k] = !state[k];
        paint();
      });
    });
    $('#a11y-reset') && $('#a11y-reset').addEventListener('click', function () {
      state = { size: 0, contrast: false, links: false, nomotion: false, readable: false };
      paint();
    });
    paint();
  })();

  /* ---------------- brand film, loaded on approach ---------------- */
  (function ambientVideo() {
    var vids = $$('video[data-src]');
    if (!vids.length || reduced) return;       // reduced motion keeps the poster
    function load(v) {
      if (v.src) return;
      v.src = v.getAttribute('data-src');
      v.play().catch(function () {});
    }
    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) load(e.target);
          else if (e.target.src) e.target.pause();
        });
      }, { rootMargin: '300px 0px' });
      vids.forEach(function (v) { io2.observe(v); });
    } else vids.forEach(load);
  })();

  /* ---------------- testimonial lightbox ---------------- */
  (function videoBox() {
    var box = $('#vbox'), vid = $('#vbox-video'), closeBtn = $('#vbox-close');
    if (!box || !vid) return;
    var opener = null;

    function open(src, from) {
      opener = from;
      vid.src = src;
      box.hidden = false;
      requestAnimationFrame(function () { box.classList.add('on'); });
      document.body.classList.add('is-locked');
      if (window.__lenis) window.__lenis.stop();
      vid.play().catch(function () {});   // a blocked autoplay just leaves the controls
      closeBtn.focus();
    }
    function close() {
      box.classList.remove('on');
      vid.pause();
      document.body.classList.remove('is-locked');
      if (window.__lenis) window.__lenis.start();
      setTimeout(function () { box.hidden = true; vid.removeAttribute('src'); vid.load(); }, 350);
      if (opener) opener.focus();
    }

    $$('.vcard').forEach(function (card) {
      card.addEventListener('click', function () { open(card.getAttribute('data-video'), card); });
    });
    closeBtn.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.vbox-stage') === null) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !box.hidden) close();
    });
  })();

  /* ---------------- current year ---------------- */
  $$('[data-year]').forEach(function (e) { e.textContent = new Date().getFullYear(); });

  /* ---------------- smooth in-page anchors with nav offset ---------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var offset = ($('.subnav') ? 132 : 88);
    var y = target.getBoundingClientRect().top + window.scrollY - offset;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });
})();
