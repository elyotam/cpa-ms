/* ============================================================
   calc.js — מחשבוני מס
   מודל חישוב מפושט לצרכי הדגמה, מבוסס נתוני 2026.
   כל התוצאות הן אומדן בלבד ואינן מהוות ייעוץ מס.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- נתוני 2026 ---------------- */
  var DATA = {
    year: 2026,
    vat: 0.18,
    creditPoint: 2904,          // 242 ש"ח לחודש
    pturCeiling: 122833,        // תקרת מחזור לעוסק פטור
    corporate: 0.23,            // מס חברות
    dividend: 0.30,             // מס דיבידנד לבעל שליטה
    surtaxThreshold: 721560,    // מס יסף
    surtaxRate: 0.03,
    brackets: [                 // מדרגות מס הכנסה שנתיות
      { upTo: 84120, rate: 0.10 },
      { upTo: 120720, rate: 0.14 },
      { upTo: 228000, rate: 0.20 },
      { upTo: 301200, rate: 0.31 },
      { upTo: 560280, rate: 0.35 },
      { upTo: 721560, rate: 0.47 },
      { upTo: Infinity, rate: 0.50 } // 47% + 3% מס יסף
    ],
    ni: {                       // ביטוח לאומי ומס בריאות, עצמאי
      lowCeiling: 92436,        // 7,703 ש"ח לחודש
      lowRate: 0.077,
      highRate: 0.18,
      maxIncome: 622920         // תקרת הכנסה מבוטחת: 51,910 ש"ח לחודש
    },
    niEmployee: { lowRate: 0.0427, highRate: 0.1217 },
    niEmployer: { lowRate: 0.0355, highRate: 0.076 }
  };

  /* ---------------- מנוע ---------------- */
  function incomeTax(annualTaxable, creditPoints) {
    var t = 0, prev = 0, left = Math.max(0, annualTaxable);
    for (var i = 0; i < DATA.brackets.length && left > 0; i++) {
      var b = DATA.brackets[i];
      var slice = Math.min(left, b.upTo - prev);
      t += slice * b.rate;
      left -= slice;
      prev = b.upTo;
    }
    var credit = (creditPoints || 0) * DATA.creditPoint;
    return Math.max(0, t - credit);
  }

  function nationalInsuranceSelf(annualProfit) {
    var base = Math.min(Math.max(0, annualProfit), DATA.ni.maxIncome);
    var low = Math.min(base, DATA.ni.lowCeiling);
    var high = Math.max(0, base - DATA.ni.lowCeiling);
    return low * DATA.ni.lowRate + high * DATA.ni.highRate;
  }

  function niOn(annualSalary, rates) {
    var base = Math.min(Math.max(0, annualSalary), DATA.ni.maxIncome);
    var low = Math.min(base, DATA.ni.lowCeiling);
    var high = Math.max(0, base - DATA.ni.lowCeiling);
    return low * rates.lowRate + high * rates.highRate;
  }

  var fmtILS = new Intl.NumberFormat('he-IL', {
    style: 'currency', currency: 'ILS', maximumFractionDigits: 0, minimumFractionDigits: 0
  });
  var fmtNum = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });
  function money(n) { return fmtILS.format(Math.round(n || 0)); }
  function pct(n) { return (n * 100).toFixed(1).replace(/\.0$/, '') + '%'; }

  /* ============================================================
     מחשבון 1 — נטו לעצמאי
     ============================================================ */
  (function selfCalc() {
    var root = $('#calc-self');
    if (!root) return;

    var elRev = $('#s-rev', root);
    var elExp = $('#s-exp', root);
    var elCp = $('#s-cp', root);
    var out = {
      revV: $('#s-rev-v', root), expV: $('#s-exp-v', root), cpV: $('#s-cp-v', root),
      profit: $('#s-profit', root), tax: $('#s-tax', root), ni: $('#s-ni', root),
      net: $('#s-net', root), monthly: $('#s-monthly', root), rate: $('#s-rate', root),
      barTax: $('#s-bar-tax', root), barNi: $('#s-bar-ni', root), barNet: $('#s-bar-net', root),
      verdict: $('#s-verdict', root)
    };

    function run() {
      var rev = +elRev.value;
      var exp = Math.min(+elExp.value, rev);
      var cp = +elCp.value;

      var profit = Math.max(0, rev - exp);
      var tax = incomeTax(profit, cp);
      var ni = nationalInsuranceSelf(profit);
      // 52% מדמי הביטוח הלאומי מוכרים כהוצאה לצורכי מס
      var niDeduction = ni * 0.52;
      tax = incomeTax(Math.max(0, profit - niDeduction), cp);
      var net = profit - tax - ni;
      var effective = profit > 0 ? (tax + ni) / profit : 0;

      out.revV.textContent = money(rev);
      out.expV.textContent = money(exp);
      out.cpV.textContent = fmtNum.format(cp);
      out.profit.textContent = money(profit);
      out.tax.textContent = '−' + money(tax);
      out.ni.textContent = '−' + money(ni);
      out.net.textContent = money(net);
      out.monthly.textContent = money(net / 12);
      out.rate.textContent = pct(effective);

      var total = Math.max(profit, 1);
      out.barTax.style.width = (tax / total * 100) + '%';
      out.barNi.style.width = (ni / total * 100) + '%';
      out.barNet.style.width = (Math.max(0, net) / total * 100) + '%';

      var msg;
      if (rev > DATA.pturCeiling && rev <= DATA.pturCeiling * 1.35) {
        msg = 'המחזור שלך חצה את תקרת העוסק הפטור (' + money(DATA.pturCeiling) + '). זה השלב שבו כדאי לבדוק מעבר לעוסק מורשה ולתכנן את הדיווח הדו־חודשי למע״מ.';
      } else if (profit > 560000) {
        msg = 'ברמת רווח כזו ההפרש בין עוסק מורשה לחברה בע״מ יכול להגיע לעשרות אלפי שקלים בשנה. שווה לבדוק את ההשוואה שמתחת.';
      } else if (exp / Math.max(rev, 1) < 0.12 && rev > 200000) {
        msg = 'שיעור ההוצאות המוכרות שלך נמוך יחסית למחזור. לרוב יש שם כסף על הרצפה, בעיקר בעסקי איקומרס ושירותים.';
      } else {
        msg = 'האומדן מתבסס על מדרגות המס והביטוח הלאומי לשנת ' + DATA.year + '. תכנון נכון של מקדמות, הוצאות מוכרות והפקדות לפנסיה משנה את התמונה.';
      }
      out.verdict.innerHTML = '<b>מה זה אומר</b>' + msg;
    }

    [elRev, elExp, elCp].forEach(function (el) { el.addEventListener('input', run); });
    run();
  })();

  /* ============================================================
     מחשבון 2 — איזה מסלול משתלם לך
     ============================================================ */
  (function trackCalc() {
    var root = $('#calc-track');
    if (!root) return;

    var elRev = $('#t-rev', root);
    var elExp = $('#t-exp', root);
    var elCp = $('#t-cp', root);
    var elSal = $('#t-sal', root);
    var body = $('#t-body', root);
    var verdict = $('#t-verdict', root);
    var revV = $('#t-rev-v', root), expV = $('#t-exp-v', root),
        cpV = $('#t-cp-v', root), salV = $('#t-sal-v', root);

    /* Who the customers are decides the whole comparison. Selling to
       businesses, a מורשה adds VAT on top and the customer reclaims it, so
       he keeps the full price. Selling to private customers the market
       price already contains the VAT and he has to hand it over — which is
       exactly where a עוסק פטור gains. Without this, פטור looked worse than
       מורשה in every case, which is simply wrong. */
    var clients = 'business';

    // what the seller actually keeps out of the price the customer pays
    function kept(rev, registered) {
      if (!registered) return rev;
      return clients === 'private' ? rev / (1 + DATA.vat) : rev;
    }

    function calcPatur(rev, exp, cp) {
      if (rev > DATA.pturCeiling) return { allowed: false };
      // עוסק פטור אינו מקזז מע״מ תשומות, ולכן ההוצאה עולה לו במלוא המע״מ
      var realExp = exp * (1 + DATA.vat);
      var profit = Math.max(0, kept(rev, false) - realExp);
      var ni = nationalInsuranceSelf(profit);
      var tax = incomeTax(Math.max(0, profit - ni * 0.52), cp);
      return { allowed: true, profit: profit, tax: tax, ni: ni, corp: 0, div: 0, net: profit - tax - ni };
    }

    function calcMurshe(rev, exp, cp) {
      var profit = Math.max(0, kept(rev, true) - exp);
      var ni = nationalInsuranceSelf(profit);
      var tax = incomeTax(Math.max(0, profit - ni * 0.52), cp);
      return { allowed: true, profit: profit, tax: tax, ni: ni, corp: 0, div: 0, net: profit - tax - ni };
    }

    function calcCompany(rev, exp, cp, salary) {
      var gross = Math.max(0, kept(rev, true) - exp);
      var sal = Math.min(salary, gross);
      var employerNi = niOn(sal, DATA.niEmployer);
      var companyProfit = Math.max(0, gross - sal - employerNi);
      var corp = companyProfit * DATA.corporate;
      var distributable = companyProfit - corp;
      var divTax = distributable * DATA.dividend;
      // מס יסף על דיבידנד והכנסה גבוהה
      var totalPersonal = sal + distributable;
      var surtax = Math.max(0, totalPersonal - DATA.surtaxThreshold) * DATA.surtaxRate;

      var employeeNi = niOn(sal, DATA.niEmployee);
      var salaryTax = incomeTax(sal, cp);

      var tax = salaryTax + divTax + surtax;
      var net = sal - salaryTax - employeeNi + (distributable - divTax);
      return {
        allowed: true, profit: gross, tax: tax, ni: employeeNi + employerNi,
        corp: corp, div: divTax, net: net, salary: sal
      };
    }

    function row(name, note, r, best) {
      if (!r.allowed) {
        return '<tr><th>' + name + '<br><span class="muted" style="font-size:.78rem;font-weight:400">' + note + '</span></th>' +
          '<td colspan="5" class="muted">לא רלוונטי — המחזור חורג מתקרת העוסק הפטור</td></tr>';
      }
      var cls = best ? ' class="best"' : '';
      return '<tr>' +
        '<th>' + name + '<br><span class="muted" style="font-size:.78rem;font-weight:400">' + note + '</span></th>' +
        '<td>' + money(r.profit) + '</td>' +
        '<td>' + money(r.tax + r.corp) + '</td>' +
        '<td>' + money(r.ni) + '</td>' +
        '<td' + cls + '>' + money(r.net) + '</td>' +
        '<td>' + (r.profit > 0 ? pct((r.profit - r.net) / r.profit) : '—') + '</td>' +
        '</tr>';
    }

    function run() {
      var rev = +elRev.value;
      var exp = Math.min(+elExp.value, rev);
      var cp = +elCp.value;
      var sal = +elSal.value;

      revV.textContent = money(rev);
      expV.textContent = money(exp);
      cpV.textContent = fmtNum.format(cp);
      salV.textContent = money(sal) + ' לחודש';

      var patur = calcPatur(rev, exp, cp);
      var murshe = calcMurshe(rev, exp, cp);
      var comp = calcCompany(rev, exp, cp, sal * 12);

      var options = [
        { key: 'patur', label: 'עוסק פטור', r: patur },
        { key: 'murshe', label: 'עוסק מורשה', r: murshe },
        { key: 'company', label: 'חברה בע״מ', r: comp }
      ].filter(function (o) { return o.r.allowed; });

      var winner = options.reduce(function (a, b) { return b.r.net > a.r.net ? b : a; });

      body.innerHTML =
        row('עוסק פטור', 'עד ' + money(DATA.pturCeiling) + ' מחזור', patur, winner.key === 'patur') +
        row('עוסק מורשה', 'דיווח מע״מ שוטף', murshe, winner.key === 'murshe') +
        row('חברה בע״מ', 'משכורת ' + money(sal) + ' + דיבידנד', comp, winner.key === 'company');

      var second = options.filter(function (o) { return o !== winner; })
        .reduce(function (a, b) { return (!a || b.r.net > a.r.net) ? b : a; }, null);
      var gap = second ? winner.r.net - second.r.net : 0;

      var text;
      if (rev <= DATA.pturCeiling && winner.key === 'patur') {
        text = clients === 'private'
          ? 'מול לקוחות פרטיים המחיר כבר כולל מע״מ, ועוסק מורשה חייב להעביר אותו הלאה. עוסק פטור שומר את מלוא הסכום, ולכן הוא מקדים כאן בכ־' + money(gap) + ' בשנה. היתרון נשחק ככל שההוצאות גדלות, כי מע״מ תשומות לא חוזר אליו.'
          : 'במחזור הזה עוסק פטור עדיין מקדים, בעיקר בזכות היעדר דיווחי מע״מ ועלויות ניהול נמוכות. שימו לב שהיתרון נשחק ככל שההוצאות גדלות, כי מע״מ תשומות לא חוזר.';
      } else if (winner.key === 'company') {
        text = 'לפי הנתונים שהזנת, מבנה של חברה בע״מ משאיר בכיס כ־' + money(gap) + ' יותר בשנה מהמסלול הבא אחריו. זה עוד לפני תכנון של דחיית דיבידנד, פנסיה וקרן השתלמות לשכיר בעל שליטה.';
      } else {
        text = 'עוסק מורשה הוא המסלול היעיל כאן, בפער של כ־' + money(Math.abs(gap)) + ' בשנה' +
          (clients === 'business' ? ', בעיקר משום שהלקוחות מקזזים את המע״מ ולכן הוא נשאר עם מלוא המחיר ומקזז תשומות' : '') +
          '. מעבר לחברה מתחיל להשתלם בדרך כלל כשהרווח חוצה את מדרגת ה־47% ואין צורך למשוך את כל הרווח הביתה.';
      }
      verdict.innerHTML = '<b>השורה התחתונה</b>' + text;
    }

    $$('[data-clients]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        clients = b.getAttribute('data-clients');
        $$('[data-clients]', root).forEach(function (o) { o.classList.toggle('on', o === b); });
        run();
      });
    });

    [elRev, elExp, elCp, elSal].forEach(function (el) { el.addEventListener('input', run); });
    run();
  })();

  /* ============================================================
     מחשבון 3 — ביטוח לאומי לעצמאי
     ============================================================ */
  (function niCalc() {
    var root = $('#calc-ni');
    if (!root) return;

    var elProfit = $('#n-profit', root);
    var elLabel = $('#n-profit-label', root);
    var elHint = $('#n-profit-hint', root);
    var out = {
      v: $('#n-profit-v', root),
      low: $('#n-low', root), high: $('#n-high', root),
      rate: $('#n-rate', root), year: $('#n-year', root), month: $('#n-month', root),
      barLow: $('#n-bar-low', root), barHigh: $('#n-bar-high', root), barRest: $('#n-bar-rest', root),
      verdict: $('#n-verdict', root)
    };

    var mode = 'year';
    var RANGE = {
      year: { min: 0, max: 800000, step: 5000, start: 240000 },
      month: { min: 0, max: 66000, step: 500, start: 20000 }
    };

    function split(annual) {
      var insured = Math.min(Math.max(0, annual), DATA.ni.maxIncome);
      var low = Math.min(insured, DATA.ni.lowCeiling);
      var high = Math.max(0, insured - DATA.ni.lowCeiling);
      return {
        lowBase: low, highBase: high,
        low: low * DATA.ni.lowRate,
        high: high * DATA.ni.highRate,
        overCeiling: Math.max(0, annual - DATA.ni.maxIncome)
      };
    }

    function run() {
      var raw = +elProfit.value;
      var annual = mode === 'year' ? raw : raw * 12;
      var r = split(annual);
      var total = r.low + r.high;

      out.v.textContent = money(raw) + (mode === 'month' ? ' לחודש' : '');
      elLabel.textContent = mode === 'year' ? 'רווח שנתי' : 'רווח חודשי';
      elHint.textContent = mode === 'year'
        ? 'שווה ערך ל־' + money(annual / 12) + ' לחודש'
        : 'שווה ערך ל־' + money(annual) + ' לשנה';

      out.low.textContent = money(r.low);
      out.high.textContent = money(r.high);
      out.year.textContent = money(total);
      out.month.textContent = money(total / 12);
      out.rate.textContent = annual > 0 ? pct(total / annual) : '—';

      var base = Math.max(annual, 1);
      out.barLow.style.width = (r.low / base * 100) + '%';
      out.barHigh.style.width = (r.high / base * 100) + '%';
      out.barRest.style.width = (Math.max(0, annual - total) / base * 100) + '%';

      var msg;
      if (annual <= 0) {
        msg = 'גם בלי רווח קיימת חובת תשלום מינימלית לעצמאי. השיעור המדויק תלוי בסיווג ובגיל.';
      } else if (r.overCeiling > 0) {
        msg = 'הרווח חצה את תקרת ההכנסה המבוטחת, ולכן ' + money(r.overCeiling) +
              ' ממנו כבר לא מחויבים בדמי ביטוח. מכאן והלאה כל שקל נוסף נושא מס הכנסה בלבד.';
      } else if (r.highBase === 0) {
        msg = 'כל הרווח נמצא במדרגה המופחתת. זה המצב הנוח, והוא משתנה ברגע שהרווח החודשי חוצה את ' +
              money(DATA.ni.lowCeiling / 12) + '.';
      } else {
        msg = money(r.highBase) + ' מהרווח נמצאים במדרגת ה־18%, ושם נוצר עיקר החיוב. ' +
              'זכרו ש־52% מהתשלום מוכרים כהוצאה, כך שהעלות נטו נמוכה מ־' + money(total) + '.';
      }
      out.verdict.innerHTML = '<b>מה זה אומר</b>' + msg;
    }

    $$('[data-nimode]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var next = b.getAttribute('data-nimode');
        if (next === mode) return;
        // keep the same real profit when the basis changes
        var annual = mode === 'year' ? +elProfit.value : +elProfit.value * 12;
        mode = next;
        var cfg = RANGE[mode];
        elProfit.min = cfg.min; elProfit.max = cfg.max; elProfit.step = cfg.step;
        elProfit.value = mode === 'year' ? annual : Math.round(annual / 12);
        $$('[data-nimode]', root).forEach(function (o) { o.classList.toggle('on', o === b); });
        run();
      });
    });

    elProfit.addEventListener('input', run);
    run();
  })();

  /* חשיפה לשימוש חיצוני */
  window.MSCalc = { DATA: DATA, incomeTax: incomeTax, nationalInsuranceSelf: nationalInsuranceSelf, money: money };
})();
