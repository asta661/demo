/* ===================================================================
   FOREVER BEGINS WITH YOU — MAIN SCRIPT
   Organized into clear, reusable modules. Each module owns one concern
   and exposes an init function. Everything is wired up once, at the
   bottom, from a single DOMContentLoaded listener.

   Modules:
     - CONFIG                 shared constants / tuning values
     - Utils                  small reusable helpers
     - Loader                 premium preloader with progress bar
     - ScrollProgress         top progress bar + navbar scroll state
     - TimelineJourney        scroll-linked "Our Journey" progress + node reveal
     - FinalHeart             draws the closing neon heart, then reveals content
     - ForeverModal           fullscreen "Always & Forever" video popup
     - SmoothNav              anchor scrolling + active-link highlighting
     - RevealOnScroll         IntersectionObserver-driven section reveals
     - CursorGlow             desktop mouse-follow glow
     - TiltEffect             subtle parallax tilt on [data-tilt] elements
     - ParticleField          shared engine for floating hearts + sakura petals
     - Starfield              twinkling hero starfield
     - Fireflies              drifting glow particles in hero
     - HeroParallax           mouse-follow parallax for moon + clouds
     - Gallery                polaroid carousel cycling
     - Letter                 envelope open + modal
     - SakuraNotes            clickable tree note tooltips
     - Cake                    ambient balloons/gifts, candle blow-out, layered
                                fireworks + confetti finale (DPR-correct canvas)
=================================================================== */

