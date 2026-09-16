/* ============================================================
   BUDAI PSZICHOLÓGUS KÖZPONT · core.js
   GSAP-független gerinc: reveal, hero belépő, Lenis, nav (panel + mobil lap),
   a megszólaló vonal, regiszter-szűrő, folyamat-index, GYIK-kereső, űrlap, tiszta URL.
   Minden kritikus vizuál működik e nélkül is (RB1, RB2).
   ============================================================ */
(function () {
  'use strict';
  var CONFIG = {
    web3formsKey: '',                                   /* Web3Forms access key az ügyfél címére. Üresen mailto-fallback. */
    mailto: 'bejelentkezes@budaipszichologus.hu',
    phone: '+36 30 961 1364'
  };
  var doc = document, html = doc.documentElement, body = doc.body;
  var BP = window.BP = window.BP || {};

  /* ---------- ?motion=1|0 override (David gépén reduced motion aktív), ?qa=1 mérő ---------- */
  var q = new URLSearchParams(location.search);
  if (q.has('motion')) { try { sessionStorage.setItem('bp-motion', q.get('motion')); } catch (e) {} }
  var forced = null; try { forced = sessionStorage.getItem('bp-motion'); } catch (e) {}
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (forced === '1') reduce = false;
  if (forced === '0') reduce = true;
  if (reduce) html.classList.add('motion-off');
  if (q.has('qa')) html.classList.add('qa');
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  BP.reduce = reduce; BP.fine = fine;

  /* ---------- REVEAL (RB2): IO + scroll-check + safety ---------- */
  var revealEls = [].slice.call(doc.querySelectorAll('[data-reveal],[data-stagger]'));
  [].forEach.call(doc.querySelectorAll('[data-stagger]'), function (g) {
    [].forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i); });
  });
  function showAll() { revealEls.forEach(function (el) { el.classList.add('in'); }); }
  if (reduce || !('IntersectionObserver' in window)) { showAll(); }
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(function (el) { io.observe(el); });
    setTimeout(function () { revealEls.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight * 0.92) el.classList.add('in'); }); }, 1200);
  }
  setTimeout(showAll, 4000);

  /* ---------- HERO belépő (RB1) ---------- */
  var hero = doc.querySelector('.hero');
  function heroIn() { if (hero) hero.classList.add('is-in'); }
  if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(function () { setTimeout(heroIn, 60); }); }
  setTimeout(heroIn, 900);

  /* ---------- LENIS (RB3): self-rAF, syncTouch:false, reduced motion alatt natív ---------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    try {
      lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true, syncTouch: false });
      (function lraf(t) { lenis.raf(t); requestAnimationFrame(lraf); })(0);
    } catch (e) { lenis = null; }
  }
  BP.lenis = lenis;

  /* ---------- NAV: rejtés görgetésre hiszterézissel, aktuális menüpont ---------- */
  var nav = doc.querySelector('.nav');
  var lastY = scrollY || 0, downAcc = 0, upAcc = 0, scrollP = 0;
  function onScroll() {
    var y = scrollY || 0, d = y - lastY;
    if (nav && !body.classList.contains('no-scroll')) {
      if (d > 0) { downAcc += d; upAcc = 0; } else if (d < 0) { upAcc -= d; downAcc = 0; }
      if (downAcc > 28 && y > 240) { if (!nav.classList.contains('nav--hidden')) { nav.classList.add('nav--hidden'); closePanels(); } }
      else if (upAcc > 160 || y <= 240) nav.classList.remove('nav--hidden');
    }
    var h = hero ? hero.offsetHeight : innerHeight;
    scrollP = Math.min(1, Math.max(0, y / (h * 1.6)));
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  (function markCurrent() {
    var file = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
    var inSub = /\/(szakemberek|blog)\//.test(location.pathname);
    [].forEach.call(doc.querySelectorAll('.nav__links > a, .sheet__links > a'), function (a) {
      var href = (a.getAttribute('href') || '').replace(/^\.\.\//, '').replace(/\.html$/, '');
      if (href === file || (inSub && /szakemberek\//.test(location.pathname) && href === 'szakembereink') || (inSub && /blog\//.test(location.pathname) && href === 'blog')) a.setAttribute('aria-current', 'page');
    });
  })();

  /* ---------- NAV: legördülő panel (Miben segítünk) ---------- */
  var toggles = [].slice.call(doc.querySelectorAll('.nav__toggle'));
  function closePanels() { toggles.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); var p = doc.getElementById(t.getAttribute('aria-controls')); if (p) p.classList.remove('is-open'); }); }
  toggles.forEach(function (t) {
    var panel = doc.getElementById(t.getAttribute('aria-controls'));
    if (!panel) return;
    t.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = t.getAttribute('aria-expanded') === 'true';
      closePanels();
      if (!open) { t.setAttribute('aria-expanded', 'true'); panel.classList.add('is-open'); }
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
  });
  doc.addEventListener('click', function () { closePanels(); });

  /* ---------- NAV: mobil lap fókusz-csapdával, lenis.stop/start ---------- */
  var burger = doc.querySelector('.nav__burger'), sheet = doc.getElementById('sheet'), lastFocus = null;
  function focusables() {
    return [].slice.call(sheet.querySelectorAll('a[href],button,summary,input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function (el) { return el.offsetParent !== null; });
  }
  function openSheet() {
    if (!sheet) return;
    lastFocus = doc.activeElement;
    sheet.classList.add('is-open'); sheet.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Menü bezárása'); burger.textContent = 'Bezár';
    body.classList.add('no-scroll'); if (lenis) lenis.stop();
    nav && nav.classList.remove('nav--hidden');
    var f = focusables(); if (f.length) f[0].focus();
  }
  function closeSheet() {
    if (!sheet || !sheet.classList.contains('is-open')) return;
    sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Menü megnyitása'); burger.textContent = 'Menü';
    body.classList.remove('no-scroll'); if (lenis) lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (burger && sheet) {
    burger.addEventListener('click', function () { sheet.classList.contains('is-open') ? closeSheet() : openSheet(); });
    sheet.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); burger.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); burger.focus(); }
    });
    burger.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey && sheet.classList.contains('is-open')) { var f = focusables(); if (f.length) { e.preventDefault(); f[0].focus(); } }
    });
    [].forEach.call(sheet.querySelectorAll('a[href]'), function (a) { a.addEventListener('click', closeSheet); });
    addEventListener('resize', function () { if (innerWidth > 900) closeSheet(); });
  }
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePanels(); closeSheet(); } });
  BP.closeSheet = closeSheet;

  /* ============================================================
     A MEGSZÓLALÓ VONAL · artikulált változat (a signature)
     Nyugalomban egyenes. Görgetésre szó-hosszú szakaszokra és szünetekre
     tagolódik. Nincs hullám, nincs lélegzés. Reduced motion: égetett p.
     ============================================================ */
  var WORDS = [7, 4, 9, 3, 6, 11, 2, 5, 8, 4, 10, 3, 6, 7, 2, 9, 5, 4, 8, 6];
  var GAPS  = [2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 5, 1, 2, 2, 1, 3, 2, 1, 3, 2];
  var Wsum = WORDS.reduce(function (a, b) { return a + b; }, 0);
  var Gsum = GAPS.reduce(function (a, b) { return a + b; }, 0);
  function dashFor(p, L, mouseX) {
    var unit = L / (Wsum + Gsum) * 1.9, gapTotal = p * Gsum * unit, wordScale = (L - gapTotal) / Wsum;
    var out = [], x = 0;
    for (var i = 0; i < WORDS.length; i++) {
      var w = WORDS[i] * wordScale, g = p * GAPS[i] * unit;
      if (mouseX != null) { var cx = x + w / 2, dist = Math.abs(cx - mouseX); if (dist < L * 0.08) { var k = 1 - dist / (L * 0.08); w += g * k * 0.9; g *= (1 - 0.9 * k); } }
      out.push(w.toFixed(1), Math.max(0, g).toFixed(1)); x += w + g;
    }
    return out.join(' ');
  }
  BP.dashFor = dashFor;
  [].forEach.call(doc.querySelectorAll('.aline'), function (svg) {
    var path = svg.querySelector('path'); if (!path) return;
    var L = 1440, cur = 0, target = 0, mx = null, mxTarget = null, running = true, ease = 0.06;
    var mode = svg.dataset.mode || 'scroll', fixedP = parseFloat(svg.dataset.p || '0.62');
    if (reduce) { path.setAttribute('stroke-dasharray', dashFor(fixedP, L, null)); return; }
    if (fine && svg.parentElement) {
      svg.parentElement.addEventListener('mousemove', function (e) { var r = svg.getBoundingClientRect(); mxTarget = (e.clientX - r.left) / r.width * L; });
      svg.parentElement.addEventListener('mouseleave', function () { mxTarget = null; });
    }
    var vis = new IntersectionObserver(function (es) { es.forEach(function (e) { running = e.isIntersecting; if (running) requestAnimationFrame(frame); }); }, { threshold: 0 });
    vis.observe(svg);
    function frame() {
      if (!running) return;
      target = mode === 'fixed' ? fixedP : scrollP;
      cur += (target - cur) * ease;
      if (mxTarget == null) mx = null; else mx = mx == null ? mxTarget : mx + (mxTarget - mx) * 0.14;
      path.setAttribute('stroke-dasharray', dashFor(cur, L, mx));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  /* ---------- SZÁMLÁLÓ ---------- */
  var counters = [].slice.call(doc.querySelectorAll('[data-count]'));
  if (counters.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; var el = e.target; cio.unobserve(el);
        var end = +el.dataset.count; if (reduce) { el.textContent = end; return; }
        var t0 = performance.now(), dur = 1400;
        (function tick(t) { var p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); })(t0);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- kiegészíthető mondat: a select a kiválasztott opció szélességére áll, hogy mondatként olvasson ---------- */
  var fits = [];
  [].forEach.call(doc.querySelectorAll('.madlib select'), function (s) {
    var cv = doc.createElement('canvas').getContext('2d');
    function fit() {
      var cs = getComputedStyle(s);
      cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var t = s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : '';
      s.style.width = Math.ceil(cv.measureText(t).width + parseFloat(cs.fontSize) * 1.25) + 'px';
    }
    fits.push(fit);
    s.addEventListener('change', fit);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fit);
    addEventListener('resize', fit);
    fit();
  });

  /* ============================================================
     REGISZTER: chipek + kiegészíthető mondat + URL-paraméter + sor-nyitás
     + rögzített portré-keret + névsor/alap rendezés + üres és sok-találat állapot
     ============================================================ */
  var list = doc.querySelector('.reg__list');
  var reg = list ? list.closest('.reg') : null;
  if (reg) {
    var rows = [].slice.call(reg.querySelectorAll('.row'));
    var order = rows.slice();
    var chips = [].slice.call(doc.querySelectorAll('.chip[data-filter]'));
    var selects = [].slice.call(doc.querySelectorAll('select[data-filter]'));
    var countEls = [].slice.call(doc.querySelectorAll('[data-reg-count]'));
    var frameEl = doc.querySelector('.reg__frame');
    var resetBtns = [].slice.call(doc.querySelectorAll('[data-reg-reset]'));
    var active = {};
    var KEYS = ['kinek', 'miben', 'forma', 'mod', 'nyelv', 'ar', 'szerep'];
    function applyFilter(push) {
      var n = 0;
      rows.forEach(function (r) {
        var ok = true;
        KEYS.forEach(function (k) { if (!active[k]) return; var vals = (r.dataset[k] || '').split('|'); if (vals.indexOf(active[k]) < 0) ok = false; });
        r.classList.toggle('is-hidden', !ok); if (ok) n++;
      });
      countEls.forEach(function (c) { c.textContent = n; });
      reg.classList.toggle('is-empty', n === 0);
      reg.classList.toggle('is-many', n > 12);
      var any = KEYS.some(function (k) { return !!active[k]; });
      reg.classList.toggle('is-filtered', any);
      resetBtns.forEach(function (b) { b.hidden = !any; });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', active[c.dataset.filter] === c.dataset.value ? 'true' : 'false'); });
      selects.forEach(function (s) { var v = active[s.dataset.filter] || ''; if (s.value !== v) s.value = v; });
      fits.forEach(function (f) { f(); });
      if (push && /^https?:/.test(location.protocol)) {
        try {
          var p = new URLSearchParams(); KEYS.forEach(function (k) { if (active[k]) p.set(k, active[k]); });
          var qs = p.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
        } catch (e) {}
      }
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var k = c.dataset.filter, v = c.dataset.value;
        active[k] = active[k] === v ? null : v;
        applyFilter(true);
      });
    });
    selects.forEach(function (s) {
      s.addEventListener('change', function () { active[s.dataset.filter] = s.value || null; applyFilter(true); });
    });
    resetBtns.forEach(function (b) { b.addEventListener('click', function () { active = {}; applyFilter(true); }); });
    KEYS.forEach(function (k) { if (q.get(k)) active[k] = q.get(k); });
    var sortBtns = [].slice.call(reg.querySelectorAll('[data-sort]'));
    sortBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        sortBtns.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true');
        var arr = b.dataset.sort === 'nev' ? rows.slice().sort(function (a, c) { return (a.dataset.nev || '').localeCompare(c.dataset.nev || '', 'hu'); }) : order;
        arr.forEach(function (r) { list.appendChild(r); });
      });
    });
    rows.forEach(function (r) {
      function toggleRow() {
        var open = r.classList.contains('is-open');
        rows.forEach(function (o) { o.classList.remove('is-open'); o.setAttribute('aria-expanded', 'false'); });
        if (!open) { r.classList.add('is-open'); r.setAttribute('aria-expanded', 'true'); }
      }
      r.addEventListener('click', function (e) { if (e.target.closest('a,button')) return; toggleRow(); });
      r.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === r) { e.preventDefault(); toggleRow(); } });
      if (frameEl && fine) {
        var img = r.dataset.portrait ? frameEl.querySelector('img[data-for="' + r.dataset.portrait + '"]') : null;
        r.addEventListener('mouseenter', function () {
          if (!img) return;
          [].forEach.call(frameEl.querySelectorAll('img'), function (i) { i.classList.remove('is-on'); });
          img.classList.add('is-on'); frameEl.classList.add('is-on');
        });
        r.addEventListener('mouseleave', function () { frameEl.classList.remove('is-on'); });
      }
    });
    applyFilter(false);
  }

  /* ---------- FOLYAMAT 01-04: sticky index aktív állapot ---------- */
  var stepLinks = [].slice.call(doc.querySelectorAll('.steps__index a[href^="#"]'));
  if (stepLinks.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        stepLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-35% 0px -50% 0px', threshold: 0 });
    stepLinks.forEach(function (a) { var t = doc.getElementById(a.getAttribute('href').slice(1)); if (t) sio.observe(t); });
    stepLinks[0].classList.add('is-active');
  }

  /* ---------- GYIK: kereső + mélylink nyitás ---------- */
  var faqSearch = doc.querySelector('[data-faq-search]');
  if (faqSearch) {
    var items = [].slice.call(doc.querySelectorAll('.faq__item')), groups = [].slice.call(doc.querySelectorAll('.faq__group')), fc = doc.querySelector('[data-faq-count]');
    function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    faqSearch.addEventListener('input', function () {
      var t = norm(faqSearch.value.trim()), n = 0;
      items.forEach(function (it) { var ok = !t || norm(it.textContent).indexOf(t) >= 0; it.hidden = !ok; if (ok) n++; if (t && ok) it.open = true; });
      groups.forEach(function (g) { g.hidden = ![].some.call(g.querySelectorAll('.faq__item'), function (it) { return !it.hidden; }); });
      if (fc) fc.textContent = n;
    });
  }
  if (location.hash) { var target = doc.querySelector(location.hash); if (target && target.tagName === 'DETAILS') target.open = true; }

  /* ---------- ŰRLAP: Web3Forms, kulcs nélkül mailto ---------- */
  var form = doc.querySelector('form[data-bp-form]');
  if (form) {
    var msg = form.querySelector('.form__msg'), submitBtn = form.querySelector('[type="submit"]');
    var pre = q.get('szakember'); var sel = form.querySelector('select[name="szakember"]');
    if (pre && sel) { [].some.call(sel.options, function (o) { if (o.value === pre) { sel.value = pre; return true; } return false; }); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var hp = form.querySelector('.hp input'); if (hp && hp.value) return;
      var consent = form.querySelector('input[name="hozzajarulas"]');
      if (consent && !consent.checked) { if (msg) msg.textContent = 'Kérjük, jelölje be az adatkezelési hozzájárulást.'; consent.focus(); return; }
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = new FormData(form);
      if (!CONFIG.web3formsKey) {
        var lines = [];
        data.forEach(function (v, k) { if (k === 'botcheck' || k === 'hozzajarulas' || !v) return; lines.push(k + ': ' + v); });
        location.href = 'mailto:' + CONFIG.mailto + '?subject=' + encodeURIComponent('Időpontkérés a weboldalról') + '&body=' + encodeURIComponent(lines.join('\n'));
        if (msg) msg.textContent = 'Megnyílik a levelezője a kitöltött üzenettel. Ha nem nyílik meg, hívjon: ' + CONFIG.phone + '.';
        return;
      }
      data.append('access_key', CONFIG.web3formsKey);
      data.append('subject', 'Időpontkérés a weboldalról');
      data.append('from_name', 'budaipszichologus.hu');
      if (submitBtn) submitBtn.disabled = true;
      if (msg) msg.textContent = 'Küldés…';
      fetch('https://api.web3forms.com/submit', { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j.success) throw new Error('web3forms'); form.reset(); if (msg) msg.textContent = 'Köszönjük. Ügyfélszolgálatunk hétköznap 9 és 15 óra között visszahívja.'; })
        .catch(function () { if (msg) msg.textContent = 'Nem sikerült elküldeni. Hívjon: ' + CONFIG.phone + ', vagy írjon: ' + CONFIG.mailto; })
        .then(function () { if (submitBtn) submitBtn.disabled = false; });
    });
  }

  /* ---------- TISZTA URL http(s) alatt: a forrás .html-es marad, hogy file://-ből is nyíljon ---------- */
  if (/^https?:/.test(location.protocol)) {
    [].forEach.call(doc.querySelectorAll('a[href]'), function (a) {
      var h = a.getAttribute('href');
      if (/^(https?:|mailto:|tel:|#)/.test(h)) return;
      var m = h.match(/^(.*?)([^\/?#]*)\.html(\?[^#]*)?(#.*)?$/);
      if (!m) return;
      var out = m[1] + (m[2] === 'index' ? '' : m[2]) + (m[3] || '') + (m[4] || '');
      a.setAttribute('href', out === '' ? './' : out);
    });
  }

  /* ---------- mérő-sáv (?qa=1) ---------- */
  var m = doc.querySelector('.measure');
  if (m && hero) {
    var measure = function () {
      var hh = hero.getBoundingClientRect().height;
      m.textContent = 'viewport ' + innerWidth + 'x' + innerHeight + '  hero ' + Math.round(hh) + 'px  ' + (hh <= innerHeight + 1 ? 'OK egy kepernyo' : 'TULLOG') + '  motion ' + (reduce ? 'REDUCED' : 'on') + '  gsap ' + (window.gsap ? 'ok' : 'nincs');
    };
    measure(); addEventListener('resize', measure);
  }
})();
