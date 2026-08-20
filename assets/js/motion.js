/* ============================================================
   motion.js — the cinematic layer
   Lenis for inertial scrolling, GSAP ScrollTrigger for the
   pinned reel, the horizontal journey and the parallax passes.

   Everything here is progressive: if the CDN never arrives the
   page still works, it just stops being a film.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  if (!hasGSAP) { document.documentElement.classList.add('no-motion'); return; }
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('has-motion');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- inertial scroll ---------------- */
  if (typeof window.Lenis !== 'undefined' && !reduced) {
    var lenis = new Lenis({
      duration: 1.05,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }

  /* ---------------- 1 · hero copy lifts on scroll ---------------- */
  var heroIn = $('.hero-in');
  if (heroIn && !reduced) {
    gsap.to(heroIn, {
      y: -90, opacity: 0.15, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
    });
  }

  /* ---------------- 2 · the instrument ---------------- */
  // No pin, no hijacked scroll. The section is one screen tall and the camera
  // moves only while it is on screen, so the visitor stays in control.
  var reel = $('#reel');
  if (reel && !reduced) {
    var caps = $$('.reel-cap', reel);
    var bar = $('#reel-bar');

    ScrollTrigger.create({
      trigger: reel,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.7,
      onUpdate: function (self) {
        var p = self.progress;
        if (bar) bar.style.transform = 'scaleX(' + p + ')';

        // scattered readings reconcile onto the line as the reader
        // moves down the copy, which is exactly what the captions say
        var r = window.__reel;
        if (r) r.progress = Math.min(1, Math.max(0, (p - 0.08) / 0.62));

        var idx = Math.min(caps.length - 1, Math.floor(Math.max(0, (p - 0.1) / 0.8) * caps.length));
        caps.forEach(function (c, i) { c.classList.toggle('on', i === idx); });
      },
    });
  } else if (reel) {
    $$('.reel-cap', reel).forEach(function (c) { c.classList.add('on'); });
  }

  /* ---------------- 3 · the four steps ---------------- */
  // These used to ride a pinned horizontal track. A reader looking for how an
  // engagement works should not have to scroll sideways to find out.
  var track = $('#journey-track');
  if (track) track.classList.add('is-static');

  /* ---------------- 4 · parallax passes ---------------- */
  if (!reduced) {
    $$('[data-par]').forEach(function (el) {
      var amt = parseFloat(el.getAttribute('data-par')) || 12;
      gsap.fromTo(el, { yPercent: -amt }, {
        yPercent: amt, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
      });
    });
  }

  /* ---------------- 5 · batched card reveals ---------------- */
  if (!reduced) {
    ScrollTrigger.batch('.gsap-in', {
      start: 'top 88%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1, y: 0, duration: 1.0, stagger: 0.09, ease: 'power3.out', overwrite: true
        });
      }
    });
  } else {
    gsap.set('.gsap-in', { opacity: 1, y: 0 });
  }

  /* ---------------- 6 · section rules draw themselves ---------------- */
  $$('.rule').forEach(function (el) {
    gsap.fromTo(el, { scaleX: 0 }, {
      scaleX: 1, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });

  /* fonts and images shift layout; recompute once they land */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