(() => {
  'use strict';

  /* =================================================================
     CONFIG
  ================================================================= */
  const CONFIG = {
    hearts: {
      count: 16,
      sizeMin: 10,
      sizeMax: 24,
      durationMin: 8,
      durationMax: 16,
      delayMax: 14,
      opacityMin: 0.4,
      opacityMax: 0.8,
    },
    petals: {
      count: 14,
      sizeMin: 8,
      sizeMax: 15,
      durationMin: 9,
      durationMax: 17,
      delayMax: 16,
      opacityMin: 0.5,
      opacityMax: 0.9,
      driftMax: 70,
    },
    stars: {
      count: 60,
      sizeMin: 1,
      sizeMax: 2.5,
      durationMin: 2.5,
      durationMax: 5.5,
      delayMax: 6,
    },
    fireflies: {
      count: 12,
      durationMin: 6,
      durationMax: 11,
      delayMax: 8,
      opacityMin: 0.5,
      opacityMax: 0.95,
      driftRange: 60,
    },
    parallax: {
      maxShiftX: 18,
      maxShiftY: 12,
      ease: 0.06,
    },
    reveal: {
      threshold: 0.18,
      rootMargin: '0px 0px -8% 0px',
    },
    fireworks: {
      particleCount: 60,
      maxBursts: 22,
      burstIntervalMs: 380,
      gravity: 0.042,
      fadeSpeed: 0.010,
      colors: ['#f76e94', '#ffb648', '#ff7ab6', '#fff2c8', '#e94f7a', '#ffffff', '#ffd166', '#ff99c2', '#e0b0a3'],
    },
    confetti: {
      count: 80,
      fallSpeedMin: 1.4,
      fallSpeedMax: 3.4,
      colors: ['#f76e94', '#ffb648', '#ff8fae', '#fff2c8', '#e94f7a', '#e0b0a3'],
    },
    loaderMinDurationMs: 1100,
  };

  /* =================================================================
     UTILS
  ================================================================= */
  const Utils = {
    rand(min, max) {
      return Math.random() * (max - min) + min;
    },
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },
    debounce(fn, wait = 150) {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), wait);
      };
    },
    prefersReducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },
    isTouchDevice() {
      return window.matchMedia('(hover: none)').matches;
    },
  };

  /* =================================================================
     LOADER — cinematic intro screen. Sits and breathes (heart pulse +
     falling petals) until the visitor taps Continue, at which point it
     plays a soft heartbeat sound three times, then fades into the hero.
     Falls back gracefully with no sound if autoplay/AudioContext is
     blocked — the fade/reveal always completes either way.
  ================================================================= */
  const Loader = {
    playHeartbeat(times = 5) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return Promise.resolve();
        const ctx = new Ctx();

        const thud = (startAt, freq, peakGain, dur) => {
          const now = startAt;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq * 1.4, now);
          osc.frequency.exponentialRampToValueAtTime(freq, now + 0.05);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(220, now);
          filter.Q.value = 0.7;

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.035);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

          osc.connect(filter).connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + dur + 0.05);
        };

        const beat = (delay) => new Promise((resolve) => {
          setTimeout(() => {
            const now = ctx.currentTime;
            const jitter = Utils.rand(-0.01, 0.01);
            // "Lub" — deeper, longer, louder. "Dub" — higher, shorter, softer.
            thud(now, 55 + Utils.rand(-2, 2), 0.85, 0.3);
            thud(now + 0.16 + jitter, 42 + Utils.rand(-2, 2), 0.5, 0.24);
            resolve();
          }, delay);
        });

        let chain = beat(0);
        for (let i = 1; i < times; i++) {
          chain = chain.then(() => beat(900));
        }

        return chain
          .then(() => new Promise((r) => setTimeout(r, 600)))
          .finally(() => setTimeout(() => ctx.close(), 500));
      } catch (e) {
        return Promise.resolve();
      }
    },

    spawnPetals() {
      const container = document.getElementById('loaderPetals');
      if (!container || Utils.prefersReducedMotion()) return;
      ParticleField.spawn(container, {
        className: 'sakura-petal',
        opacityVar: '--petal-opacity',
        driftVar: '--petal-drift',
        count: 10,
        sizeMin: 8,
        sizeMax: 14,
        durationMin: 8,
        durationMax: 15,
        delayMax: 10,
        opacityMin: 0.4,
        opacityMax: 0.8,
        driftMax: 50,
      });
    },

    init() {
      const loader = document.getElementById('loader');
      const continueBtn = document.getElementById('loaderContinueBtn');
      if (!loader) return;

      document.body.classList.add('is-loading');
      this.spawnPetals();

      if (!continueBtn) return;

      let dismissed = false;
      continueBtn.addEventListener('click', () => {
        if (dismissed) return;
        dismissed = true;
        continueBtn.disabled = true;
        continueBtn.style.pointerEvents = 'none';

        const reveal = () => {
          loader.classList.add('is-hidden');
          document.body.classList.remove('is-loading');
          document.body.classList.add('hero-revealed');
        };

        if (Utils.prefersReducedMotion()) {
          reveal();
          return;
        }

        this.playHeartbeat(5).then(reveal);
      }, { once: true });
    },
  };

  /* =================================================================
     SCROLL PROGRESS + NAVBAR STATE
     Single scroll listener (rAF-throttled) drives both the top progress
     bar fill and the navbar's "scrolled" glass state.
  ================================================================= */
  const ScrollProgress = {
    init() {
      const bar = document.getElementById('scrollProgress');
      const navbar = document.getElementById('navbar');
      if (!bar && !navbar) return;

      let ticking = false;

      const update = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

        if (bar) bar.style.width = progress + '%';
        if (navbar) navbar.classList.toggle('is-scrolled', scrollTop > 40);

        ticking = false;
      };

      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      }, { passive: true });

      update();
    },
  };

  /* =================================================================
     TIMELINE JOURNEY — makes the "Our Journey" line genuinely respond
     to how far the visitor has scrolled through it, rather than a
     one-shot animate-in. As the section moves through the viewport,
     --timeline-progress climbs from 0 to 1, driving the glowing fill
     and the traveling spark in CSS. Each node also gets an `.is-reached`
     class once the fill passes it, so nodes light up in the order the
     visitor actually scrolls past them — the "traveling through
     memories" feeling the section is meant to have.
  ================================================================= */
  const TimelineJourney = {
    init() {
      const section = document.getElementById('timeline');
      const wrap = document.getElementById('timelineWrap');
      const line = document.getElementById('timelineLine');
      if (!section || !wrap || !line) return;

      const items = Array.from(wrap.querySelectorAll('.timeline-item'));
      const reduced = Utils.prefersReducedMotion();

      if (reduced) {
        line.style.setProperty('--timeline-progress', '1');
        items.forEach((item) => item.classList.add('is-reached'));
        return;
      }

      let ticking = false;

      const update = () => {
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;

        // Progress climbs as the section travels from just-entering
        // the bottom of the viewport to comfortably centered, so the
        // fill completes a little before the visitor leaves the
        // section rather than exactly at its last pixel.
        const start = vh * 0.85;
        const end = rect.height * 0.4;
        const traveled = start - rect.top;
        const span = start + end;
        const progress = Utils.clamp(span > 0 ? traveled / span : 0, 0, 1);

        line.style.setProperty('--timeline-progress', progress.toFixed(4));

        const count = items.length;
        items.forEach((item, i) => {
          const nodeAt = count > 1 ? i / (count - 1) : 0;
          item.classList.toggle('is-reached', progress >= nodeAt);
        });

        ticking = false;
      };

      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      }, { passive: true });

      window.addEventListener('resize', Utils.debounce(update, 150));

      update();
    },
  };

  /* =================================================================
     SMOOTH NAV — anchor scrolling with active-link tracking.
     Native `scroll-behavior: smooth` (set in CSS) handles the actual
     motion; this module just keeps the active nav-link in sync via
     IntersectionObserver rather than scroll-position math.
  ================================================================= */
  const SmoothNav = {
    init() {
      const links = Array.from(document.querySelectorAll('[data-nav-link]'));
      if (!links.length) return;

      const linkForSection = new Map();
      const sections = [];

      links.forEach((link) => {
        const section = document.querySelector(link.getAttribute('href'));
        if (section) {
          linkForSection.set(section, link);
          sections.push(section);
        }
      });

      if (!sections.length) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const activeLink = linkForSection.get(entry.target);
              if (!activeLink) return;
              links.forEach((l) => l.classList.remove('active'));
              activeLink.classList.add('active');
            }
          });
        },
        { threshold: 0.5, rootMargin: '-40% 0px -40% 0px' }
      );

      sections.forEach((section) => observer.observe(section));
    },
  };

  /* =================================================================
     REVEAL ON SCROLL — IntersectionObserver toggles `.in-view` on any
     [data-reveal] element. Staggered via `data-reveal-delay` (ms).
     Once revealed, elements stay revealed (no re-hide on scroll up),
     which reads as more premium/intentional than a flicker effect.
  ================================================================= */
  const RevealOnScroll = {
    init() {
      const items = document.querySelectorAll('[data-reveal]');
      if (!items.length) return;

      if (Utils.prefersReducedMotion()) {
        items.forEach((el) => el.classList.add('in-view'));
        return;
      }

      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const delay = parseInt(el.dataset.revealDelay || '0', 10);
            setTimeout(() => el.classList.add('in-view'), delay);
            obs.unobserve(el);
          });
        },
        CONFIG.reveal
      );

      items.forEach((el) => observer.observe(el));
    },
  };

  /* =================================================================
     CURSOR GLOW — soft light that follows the pointer on desktop.
     Uses rAF to interpolate toward the pointer for a silky trailing
     feel rather than snapping directly to cursor position.
  ================================================================= */
  const CursorGlow = {
    init() {
      const glow = document.getElementById('cursorGlow');
      if (!glow || Utils.isTouchDevice() || Utils.prefersReducedMotion()) return;

      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight / 2;
      let currentX = targetX;
      let currentY = targetY;
      let active = false;

      window.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        if (!active) {
          active = true;
          glow.classList.add('is-active');
        }
      }, { passive: true });

      window.addEventListener('mouseleave', () => {
        active = false;
        glow.classList.remove('is-active');
      });

      const animate = () => {
        currentX += (targetX - currentX) * 0.12;
        currentY += (targetY - currentY) * 0.12;
        glow.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animate);
      };
      animate();
    },
  };

  /* =================================================================
     TILT EFFECT — subtle 3D parallax tilt on [data-tilt] elements
     (dome, sakura tree, cake) that follows the pointer within the
     element's bounds. Skipped on touch devices and reduced-motion.
  ================================================================= */
  const TiltEffect = {
    init() {
      if (Utils.isTouchDevice() || Utils.prefersReducedMotion()) return;

      const elements = document.querySelectorAll('[data-tilt]');
      const maxTilt = 6; // degrees

      elements.forEach((el) => {
        el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          const rotateY = px * maxTilt * 2;
          const rotateX = py * -maxTilt * 2;
          el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        el.addEventListener('mouseleave', () => {
          el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
        });
      });
    },
  };

  /* =================================================================
     PARTICLE FIELD — shared generator used for both the hero's
     floating hearts and the falling sakura petals. Avoids duplicating
     near-identical DOM-creation logic across two features.
  ================================================================= */
  const ParticleField = {
    spawn(container, options) {
      if (!container) return;
      const frag = document.createDocumentFragment();

      for (let i = 0; i < options.count; i++) {
        const el = document.createElement('div');
        el.className = options.className;
        if (options.innerHTML) el.innerHTML = options.innerHTML;

        const size = Utils.rand(options.sizeMin, options.sizeMax);
        const left = Utils.rand(0, 100);
        const duration = Utils.rand(options.durationMin, options.durationMax);
        const delay = Utils.rand(0, options.delayMax);
        const opacity = Utils.rand(options.opacityMin, options.opacityMax);

        el.style.left = left + '%';
        if (options.innerHTML) {
          el.style.fontSize = size + 'px';
        } else {
          el.style.width = size + 'px';
          el.style.height = size + 'px';
        }
        el.style.animationDuration = duration + 's';
        el.style.animationDelay = delay + 's';

        if (options.opacityVar) el.style.setProperty(options.opacityVar, opacity.toFixed(2));
        if (options.driftVar) {
          const drift = Utils.rand(-options.driftMax, options.driftMax);
          el.style.setProperty(options.driftVar, drift.toFixed(1) + 'px');
        }

        frag.appendChild(el);
      }

      container.appendChild(frag);
    },

    initHearts() {
      const container = document.getElementById('heartsContainer');
      ParticleField.spawn(container, {
        className: 'floating-heart',
        innerHTML: '♥',
        opacityVar: '--heart-opacity',
        ...CONFIG.hearts,
      });
    },

    initSakuraPetals() {
      const container = document.getElementById('sakuraPetalsLayer');
      ParticleField.spawn(container, {
        className: 'sakura-petal',
        opacityVar: '--petal-opacity',
        driftVar: '--petal-drift',
        ...CONFIG.petals,
      });
    },

    initScene2Petals() {
      const container = document.getElementById('scene2Petals');
      ParticleField.spawn(container, {
        className: 'sakura-petal',
        opacityVar: '--petal-opacity',
        driftVar: '--petal-drift',
        count: 9,
        sizeMin: 8,
        sizeMax: 15,
        durationMin: 10,
        durationMax: 18,
        delayMax: 12,
        opacityMin: 0.35,
        opacityMax: 0.7,
        driftMax: 45,
      });
    },

    /* Extends the falling-petal motif across every remaining scene so
       the whole site feels connected by one continuous drift of
       sakura, not just the hero and the quote scene. Each section gets
       its own hand-tuned density — quieter where content needs focus
       (gallery, reasons), fuller where the moment is more emotional
       (sakura tree, final chapter). */
    initSceneSet(containerId, overrides) {
      const container = document.getElementById(containerId);
      if (!container) return;
      ParticleField.spawn(container, {
        className: 'sakura-petal',
        opacityVar: '--petal-opacity',
        driftVar: '--petal-drift',
        sizeMin: 7,
        sizeMax: 14,
        durationMin: 10,
        durationMax: 19,
        delayMax: 14,
        opacityMin: 0.3,
        opacityMax: 0.65,
        driftMax: 45,
        ...overrides,
      });
    },

    initAllScenePetals() {
      // Timeline: light touch, memories should stay the visual focus.
      this.initSceneSet('timelinePetals', { count: 6, opacityMax: 0.5 });
      // Gallery: minimal — photos are the star here.
      this.initSceneSet('galleryPetals', { count: 5, opacityMax: 0.45 });
      // Letter + reasons: a little more romantic density.
      this.initSceneSet('reasonsPetals', { count: 8 });
      // Sakura tree: the emotional heart of the site — fullest drift.
      this.initSceneSet('sakuraSectionPetals', { count: 22, opacityMax: 0.75, sizeMax: 18 });
      // Cake: kept light so it doesn't compete with fireworks later.
      this.initSceneSet('cakePetals', { count: 10, opacityMax: 0.55 });
      // Final chapter: slow, generous, a quiet closing flourish.
      this.initSceneSet('finalPetals', { count: 10, durationMin: 13, durationMax: 22, opacityMax: 0.6 });
    },

    /* Fireflies for the timeline section — tiny glowing dots scattered
       at random positions that drift upward on a loop. Positioned with
       both top/left (unlike petals, which only vary horizontally),
       so this uses its own light spawner rather than .spawn(). */
    initTimelineFireflies() {
      const container = document.getElementById('timelineFireflies');
      if (!container) return;
      const frag = document.createDocumentFragment();
      const count = 9;

      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'timeline-firefly';
        el.style.left = Utils.rand(4, 96) + '%';
        el.style.top = Utils.rand(10, 90) + '%';
        el.style.animationDuration = Utils.rand(6, 11) + 's';
        el.style.animationDelay = Utils.rand(0, 8) + 's';
        frag.appendChild(el);
      }

      container.appendChild(frag);
    },

    /* Tiny ambient dust motes — dimmer and smaller than fireflies,
       pure sparkle with no directional drift beyond a gentle wobble. */
    initTimelineMotes() {
      const container = document.getElementById('timelineMotes');
      if (!container) return;
      const frag = document.createDocumentFragment();
      const count = 14;

      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'timeline-mote';
        el.style.left = Utils.rand(2, 98) + '%';
        el.style.top = Utils.rand(5, 95) + '%';
        el.style.animationDuration = Utils.rand(4, 8) + 's';
        el.style.animationDelay = Utils.rand(0, 6) + 's';
        frag.appendChild(el);
      }

      container.appendChild(frag);
    },

    init() {
      if (Utils.prefersReducedMotion()) return;
      ParticleField.initHearts();
      ParticleField.initSakuraPetals();
      ParticleField.initScene2Petals();
      ParticleField.initAllScenePetals();
      ParticleField.initTimelineFireflies();
      ParticleField.initTimelineMotes();
    },
  };

  /* =================================================================
     STARFIELD — twinkling stars scattered across the upper hero sky.
     Each star gets a random position, size, and independent twinkle
     timing so the field never reads as a repeating pattern.
  ================================================================= */
  const Starfield = {
    init() {
      const container = document.getElementById('starsLayer');
      if (!container || Utils.prefersReducedMotion()) return;

      const { count, sizeMin, sizeMax, durationMin, durationMax, delayMax } = CONFIG.stars;
      const frag = document.createDocumentFragment();

      for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        const size = Utils.rand(sizeMin, sizeMax);
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.left = Utils.rand(0, 100) + '%';
        star.style.top = Utils.rand(0, 100) + '%';
        star.style.animationDuration = Utils.rand(durationMin, durationMax) + 's';
        star.style.animationDelay = Utils.rand(0, delayMax) + 's';
        star.style.setProperty('--star-opacity-min', Utils.rand(0.1, 0.25).toFixed(2));
        star.style.setProperty('--star-opacity-max', Utils.rand(0.65, 1).toFixed(2));

        frag.appendChild(star);
      }

      container.appendChild(frag);
    },
  };

  /* =================================================================
     FIREFLIES — small warm glowing dots that drift randomly around
     the lower hero scene. Each gets randomized drift waypoints so
     the motion feels organic rather than looped identically.
  ================================================================= */
  const Fireflies = {
    init() {
      const container = document.getElementById('firefliesLayer');
      if (!container || Utils.prefersReducedMotion()) return;

      const { count, durationMin, durationMax, delayMax, opacityMin, opacityMax, driftRange } = CONFIG.fireflies;
      const frag = document.createDocumentFragment();

      for (let i = 0; i < count; i++) {
        const fly = document.createElement('div');
        fly.className = 'firefly';

        fly.style.left = Utils.rand(5, 95) + '%';
        fly.style.bottom = Utils.rand(2, 30) + '%';
        fly.style.animationDuration =
          `${Utils.rand(durationMin, durationMax)}s, ${Utils.rand(durationMin, durationMax)}s`;
        fly.style.animationDelay = Utils.rand(0, delayMax) + 's';
        fly.style.setProperty('--fly-opacity', Utils.rand(opacityMin, opacityMax).toFixed(2));
        fly.style.setProperty('--fly-dx1', Utils.rand(-driftRange, driftRange).toFixed(1) + 'px');
        fly.style.setProperty('--fly-dy1', Utils.rand(-driftRange, -10).toFixed(1) + 'px');
        fly.style.setProperty('--fly-dx2', Utils.rand(-driftRange, driftRange).toFixed(1) + 'px');
        fly.style.setProperty('--fly-dy2', Utils.rand(-driftRange * 1.4, -20).toFixed(1) + 'px');
        fly.style.setProperty('--fly-dx3', Utils.rand(-driftRange, driftRange).toFixed(1) + 'px');
        fly.style.setProperty('--fly-dy3', Utils.rand(-driftRange, -10).toFixed(1) + 'px');

        frag.appendChild(fly);
      }

      container.appendChild(frag);
    },
  };

  /* =================================================================
     HERO PARALLAX — subtle mouse-follow parallax applied to the moon
     and cloud layers via CSS custom properties, smoothed with rAF
     lerp so it never snaps. Skipped on touch devices.
  ================================================================= */
  const HeroParallax = {
    init() {
      const hero = document.getElementById('hero');
      if (!hero || Utils.isTouchDevice() || Utils.prefersReducedMotion()) return;

      const { maxShiftX, maxShiftY, ease } = CONFIG.parallax;
      let targetX = 0, targetY = 0;
      let currentX = 0, currentY = 0;

      hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        targetX = px * maxShiftX;
        targetY = py * maxShiftY;
      }, { passive: true });

      hero.addEventListener('mouseleave', () => {
        targetX = 0;
        targetY = 0;
      });

      const animate = () => {
        currentX += (targetX - currentX) * ease;
        currentY += (targetY - currentY) * ease;
        hero.style.setProperty('--parallax-x', currentX.toFixed(2) + 'px');
        hero.style.setProperty('--parallax-y', currentY.toFixed(2) + 'px');
        requestAnimationFrame(animate);
      };
      animate();
    },
  };

  /* =================================================================
     GALLERY — polaroid carousel. Cycles DOM order on arrow click with
     a brief transition-state class so the reflow reads as a deliberate
     shuffle rather than an instant snap.
  ================================================================= */
  const Gallery = {
    init() {
      const track = document.getElementById('galleryTrack');
      const prevBtn = document.getElementById('galleryPrev');
      const nextBtn = document.getElementById('galleryNext');
      const burstLayer = document.getElementById('galleryBurst');
      if (!track || !prevBtn || !nextBtn) return;

      let isCycling = false;

      // Every visual difference between far/near/center cards is driven
      // by this data-slot attribute (0 = far left … 4 = far right),
      // reassigned to match true DOM order after every cycle. Keeping
      // position and "which card looks premium" in the same source of
      // truth avoids the two ever drifting apart across repeated cycles.
      const applySlots = () => {
        Array.from(track.children)
          .filter((el) => el.classList.contains('polaroid'))
          .forEach((card, i) => { card.dataset.slot = String(i); });
      };
      applySlots();

      // Small sakura-petal confetti burst centered on the gallery,
      // celebrating the newly active card. Self-cleans after ~700ms.
      const burst = () => {
        if (!burstLayer) return;
        const count = 8 + Math.round(Math.random() * 4); // 8–12
        for (let i = 0; i < count; i += 1) {
          const petal = document.createElement('span');
          petal.className = 'gallery-burst-petal';
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 70;
          petal.style.setProperty('--burst-x', `${Math.cos(angle) * dist}px`);
          petal.style.setProperty('--burst-y', `${Math.sin(angle) * dist}px`);
          petal.style.setProperty('--burst-rot', `${Math.round(Math.random() * 360)}deg`);
          petal.style.animationDelay = `${Math.random() * 80}ms`;
          burstLayer.appendChild(petal);
          setTimeout(() => petal.remove(), 820);
        }
      };

      const cycle = (direction) => {
        if (isCycling) return;
        isCycling = true;

        const cards = Array.from(track.children).filter((el) => el.classList.contains('polaroid'));

        // FLIP: record each card's current on-screen position before
        // the DOM reorder happens.
        const firstRects = new Map();
        cards.forEach((card) => firstRects.set(card, card.getBoundingClientRect()));

        if (direction === 'next') {
          track.appendChild(cards[0]);
        } else {
          track.insertBefore(cards[cards.length - 1], cards[0]);
        }

        // Reassign slots so the new middle card gets the premium look,
        // then force layout so those styles are applied before we
        // measure again.
        applySlots();
        // eslint-disable-next-line no-unused-expressions
        track.offsetHeight;

        cards.forEach((card) => {
          const first = firstRects.get(card);
          const last = card.getBoundingClientRect();
          const dx = first.left - last.left;
          if (Math.abs(dx) < 0.5) return;

          // `translate` is an independent CSS property (not the `transform`
          // shorthand), so it composes cleanly with the scale/rotate/z that
          // already comes from the [data-slot] rule, instead of overriding it.
          card.style.transition = 'none';
          card.style.translate = `${dx}px 0`;

          requestAnimationFrame(() => {
            card.style.transition = '';
            card.style.translate = '';
          });
        });

        burst();
        setTimeout(() => { isCycling = false; }, 950);
      };

      // Ripple + click on arrows.
      const addRipple = (btn, e) => {
        const rect = btn.getBoundingClientRect();
        const span = document.createElement('span');
        const size = Math.max(rect.width, rect.height) * 1.4;
        span.className = 'gallery-arrow-ripple';
        span.style.width = `${size}px`;
        span.style.height = `${size}px`;
        const x = (e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
        const y = (e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;
        span.style.left = `${x}px`;
        span.style.top = `${y}px`;
        btn.appendChild(span);
        setTimeout(() => span.remove(), 620);
      };

      nextBtn.addEventListener('click', (e) => { addRipple(nextBtn, e); cycle('next'); });
      prevBtn.addEventListener('click', (e) => { addRipple(prevBtn, e); cycle('prev'); });

      // Click a polaroid to open it in the memory modal. Delegated on
      // the track so it keeps working after cycle() reorders the DOM.
      track.addEventListener('click', (e) => {
        const card = e.target.closest('.polaroid');
        if (!card) return;
        Memories.open(card);
      });

      // Touch swipe — left/right drag cycles the carousel, same as the
      // arrow buttons.
      let touchStartX = null;
      let touchStartY = null;
      track.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      track.addEventListener('touchend', (e) => {
        if (touchStartX === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        touchStartX = null;
        touchStartY = null;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
        cycle(dx < 0 ? 'next' : 'prev');
      }, { passive: true });
    },
  };

  /* =================================================================
     MEMORIES MODAL — opens a polaroid into a fullscreen elegant popup
     with a zoom-in photo animation. Supports Prev/Next and arrow-key
     navigation between all memories without closing the modal, each
     swap crossfading rather than jump-cutting. Mirrors the Letter and
     Reasons modals' open/close/backdrop/Escape conventions.
  ================================================================= */
  const Memories = {
    items: [
      { photoClass: 'ph-1', caption: 'A quiet afternoon, just the two of us.' },
      { photoClass: 'ph-2', caption: 'The first photo that made me smile like this.' },
      { photoClass: 'ph-3', caption: 'Every moment with you is my favorite story.' },
      { photoClass: 'ph-4', caption: 'Somewhere in between laughter and forever.' },
      { photoClass: 'ph-5', caption: 'Still my favorite view — you, smiling.' },
    ],
    index: 0,

    render(swap) {
      const photo = document.getElementById('memoryModalPhoto');
      const caption = document.getElementById('memoryModalCaption');
      const count = document.getElementById('memoryModalCount');
      if (!photo || !caption) return;

      const apply = () => {
  const item = this.items[this.index];
  photo.className = 'memory-modal-photo ' + item.photoClass;

  const sourceCard = document.querySelector(`.polaroid[data-memory-index="${this.index}"] .polaroid-img`);
  if (sourceCard && sourceCard.getAttribute('src')) {
    photo.style.backgroundImage = `url('${sourceCard.getAttribute('src')}')`;
    photo.style.backgroundSize = 'cover';
    photo.style.backgroundPosition = 'center';
  } else {
    photo.style.backgroundImage = '';
  }

  caption.textContent = item.caption;
  if (count) count.textContent = `${this.index + 1} / ${this.items.length}`;
  photo.classList.remove('is-swapping');
  caption.classList.remove('is-swapping');
};

      if (!swap) {
        apply();
        return;
      }

      photo.classList.add('is-swapping');
      caption.classList.add('is-swapping');
      setTimeout(apply, 200);
    },

    next() {
      this.index = (this.index + 1) % this.items.length;
      this.render(true);
    },

    prev() {
      this.index = (this.index - 1 + this.items.length) % this.items.length;
      this.render(true);
    },

    open(card) {
      const modal = document.getElementById('memoryModal');
      if (!modal) return;

      const requested = parseInt(card?.dataset.memoryIndex, 10);
      this.index = Number.isNaN(requested) ? 0 : requested;

      this.render(false);
      modal.classList.add('active');
    },

    close() {
      const modal = document.getElementById('memoryModal');
      if (modal) modal.classList.remove('active');
    },

    init() {
      const modal = document.getElementById('memoryModal');
      const closeBtn = document.getElementById('memoryModalClose');
      const prevBtn = document.getElementById('memoryModalPrev');
      const nextBtn = document.getElementById('memoryModalNext');
      if (!modal) return;

      if (closeBtn) closeBtn.addEventListener('click', () => this.close());
      if (prevBtn) prevBtn.addEventListener('click', () => this.prev());
      if (nextBtn) nextBtn.addEventListener('click', () => this.next());

      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close();
      });

      document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowRight') this.next();
        if (e.key === 'ArrowLeft') this.prev();
      });
    },
  };

  /* =================================================================
     LETTER — envelope open interaction + full-letter modal.
  ================================================================= */
  const Letter = {
    init() {
      const envelopeWrap = document.getElementById('envelopeWrap');
      const openLetterBtn = document.getElementById('openLetterBtn');
      const letterModal = document.getElementById('letterModal');
      const letterModalClose = document.getElementById('letterModalClose');
      if (!envelopeWrap || !letterModal) return;

      const openLetter = () => {
        envelopeWrap.classList.add('opened');
        setTimeout(() => letterModal.classList.add('active'), 500);
      };

      const closeLetter = () => {
        letterModal.classList.remove('active');
        setTimeout(() => envelopeWrap.classList.remove('opened'), 400);
      };

      envelopeWrap.addEventListener('click', openLetter);
      if (openLetterBtn) openLetterBtn.addEventListener('click', openLetter);
      if (letterModalClose) letterModalClose.addEventListener('click', closeLetter);

      letterModal.addEventListener('click', (e) => {
        if (e.target === letterModal) closeLetter();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && letterModal.classList.contains('active')) closeLetter();
      });
    },
  };

  /* =================================================================
     REASONS MODAL — fullscreen cinematic "10 Reasons" experience.
     One reason shown at a time with a fade + scale transition;
     Prev/Next cycle through, Escape/backdrop/close all dismiss it —
     same conventions as the Letter and Memories modals.
  ================================================================= */
  const ReasonsModal = {
    items: [
      { icon: '♥', title: 'Your Smile', text: "It lights up every room, and somehow it's my favorite place to be." },
      { icon: '✿', title: 'Your Kindness', text: 'You carry the purest heart I have ever known.' },
      { icon: '★', title: 'Your Care', text: 'You always know exactly how to make me feel safe.' },
      { icon: '♥', title: 'Your Laugh', text: "It's the sound I never get tired of hearing." },
      { icon: '✿', title: 'Your Patience', text: 'You stay gentle with me even when I make it hard.' },
      { icon: '★', title: 'Your Strength', text: 'You carry so much, yet you still make room for me.' },
      { icon: '♥', title: 'Your Eyes', text: 'They tell me everything, even when words run out.' },
      { icon: '✿', title: 'Your Support', text: 'You believe in me even on the days I forget to.' },
      { icon: '★', title: 'Our Little Moments', text: 'The ordinary days with you became my favorite memories.' },
      { icon: '♥', title: 'Simply You', text: 'Because out of everyone, my heart chose you.' },
    ],
    index: 0,

    render() {
      const card = document.getElementById('reasonsModalCard');
      const icon = document.getElementById('reasonsModalIcon');
      const title = document.getElementById('reasonsModalTitle');
      const text = document.getElementById('reasonsModalText');
      const count = document.getElementById('reasonsModalCount');
      if (!card) return;

      card.classList.remove('is-visible');

      setTimeout(() => {
        const item = this.items[this.index];
        icon.textContent = item.icon;
        title.textContent = item.title;
        text.textContent = item.text;
        count.textContent = `${this.index + 1} / ${this.items.length}`;
        card.classList.add('is-visible');
      }, 180);
    },

    next() {
      this.index = (this.index + 1) % this.items.length;
      this.render();
    },

    prev() {
      this.index = (this.index - 1 + this.items.length) % this.items.length;
      this.render();
    },

    open() {
      const modal = document.getElementById('reasonsModal');
      if (!modal) return;
      this.index = 0;
      modal.classList.add('active');
      this.render();
    },

    close() {
      const modal = document.getElementById('reasonsModal');
      const card = document.getElementById('reasonsModalCard');
      if (!modal) return;
      modal.classList.remove('active');
      if (card) card.classList.remove('is-visible');
    },

    init() {
      const openBtn = document.getElementById('openReasonsBtn');
      const modal = document.getElementById('reasonsModal');
      const closeBtn = document.getElementById('reasonsModalClose');
      const prevBtn = document.getElementById('reasonsModalPrev');
      const nextBtn = document.getElementById('reasonsModalNext');
      if (!openBtn || !modal) return;

      openBtn.addEventListener('click', () => this.open());
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());
      if (prevBtn) prevBtn.addEventListener('click', () => this.prev());
      if (nextBtn) nextBtn.addEventListener('click', () => this.next());

      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close();
      });

      document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowRight') this.next();
        if (e.key === 'ArrowLeft') this.prev();
      });
    },
  };

  /* =================================================================
     FINAL HEART — draws the neon heart's outline stroke-by-stroke
     using its real measured path length (so the dash animation is
     pixel-accurate regardless of path edits), slowly and smoothly,
     then reveals "Always & Forever" only once the line is complete —
     a deliberate, romantic pace rather than everything appearing at
     once.
  ================================================================= */
  const FinalHeart = {
    init() {
      const wrap = document.getElementById('finalHeartWrap');
      const path = document.getElementById('neonHeartPath');
      const content = document.getElementById('finalHeartContent');
      if (!wrap || !path || !content) return;

      const reduced = Utils.prefersReducedMotion();
      const length = path.getTotalLength();
      wrap.style.setProperty('--heart-length', length);

      if (reduced) {
        wrap.classList.add('is-drawing', 'heart-drawn');
        content.classList.add('content-visible');
        return;
      }

      const draw = () => {
        // Kick off on the next frame so the initial dashoffset has
        // actually been applied before we transition it.
        requestAnimationFrame(() => {
          wrap.classList.add('is-drawing');
        });

        // Content and ambient pulse arrive only once the 3.2s stroke
        // transition (defined in CSS) has actually finished.
        setTimeout(() => {
          wrap.classList.add('heart-drawn');
          content.classList.add('content-visible');
        }, 3300);
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            draw();
            observer.disconnect();
          }
        });
      }, { threshold: 0.4 });

      observer.observe(wrap);
    },
  };

  /* =================================================================
     FOREVER MODAL — fullscreen video popup opened from the final
     "Always & Forever" button. Never opens a new tab; background
     blurs and the frame animates into view, matching the site's other
     modal conventions.
  ================================================================= */
  const ForeverModal = {
    open() {
      const modal = document.getElementById('foreverModal');
      const video = document.getElementById('foreverModalVideo');
      if (modal) modal.classList.add('active');
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => { /* silently skip if blocked */ });
      }
    },

    close() {
      const modal = document.getElementById('foreverModal');
      const video = document.getElementById('foreverModalVideo');
      if (modal) modal.classList.remove('active');
      if (video) video.pause();
    },

    init() {
      const btn = document.getElementById('alwaysForeverBtn');
      const modal = document.getElementById('foreverModal');
      const closeBtn = document.getElementById('foreverModalClose');
      if (!btn || !modal) return;

      btn.addEventListener('click', () => this.open());
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());

      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) this.close();
      });
    },
  };

  /* =================================================================
     SAKURA NOTES — clickable dots on the tree reveal a tooltip message.
  ================================================================= */
  const SakuraNotes = {
    init() {
      const notes = document.querySelectorAll('.sakura-note');
      const tooltip = document.getElementById('sakuraTooltip');
      if (!notes.length || !tooltip) return;

      let activeNote = null;

      const positionTooltip = (note, wrap) => {
        const wrapRect = wrap.getBoundingClientRect();
        let top = note.offsetTop + 24;
        let left = note.offsetLeft - 90;

        if (left < 0) left = 10;
        if (left + 220 > wrapRect.width) left = wrapRect.width - 230;

        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
      };

      notes.forEach((note) => {
        note.addEventListener('click', (e) => {
          e.stopPropagation();

          if (activeNote === note) {
            tooltip.classList.remove('active');
            activeNote = null;
            return;
          }

          tooltip.textContent = note.getAttribute('data-note');
          const wrap = note.closest('.sakura-tree-wrap');
          if (wrap) positionTooltip(note, wrap);

          tooltip.classList.add('active');
          activeNote = note;
        });
      });

      document.addEventListener('click', () => {
        tooltip.classList.remove('active');
        activeNote = null;
      });
    },
  };

  /* =================================================================
     CAKE — ambient balloons/gifts on section entrance, candle blow-out,
     layered canvas fireworks with trails + crackle bursts, and a
     confetti/sakura/sparkle finale. DPR-correct, debounced-resize canvas.
  ================================================================= */
  const Cake = {
    init() {
      const blowBtn = document.getElementById('blowCandlesBtn');
      const cakeWrap = document.getElementById('cakeWrap');
      const flames = document.querySelectorAll('.candle-flame');
      const canvas = document.getElementById('fireworksCanvas');
      const section = document.getElementById('cake-section');
      if (!blowBtn || !canvas || !section) return;

      // Balloons/gifts stay hidden until the candles are blown out —
      // they cascade in one at a time, movie-reveal style, from
      // blowOutCandles() below via the .is-celebrating class.

      const ctx = canvas.getContext('2d');
      let particles = [];
      let showActive = false;
      let animationFrameId = null;
      let dpr = window.devicePixelRatio || 1;

      // Synthesized "blow" whoosh — filtered white noise burst, no
      // external audio file required (mirrors the loader's approach).
      const playBlowSound = () => {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          const actx = new AudioCtx();
          const duration = 0.8;
          const bufferSize = actx.sampleRate * duration;
          const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

          const noise = actx.createBufferSource();
          noise.buffer = buffer;

          const filter = actx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(500, actx.currentTime);
          filter.frequency.exponentialRampToValueAtTime(200, actx.currentTime + duration);
          filter.Q.value = 0.8;

          const gain = actx.createGain();
          gain.gain.setValueAtTime(0.0001, actx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.5, actx.currentTime + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + duration);

          noise.connect(filter).connect(gain).connect(actx.destination);
          noise.start();
          noise.stop(actx.currentTime + duration);
          setTimeout(() => actx.close(), (duration + 0.2) * 1000);
        } catch (e) {
          /* silently skip sound if AudioContext is unavailable */
        }
      };

      // Real "Happy Birthday" audio track — plays once, right as the
      // fireworks show begins. Falls back silently if playback is
      // blocked (e.g. autoplay restrictions).
      let birthdaySongPlayed = false;
      const playHappyBirthdaySong = () => {
        if (birthdaySongPlayed) return;
        birthdaySongPlayed = true;
        const songEl = document.getElementById('birthdaySongAudio');
        if (!songEl) return;
        songEl.currentTime = 0;
        songEl.volume = 0.85;
        songEl.play().catch(() => { /* silently skip if blocked */ });
      };

      const resizeCanvas = () => {
        dpr = window.devicePixelRatio || 1;
        const width = section.offsetWidth;
        const height = section.offsetHeight;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      resizeCanvas();
      window.addEventListener('resize', Utils.debounce(resizeCanvas, 200));

      // The section's real height can still be settling right after
      // DOMContentLoaded (images/fonts not yet laid out), which would
      // freeze the canvas at the wrong size with nothing to correct it
      // afterward. Re-measure once everything has finished loading,
      // and again a beat later once entrance animations have settled.
      window.addEventListener('load', resizeCanvas);
      setTimeout(resizeCanvas, 600);
      setTimeout(resizeCanvas, 1500);

      const cssWidth = () => canvas.width / dpr;
      const cssHeight = () => canvas.height / dpr;

      const createFirework = (x, y, opts = {}) => {
        const { particleCount, colors } = CONFIG.fireworks;
        const count = opts.particleCount || particleCount;
        const palette = opts.colors || colors;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
          const speed = Utils.rand(2, opts.speedMax || 6);
          const isSparkle = Math.random() < (opts.sparkleChance ?? 0.25);
          particles.push({
            type: 'spark',
            x, y,
            trailX: x,
            trailY: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color: palette[Math.floor(Math.random() * palette.length)],
            size: isSparkle ? Utils.rand(0.8, 1.6) : Utils.rand(1.5, 4.2),
            sparkle: isSparkle,
            twinkle: Math.random() * Math.PI * 2,
          });
        }

        // Layered "crackle" — roughly half of all bursts get a delayed
        // secondary pop of smaller, sparkle-heavy bursts scattered near
        // the original explosion, so it reads as a layered firework
        // rather than one flat pop. layered:false stops it recursing.
        if (opts.layered !== false && Math.random() < 0.45) {
          const crackleCount = Math.round(Utils.rand(2, 4));
          setTimeout(() => {
            for (let c = 0; c < crackleCount; c++) {
              createFirework(x + Utils.rand(-40, 40), y + Utils.rand(-10, 40), {
                particleCount: Math.round(count * 0.3),
                speedMax: 3,
                sparkleChance: 0.6,
                colors: palette,
                layered: false,
              });
            }
          }, Utils.rand(350, 550));
        }
      };

      const createConfettiBurst = () => {
        const w = cssWidth();
        for (let i = 0; i < CONFIG.confetti.count; i++) {
          const isPetal = Math.random() < 0.3;
          particles.push({
            type: 'confetti',
            x: Utils.rand(0, w),
            y: Utils.rand(-60, -10),
            vx: Utils.rand(-0.6, 0.6),
            vy: Utils.rand(CONFIG.confetti.fallSpeedMin, CONFIG.confetti.fallSpeedMax),
            rotation: Utils.rand(0, Math.PI * 2),
            rotSpeed: Utils.rand(-0.09, 0.09),
            size: isPetal ? Utils.rand(7, 11) : Utils.rand(4, 8),
            color: CONFIG.confetti.colors[Math.floor(Math.random() * CONFIG.confetti.colors.length)],
            alpha: 1,
            shape: isPetal ? 'petal' : (Math.random() < 0.4 ? 'circle' : 'rect'),
            life: 0,
          });
        }
      };

      const drawConfettiPiece = (p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'petal') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.quadraticCurveTo(p.size / 2, -p.size / 4, 0, p.size / 2);
          ctx.quadraticCurveTo(-p.size / 2, -p.size / 4, 0, -p.size / 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      };

      const animateParticles = () => {
        const w = cssWidth();
        const h = cssHeight();
        ctx.clearRect(0, 0, w, h);

        particles.forEach((p) => {
          if (p.type === 'confetti') {
            p.life++;
            p.x += p.vx + Math.sin(p.life * 0.05) * 0.3;
            p.y += p.vy;
            p.rotation += p.rotSpeed;
            if (p.life > 210) p.alpha -= 0.018;
            drawConfettiPiece(p);
          } else {
            // Faint fading trail behind each spark for a realistic streak.
            ctx.globalAlpha = Math.max(p.alpha * 0.3, 0);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(p.size * 0.5, 0.6);
            ctx.beginPath();
            ctx.moveTo(p.trailX, p.trailY);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();

            p.trailX = p.x;
            p.trailY = p.y;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += CONFIG.fireworks.gravity;
            p.vx *= 0.992;
            p.alpha -= CONFIG.fireworks.fadeSpeed;

            if (p.alpha > 0) {
              // Sparkles twinkle (flicker brightness) as they fall, giving
              // the burst a glimmering quality rather than flat dots.
              const twinkleAlpha = p.sparkle
                ? p.alpha * (0.5 + 0.5 * Math.sin(p.twinkle + p.x * 0.05))
                : p.alpha;

              ctx.globalAlpha = Math.max(twinkleAlpha, 0);
              ctx.fillStyle = p.color;
              ctx.shadowColor = p.color;
              ctx.shadowBlur = p.sparkle ? 9 : 5;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        particles = particles.filter((p) => (
          p.type === 'confetti'
            ? p.alpha > 0.02 && p.y < h + 40
            : p.alpha > 0
        ));

        if (particles.length > 0 || showActive) {
          animationFrameId = requestAnimationFrame(animateParticles);
        } else {
          cancelAnimationFrame(animationFrameId);
        }
      };

      // Dedicated all-gold, high-sparkle burst — a distinct "sparkles
      // increase" beat right as the cake glows, before the main
      // multi-color firework sequence takes over.
      const createGoldSparkleBurst = () => {
        const w = cssWidth();
        const h = cssHeight();
        [w * 0.42, w * 0.58].forEach((x, i) => {
          setTimeout(() => {
            createFirework(x, h * 0.32 + Utils.rand(-10, 10), {
              particleCount: 26,
              speedMax: 3.2,
              sparkleChance: 0.9,
              colors: ['#ffd166', '#ffb648', '#fff2c8', '#ffe8b0'],
              layered: false,
            });
          }, i * 220);
        });
        if (!showActive) {
          showActive = true;
          animateParticles();
          setTimeout(() => { showActive = false; }, 900);
        }
      };

      // One-shot floating hearts — rise once from around the cake as
      // the wish lands, then remove themselves (unlike the page's
      // infinite ambient hearts elsewhere).
      const heartsContainer = document.getElementById('cakeCelebrateHearts');
      const spawnCelebrationHearts = (count = 8) => {
        if (!heartsContainer || Utils.prefersReducedMotion()) return;
        for (let i = 0; i < count; i++) {
          const heart = document.createElement('span');
          heart.className = 'cake-celebrate-heart';
          heart.textContent = '♥';
          const left = Utils.rand(28, 72);
          const size = Utils.rand(12, 22);
          const delay = Utils.rand(0, 0.6);
          const drift = Utils.rand(-30, 30);
          heart.style.left = left + '%';
          heart.style.fontSize = size + 'px';
          heart.style.animationDelay = delay + 's';
          heart.style.setProperty('--heart-drift', drift.toFixed(1) + 'px');
          heartsContainer.appendChild(heart);
          setTimeout(() => heart.remove(), (3.4 + delay) * 1000 + 200);
        }
      };

      const markWishMade = () => {
        blowBtn.textContent = '';
        const label = document.createElement('span');
        label.textContent = '✨ Wish Made ✨ ';
        blowBtn.appendChild(label);
        blowBtn.classList.add('is-wish-made');
      };

      const launchFireworksShow = () => {
        if (showActive) return;
        showActive = true;
        animateParticles();
        playHappyBirthdaySong();

        let bursts = 0;
        const scheduleNextBurst = () => {
          const delay = CONFIG.fireworks.burstIntervalMs + Utils.rand(-140, 200);
          setTimeout(() => {
            const x = Utils.rand(0, cssWidth());
            const y = Utils.rand(20, cssHeight() * 0.55 + 20);
            createFirework(x, y, {
              particleCount: Math.round(CONFIG.fireworks.particleCount * Utils.rand(0.75, 1.3)),
              speedMax: Utils.rand(4.5, 7.5),
            });
            bursts++;

            if (bursts < CONFIG.fireworks.maxBursts) {
              scheduleNextBurst();
              return;
            }

            // Grand finale — four larger, gold-heavy bursts staggered
            // across the width, a genuine crescendo instead of just
            // tapering off after the regular sequence.
            setTimeout(() => {
              const w = cssWidth();
              const fy = cssHeight() * 0.4;
              [w * 0.16, w * 0.38, w * 0.6, w * 0.82].forEach((fx, i) => {
                setTimeout(() => {
                  createFirework(fx, fy + Utils.rand(-20, 20), {
                    particleCount: Math.round(CONFIG.fireworks.particleCount * 1.7),
                    speedMax: 8.5,
                    sparkleChance: 0.45,
                    colors: ['#ffb648', '#fff2c8', '#f76e94', '#ffffff', '#ffd166'],
                  });
                }, i * 170);
              });
            }, 380);

            // Confetti + sakura petals + gold sparkles fall in as the
            // fireworks wind down, then the wish button lights up once
            // the whole celebration has landed.
            setTimeout(() => {
              createConfettiBurst();
              showActive = false;
              markWishMade();
            }, 2000);
          }, delay);
        };
        scheduleNextBurst();
      };

      const spawnButtonRipple = (evt) => {
        const rect = blowBtn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        const x = evt && evt.clientX ? evt.clientX - rect.left : rect.width / 2;
        const y = evt && evt.clientY ? evt.clientY - rect.top : rect.height / 2;
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) * 0.4 + 'px';
        blowBtn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 650);

        // Tiny gold burst rising from the button, in section coordinates.
        const sectionRect = section.getBoundingClientRect();
        const bx = rect.left + rect.width / 2 - sectionRect.left;
        const by = rect.top - sectionRect.top;
        if (!showActive) {
          showActive = true;
          animateParticles();
          setTimeout(() => { showActive = false; }, 700);
        }
        createFirework(bx, by, {
          particleCount: 14,
          speedMax: 2.4,
          sparkleChance: 0.7,
          colors: ['#ffd166', '#ffb648', '#ffffff'],
          layered: false,
        });
      };

      const blowOutCandles = (evt) => {
        if (blowBtn.classList.contains('is-disabled')) return;
        spawnButtonRipple(evt);
        blowBtn.classList.add('is-disabled');

        playBlowSound();

        flames.forEach((flame, i) => {
          setTimeout(() => flame.classList.add('blown-out'), i * 150);
        });

        const lastFlameAt = flames.length * 150;

        if (cakeWrap) {
          setTimeout(() => {
            cakeWrap.classList.add('is-celebrating');
            // Release the balloons and gifts here too — they cascade in
            // one at a time (staggered CSS delays), slow and cinematic,
            // like a movie reveal, right as the wish "lands".
            section.classList.add('is-celebrating');
            spawnCelebrationHearts();
            createGoldSparkleBurst();
          }, lastFlameAt + 200);
        }

        // "After 1 second, launch premium fireworks" — measured from
        // the last candle going out, not from the click itself.
        setTimeout(() => launchFireworksShow(), lastFlameAt + 1000);
      };

      blowBtn.addEventListener('click', blowOutCandles);
      if (cakeWrap) cakeWrap.addEventListener('click', blowOutCandles);
    },
  };

  /* =================================================================
     INIT — single entry point, one DOMContentLoaded listener.
  ================================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    Loader.init();
    ScrollProgress.init();
    TimelineJourney.init();
    SmoothNav.init();
    RevealOnScroll.init();
    CursorGlow.init();
    TiltEffect.init();
    ParticleField.init();
    Starfield.init();
    Fireflies.init();
    HeroParallax.init();
    Gallery.init();
    Memories.init();
    Letter.init();
    ReasonsModal.init();
    SakuraNotes.init();
    Cake.init();
    FinalHeart.init();
    ForeverModal.init();
  });
})();
