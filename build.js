/* ============================================================
   build.js — מרכיב את עמודי האתר מתוך src/*.body.html
   הרצה:  node build.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const SITE = {
  name: 'משה שטרן',
  role: 'רואה חשבון · CPA · MBA',
  phone: '054-4966495',
  telHref: 'tel:0544966495',
  wa: 'https://wa.me/972544966495',
  email: 'moshe@cpa-ms.com',
  address: 'שמעיה 4, אלעד',
  origin: 'https://www.cpa-ms.com'
};

const NAV = [
  { href: 'index.html', label: 'בית' },
  { href: 'about.html', label: 'אודות' },
  { href: 'services.html', label: 'שירותי המשרד' },
  { href: 'tools.html', label: 'מחשבוני מס' },
  { href: 'testimonials.html', label: 'המלצות' },
  { href: 'articles.html', label: 'מאמרים' },
  { href: 'resources.html', label: 'מידע שימושי' },
  { href: 'contact.html', label: 'צור קשר' }
];

const ICON = {
  phone: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1a13 13 0 0 1-6.7-5.8c-.5-.9-.8-1.8-.8-2.6 0-.9.4-1.6.9-2 .2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.4l.8 2c.1.2 0 .4-.1.6l-.4.5c-.1.1-.3.3-.1.6.5.8 1 1.4 1.7 2 .6.5 1.2.8 1.5 1 .2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.4.1.2.1.9-.1 1.5z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>'
};

function head(p) {
  return `<!doctype html>
<html lang="he" dir="rtl" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${p.title}</title>
<meta name="description" content="${p.desc}">
<meta name="theme-color" content="#F6F4F0">
<link rel="canonical" href="${SITE.origin}/${p.slug === 'index' ? '' : p.slug + '.html'}">
<meta property="og:type" content="website">
<meta property="og:locale" content="he_IL">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.desc}">
<meta property="og:image" content="${SITE.origin}/assets/img/og-cover.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="assets/img/favicon.png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;800;900&family=Heebo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap">
<link rel="stylesheet" href="assets/css/style.css">
${p.jsonld ? '<script type="application/ld+json">\n' + JSON.stringify(p.jsonld, null, 2) + '\n</script>' : ''}
<script>/* the stored choice has to land before first paint, or the page flashes */
(function(){try{var t=localStorage.getItem('ms-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body>

<a class="skip" href="#main">דילוג לתוכן הראשי</a>
<div class="progress" id="progress" aria-hidden="true"><i></i></div>
`;
}

function nav(slug) {
  const links = NAV.map(n =>
    `      <a href="${n.href}"${n.href === slug + '.html' ? ' aria-current="page"' : ''}>${n.label}</a>`
  ).join('\n');
  const drawer = NAV.map((n, i) =>
    `  <a class="d-link" href="${n.href}"><i>0${i + 1}</i>${n.label}</a>`
  ).join('\n');

  return `<header class="nav" id="nav">
  <div class="wrap nav-in">
    <a class="brand" href="index.html" aria-label="${SITE.name}, ${SITE.role} — לעמוד הבית">
      <span class="brand-mark"><img src="assets/img/logo-mark.png" alt="" width="216" height="216"></span>
      <span class="brand-txt">
        <span class="brand-name">${SITE.name}</span>
        <span class="brand-sub">${SITE.role}</span>
      </span>
    </a>
    <nav class="nav-links" aria-label="ניווט ראשי">
${links}
    </nav>
    <div class="nav-act">
      <button class="icon-btn" data-theme-toggle type="button" aria-label="מעבר למצב בהיר">
        <svg class="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        <svg class="i-moon" viewBox="0 0 24 24" style="display:none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      </button>
      <a class="nav-cta" href="${SITE.telHref}">${ICON.phone}${SITE.phone}</a>
      <button class="burger" id="burger" type="button" aria-label="תפריט" aria-expanded="false" aria-controls="drawer">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>

<div class="drawer" id="drawer">
${drawer}
  <div class="drawer-foot">
    <a class="btn btn--pri btn--full" href="${SITE.telHref}">${ICON.phone}${SITE.phone}</a>
    <a class="btn btn--wa btn--full" href="${SITE.wa}" target="_blank" rel="noopener">${ICON.wa}וואטסאפ</a>
  </div>
</div>
`;
}

function ctaBand() {
  return `<section class="sec" style="padding-top:0">
  <div class="wrap">
    <div class="band" data-rv="zoom">
      <video class="band-video" poster="assets/video/brand-b.webp" muted loop playsinline
             preload="none" data-src="assets/video/brand-b.mp4" aria-hidden="true"></video>
      <div class="aura aura--brass" aria-hidden="true"></div>
      <h2>הצעד הראשון הוא שיחה של חצי שעה</h2>
      <p>בלי מצגות ובלי התחייבות. עוברים על המספרים, מסמנים את שתי הנקודות שהכי דחוף לטפל בהן, ומחליטים אם יש כאן התאמה.</p>
      <div class="row">
        <a class="btn btn--pri magnetic" href="${SITE.telHref}">${ICON.phone}${SITE.phone}</a>
        <a class="btn btn--wa magnetic" href="${SITE.wa}" target="_blank" rel="noopener">${ICON.wa}הודעה בוואטסאפ</a>
      </div>
    </div>
  </div>
</section>
`;
}

function footer(extraJs) {
  return `<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-about">
        <a class="brand" href="index.html">
          <span class="brand-mark"><img src="assets/img/logo-mark.png" alt="" width="216" height="216"></span>
          <span class="brand-txt">
            <span class="brand-name">${SITE.name}</span>
            <span class="brand-sub">${SITE.role}</span>
          </span>
        </a>
        <p>משרד רואי חשבון עצמאי, פועל משנת 2016. מתמחה במסחר אלקטרוני, הנהלת חשבונות, ביקורת חברות ולשכת שכר, ומלווה עסקים בכל אזורי הארץ.</p>
      </div>
      <div>
        <h5>שירותים</h5>
        <ul>
          <li><a href="services.html#ecommerce">מסחר אלקטרוני</a></li>
          <li><a href="services.html#company">חברה בע״מ</a></li>
          <li><a href="services.html#murshe">עוסק מורשה</a></li>
          <li><a href="services.html#patur">עוסק פטור</a></li>
          <li><a href="services.html#crypto">מטבעות דיגיטליים</a></li>
          <li><a href="services.html#payroll">לשכת שכר</a></li>
        </ul>
      </div>
      <div>
        <h5>האתר</h5>
        <ul>
          <li><a href="about.html">אודות</a></li>
          <li><a href="tools.html">מחשבוני מס</a></li>
          <li><a href="testimonials.html">המלצות</a></li>
          <li><a href="articles.html">מאמרים</a></li>
          <li><a href="resources.html">מידע שימושי</a></li>
          <li><a href="contact.html">צור קשר</a></li>
        </ul>
      </div>
      <div>
        <h5>יצירת קשר</h5>
        <ul>
          <li><a href="${SITE.telHref}" dir="ltr">${SITE.phone}</a></li>
          <li><a href="mailto:${SITE.email}">${SITE.email}</a></li>
          <li><a href="https://maps.google.com/?q=שמעיה+4+אלעד" target="_blank" rel="noopener">${SITE.address}</a></li>
          <li><a href="${SITE.wa}" target="_blank" rel="noopener">וואטסאפ</a></li>
        </ul>
      </div>
    </div>

    <p class="legal">
      משה שטרן רואי חשבון (להלן — ״המשרד״) לא יישא בכל אחריות לכל תוצאה או נזק, ישיר או עקיף, מכל מין וסוג שהוא,
      שייגרם בשל השימוש במידע שבאתר זה בכלל ובמידע הקשור לענייני מסים בפרט. המידע שבאתר הוא מידע כללי בלבד,
      אינו מהווה ייעוץ מקצועי מכל מין וסוג שהוא ומצריך בדיקה נוספת וייעוץ אישי ספציפי. כל הנעזר במידע הכלול באתר
      זה או בחישובים שבוצעו באמצעותו, עושה כן על אחריותו בלבד. השימוש באתר כפוף לכל האמור לעיל וייחשב כהסכמה לאמור.
    </p>

    <div class="foot-bot">
      <span>© <span data-year></span> ${SITE.name}, רואה חשבון. כל הזכויות שמורות.</span>
      <nav aria-label="ניווט משני">
        <a href="terms.html">תנאי שימוש</a>
        <a href="privacy.html">מדיניות פרטיות</a>
        <a href="accessibility.html">הצהרת נגישות</a>
      </nav>
    </div>
  </div>
</footer>

<div class="fab">
  <a class="wa" href="${SITE.wa}" target="_blank" rel="noopener" aria-label="שליחת הודעה בוואטסאפ">${ICON.wa}</a>
  <a class="tel" href="${SITE.telHref}" aria-label="חיוג למשרד">${ICON.phone}</a>
</div>

<button class="to-top" id="to-top" type="button" aria-label="חזרה לראש העמוד">
  <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</button>

<button class="a11y-btn" id="a11y-btn" type="button" aria-label="תפריט נגישות" aria-expanded="false" aria-controls="a11y-panel">
  <svg viewBox="0 0 24 24"><circle cx="12" cy="4" r="2"/><path d="M19 8.5l-5.2 1.2v3.1l3.2 8.2-1.9.7-3.1-7.8-3.1 7.8-1.9-.7 3.2-8.2V9.7L5 8.5l.5-1.9 6.5 1.5 6.5-1.5z"/></svg>
</button>

<div class="a11y-panel" id="a11y-panel" role="dialog" aria-label="הגדרות נגישות">
  <h4>נגישות <button type="button" id="a11y-close" aria-label="סגירה">×</button></h4>
  <div class="a11y-opt">
    <button type="button" data-a11y="bigger">הגדלת טקסט</button>
    <button type="button" data-a11y="smaller">הקטנת טקסט</button>
    <button type="button" data-a11y="contrast">ניגודיות גבוהה</button>
    <button type="button" data-a11y="links">הדגשת קישורים</button>
    <button type="button" data-a11y="readable">גופן קריא</button>
    <button type="button" data-a11y="nomotion">עצירת אנימציות</button>
  </div>
  <button class="a11y-reset" type="button" id="a11y-reset">איפוס הגדרות</button>
  <p class="muted" style="font-size:.72rem;margin-top:.7rem;line-height:1.5">
    לפרטים נוספים: <a href="accessibility.html" style="color:var(--accent)">הצהרת הנגישות</a>
  </p>
</div>

<!-- motion stack: defer keeps the order, and the site still works without it -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
${(extraJs || []).map(s => `<script src="${s}" defer></script>`).join('\n')}
<script src="assets/js/app.js" defer></script>
<script src="assets/js/motion.js" defer></script>
</body>
</html>
`;
}

/* ---------------- pages manifest ---------------- */
const LOCAL_BUSINESS = {
  '@context': 'https://schema.org',
  '@type': 'AccountingService',
  name: 'משה שטרן — רואה חשבון CPA, MBA',
  description: 'משרד רואי חשבון בהתמחות מסחר אלקטרוני, הנהלת חשבונות, ביקורת חברות ולשכת שכר.',
  telephone: '+972-54-4966495',
  email: SITE.email,
  url: SITE.origin + '/',
  address: { '@type': 'PostalAddress', streetAddress: 'שמעיה 4', addressLocality: 'אלעד', addressCountry: 'IL' },
  founder: { '@type': 'Person', name: 'משה שטרן', jobTitle: 'רואה חשבון CPA, MBA' },
  foundingDate: '2016',
  areaServed: 'IL',
  priceRange: '$$',
  knowsAbout: ['מסחר אלקטרוני', 'איקומרס', 'אמזון', 'איביי', 'מטבעות דיגיטליים', 'הנהלת חשבונות', 'ביקורת חברות', 'לשכת שכר']
};

const PAGES = [
  { slug: 'index', title: 'משה שטרן · רואה חשבון CPA, MBA | מומחה מסחר אלקטרוני והנהלת חשבונות',
    desc: 'משרד רואי חשבון בהתמחות מסחר אלקטרוני, איקומרס וקריפטו. פתיחת תיקים, הנהלת חשבונות, ביקורת חברות ולשכת שכר. ליווי אישי מרואה חשבון מוסמך משנת 2015.',
    js: ['assets/js/ledger.js', 'assets/js/calc.js'], jsonld: LOCAL_BUSINESS, band: false },
  { slug: 'about', title: 'אודות · משה שטרן, רואה חשבון CPA, MBA',
    desc: 'רואה חשבון בעל רישיון משנת 2015, משרד עצמאי משנת 2016. מומחה מסחר אלקטרוני שמלווה מאות עסקים בכל אזורי הארץ.' },
  { slug: 'services', title: 'שירותי המשרד · משה שטרן, רואה חשבון',
    desc: 'מסחר אלקטרוני, חברה בע״מ, עוסק מורשה, עוסק פטור, שותפות, מטבעות דיגיטליים, לשכת שכר וביקורת חברות.' },
  { slug: 'tools', title: 'מחשבוני מס 2026 · משה שטרן, רואה חשבון',
    desc: 'מחשבון נטו לעצמאי, השוואת מסלולים בין עוסק פטור מורשה וחברה, ומחשבון ביטוח לאומי לעצמאי — מעודכנים לנתוני 2026.',
    js: ['assets/js/calc.js'] },
  { slug: 'testimonials', title: 'המלצות לקוחות · משה שטרן, רואה חשבון',
    desc: 'לקוחות המשרד מספרים בעצמם, מול המצלמה, מה השתנה אצלם מאז שעברו לליווי של משה שטרן.' },
  { slug: 'articles', title: 'מאמרים ומדריכים · משה שטרן, רואה חשבון',
    desc: 'מדריכים קצרים על מסחר אלקטרוני, פתיחת עסק, דוחות פייפאל ואמזון ומיסוי מטבעות דיגיטליים.' },
  { slug: 'resources', title: 'מידע שימושי ולוח מועדים · משה שטרן, רואה חשבון',
    desc: 'קישורים לרשות המסים, ביטוח לאומי ובנק ישראל, לצד לוח המועדים והמספרים המעודכנים לשנת 2026.' },
  { slug: 'contact', title: 'צור קשר · משה שטרן, רואה חשבון',
    desc: 'טלפון 054-4966495, דוא״ל moshe@cpa-ms.com, שמעיה 4 אלעד. שיחת היכרות ראשונה ללא עלות.', band: false },
  { slug: 'accessibility', title: 'הצהרת נגישות · משה שטרן, רואה חשבון',
    desc: 'הצהרת הנגישות של אתר משרד רואי החשבון משה שטרן, בהתאם לתקן הישראלי 5568.', band: false },
  { slug: 'terms', title: 'תנאי שימוש · משה שטרן, רואה חשבון',
    desc: 'תנאי השימוש באתר משרד רואי החשבון משה שטרן.', band: false },
  { slug: 'privacy', title: 'מדיניות פרטיות · משה שטרן, רואה חשבון',
    desc: 'מדיניות הפרטיות של אתר משרד רואי החשבון משה שטרן.', band: false }
];

/* ---------------- build ---------------- */
const root = __dirname;
const srcDir = path.join(root, 'src');
let built = 0;

for (const p of PAGES) {
  const bodyPath = path.join(srcDir, p.slug + '.body.html');
  if (!fs.existsSync(bodyPath)) {
    console.warn('  דילוג (אין קובץ גוף): ' + p.slug);
    continue;
  }
  let body = fs.readFileSync(bodyPath, 'utf8');
  // the portrait is optional: inject it only when the file is actually there,
  // otherwise the typographic fallback stands on its own without a 404
  const portrait = fs.existsSync(path.join(root, 'assets', 'img', 'moshe.jpg'))
    ? '<img class="portrait-photo" src="assets/img/moshe.jpg" alt="משה שטרן, רואה חשבון CPA MBA" loading="lazy">'
    : '';
  body = body.replace(/<!--PORTRAIT-->/g, portrait);
  const html =
    head(p) +
    nav(p.slug) +
    '\n<main id="main">\n' + body + '\n' +
    (p.band === false ? '' : ctaBand()) +
    '</main>\n\n' +
    footer(p.js);

  fs.writeFileSync(path.join(root, p.slug + '.html'), html, 'utf8');
  built++;
  console.log('  ✓ ' + p.slug + '.html');
}

/* sitemap */
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  PAGES.map(p => `  <url><loc>${SITE.origin}/${p.slug === 'index' ? '' : p.slug + '.html'}</loc><changefreq>monthly</changefreq><priority>${p.slug === 'index' ? '1.0' : '0.7'}</priority></url>`).join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap, 'utf8');

fs.writeFileSync(path.join(root, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE.origin}/sitemap.xml\n`, 'utf8');

console.log(`\nנבנו ${built} עמודים, sitemap.xml ו-robots.txt.`);
