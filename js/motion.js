/* ============================================================
   BUDAI PSZICHOLÓGUS KÖZPONT · motion.js
   GSAP-extrák. Csak finomít: soronkénti mask-reveal a címeken, halk parallax
   a záró fotókon, ScrollTrigger idle-guard frissítés. Ha a GSAP hiányzik vagy
   reduced motion aktív, semmi nem hiányzik az oldalról (RB2, RB4, RB6).
   ============================================================ */
(function () {
  'use strict';
  var BP = window.BP || {};
  if (BP.reduce || typeof window.gsap === 'undefined') return;
  var gsap = window.gsap;
  document.documentElement.classList.add('has-gsap');

  var hasST = typeof window.ScrollTrigger !== 'undefined';
  if (hasST) {
    gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.config({ ignoreMobileResize: true });
    if (BP.lenis) BP.lenis.on('scroll', window.ScrollTrigger.update);

    /* RB4: refresh csak görgetés-csendben, koaleszkálva, újrapróbálva */
    var lastScrollT = 0, pending = false, tries = 0;
    addEventListener('scroll', function () { lastScrollT = performance.now(); }, { passive: true });
    function queueIdleRefresh() {
      if (pending) return; pending = true; tries = 0;
      (function tick() {
        if (performance.now() - lastScrollT > 500 || tries > 40) { pending = false; window.ScrollTrigger.refresh(); }
        else { tries++; setTimeout(tick, 200); }
      })();
    }
    addEventListener('load', queueIdleRefresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueIdleRefresh);
    setTimeout(queueIdleRefresh, 2500); setTimeout(queueIdleRefresh, 6000);
    [].forEach.call(document.images, function (im) { if (!im.complete) im.addEventListener('load', queueIdleRefresh, { once: true }); });
  }

  /* Soronkénti mask-reveal a [data-split] címeken (fonts.ready UTÁN, .sline padding az Ő/Ű-nek) */
  function splitAll() {
    if (typeof window.SplitText === 'undefined') return;
    gsap.registerPlugin(window.SplitText);
    [].forEach.call(document.querySelectorAll('[data-split]'), function (el) {
      var inHero = !!el.closest('.hero');
      window.SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'sline', autoSplit: true,
        onSplit: function (self) {
          var vars = { yPercent: 108, duration: .95, ease: 'power3.out', stagger: .075 };
          if (inHero) { vars.delay = .12; return gsap.from(self.lines, vars); }
          if (hasST) vars.scrollTrigger = { trigger: el, start: 'top 88%', once: true };
          return gsap.from(self.lines, vars);
        }
      });
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(splitAll); else splitAll();

  /* Hero fotó: egy lassú beúszás (egy elem, egy driver) */
  var heroImg = document.querySelector('.hero--spread .hero__fig img, .hero--cover .hero__img img, .hero--collage .pan--a img');
  if (heroImg) gsap.fromTo(heroImg, { scale: 1.06 }, { scale: 1, duration: 1.8, ease: 'power2.out' });

  /* Halk parallax a záró és a borító-fotókon (scale a résmentességért, a transform egyetlen gazdája a GSAP) */
  if (hasST) {
    gsap.utils.toArray('.closer__img img').forEach(function (img) {
      gsap.set(img, { scale: 1.14 });
      gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    /* Off-grid spread képek: a két fotó ellentétes irányban csúszik pár százalékot */
    gsap.utils.toArray('.spread figure').forEach(function (fig, i) {
      gsap.fromTo(fig, { y: i % 2 ? 40 : -20 }, { y: i % 2 ? -40 : 20, ease: 'none', scrollTrigger: { trigger: fig.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    /* Az ár nagy száma: halk vízszintes csúszás, hogy a kilógás megmozduljon */
    var big = document.querySelector('.price__big');
    if (big) gsap.fromTo(big, { x: -24 }, { x: 24, ease: 'none', scrollTrigger: { trigger: big, start: 'top bottom', end: 'bottom top', scrub: true } });
  }
})();
