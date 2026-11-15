(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Hero name: reveal letter by letter, keeping one continuous gradient across letters.
  const nameEl = document.querySelector('[data-letters]');
  if (nameEl && !reduceMotion) {
    const words = nameEl.textContent.trim().split(/\s+/);
    nameEl.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = words.join(' ');
    nameEl.appendChild(sr);
    let n = 0;
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const l = document.createElement('span');
        l.className = 'l';
        l.textContent = ch;
        l.style.setProperty('--n', n++);
        w.appendChild(l);
      }
      nameEl.appendChild(w);
      if (wi < words.length - 1) nameEl.appendChild(document.createTextNode(' '));
    });
    const paintGradient = () => {
      const box = nameEl.getBoundingClientRect();
      nameEl.querySelectorAll('.l').forEach((l) => {
        const r = l.getBoundingClientRect();
        l.style.backgroundSize = `${box.width}px ${box.height}px`;
        l.style.backgroundPosition = `${box.left - r.left}px ${box.top - r.top}px`;
      });
    };
    paintGradient();
    if (document.fonts) document.fonts.ready.then(paintGradient);
    window.addEventListener('resize', paintGradient, { passive: true });
  }

  // Top bar background once the page scrolls.
  const topbar = document.querySelector('.topbar');
  const onScroll = () => topbar.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Scroll reveal + counters.
  const counters = document.querySelectorAll('[data-count]');
  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = target; return; }
    const start = performance.now();
    const dur = 1200;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        e.target.querySelectorAll('[data-count]').forEach(runCounter);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    counters.forEach((el) => { el.textContent = el.dataset.count; });
  }

  // Button ripple.
  document.querySelectorAll('[data-ripple]').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      if (reduceMotion) return;
      const r = btn.getBoundingClientRect();
      const dot = document.createElement('span');
      dot.className = 'ripple';
      dot.style.left = `${e.clientX - r.left}px`;
      dot.style.top = `${e.clientY - r.top}px`;
      btn.appendChild(dot);
      dot.addEventListener('animationend', () => dot.remove());
    });
  });

  // Gentle 3D tilt for mouse users (touch gets the CSS press effect instead).
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      let raf = 0;
      card.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(800px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateZ(0)`;
        });
      });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        card.style.transform = '';
      });
    });
  }

  // Starfield behind the hero: capped particle count, paused off-screen or in a hidden tab.
  const canvas = document.getElementById('stars');
  if (canvas && !reduceMotion && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const COUNT = window.innerWidth < 640 ? 40 : 60;
    let w = 0;
    let h = 0;
    let stars = [];
    let visible = true;
    let raf = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const seed = () => {
      stars = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        vy: -(Math.random() * 0.25 + 0.05),
        vx: (Math.random() - 0.5) * 0.12,
        p: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.3 ? '244,114,182' : '196,181,253',
      }));
    };
    const frame = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.y < -4) { s.y = h + 4; s.x = Math.random() * w; }
        if (s.x < -4) s.x = w + 4; else if (s.x > w + 4) s.x = -4;
        const a = 0.35 + 0.45 * Math.sin(t / 900 + s.p);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${s.hue},${a.toFixed(3)})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    resize();
    seed();
    start();
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      // Mobile browsers fire resize when the URL bar hides; only reseed on width changes.
      resize();
      if (window.innerWidth !== lastW) { lastW = window.innerWidth; seed(); }
    }, { passive: true });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }
})();
