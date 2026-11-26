/**
 * Decorative behaviour for the DuckOps sample page.
 *
 * Nothing here changes what assistive technology reads: every animated element is either
 * aria-hidden or a CSS-only effect. When the user asks for reduced motion, only the parts
 * that are not motion run (the badge preview), and nothing moves or changes on its own.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motion = () => !reducedMotion.matches;

const SPEECH = ['Go on…', 'Mm-hm.', 'Quack?', 'And then?', 'Interesting…', 'Have you tried logging it?', 'I see.', 'Quack.'];

const PAUSE_KEY = 'duckops:animations-paused';
const isPaused = () => document.documentElement.classList.contains('paused');

export function setupEffects(): void {
  setupPauseToggle();
  setupBadgePreview();
  if (!motion()) return;

  document.documentElement.classList.add('motion');
  setupReveal();
  setupScrollChrome();
  setupCountUp();
  setupSpeech();
  setupTilt();
  document.addEventListener('registration:success', celebrate);
}

/**
 * "Pause animations" toggle (WCAG 2.2.2 Pause, Stop, Hide). The choice is remembered.
 * It is always present so the page and its tab order are the same with or without motion.
 */
function setupPauseToggle(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-testid="pause-animations"]');
  if (!toggle) return;

  const apply = (paused: boolean) => {
    document.documentElement.classList.toggle('paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
  };

  apply(readPaused());
  toggle.addEventListener('click', () => {
    const paused = !isPaused();
    apply(paused);
    try {
      localStorage.setItem(PAUSE_KEY, String(paused));
    } catch {
      // storage can be unavailable (private mode); the toggle still works for this visit
    }
  });
}

function readPaused(): boolean {
  try {
    return localStorage.getItem(PAUSE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Fades sections in as they enter the viewport. */
function setupReveal(): void {
  const items = document.querySelectorAll<HTMLElement>('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  items.forEach((item) => observer.observe(item));
}

/** Scroll progress bar and header border. */
function setupScrollChrome(): void {
  const header = document.querySelector<HTMLElement>('.site-header');
  const bar = document.querySelector<HTMLElement>('.scroll-progress');
  let queued = false;

  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    bar?.style.setProperty('--progress', progress.toFixed(4));
    header?.classList.toggle('is-scrolled', window.scrollY > 8);
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

/** Counts the hero stats up from zero. The real values are in screen-reader-only text. */
function setupCountUp(): void {
  const format = new Intl.NumberFormat('en-GB');
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix ?? '';
    if (!target) return;
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = `${format.format(Math.round(target * eased))}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** The duck's speech bubble cycles through supportive noises. */
function setupSpeech(): void {
  const bubble = document.querySelector<HTMLElement>('[data-speech]');
  const visual = document.querySelector<HTMLElement>('.hero-visual');
  if (!bubble || !visual) return;

  let index = 0;
  const say = (text: string) => {
    bubble.textContent = text;
    bubble.classList.remove('is-changing');
    void bubble.offsetWidth; // restart the animation
    bubble.classList.add('is-changing');
  };

  // Auto-updating content counts for WCAG 2.2.2 too, so the bubble stops while paused.
  window.setInterval(() => {
    if (document.hidden || isPaused()) return;
    index = (index + 1) % SPEECH.length;
    say(SPEECH[index]);
  }, 2600);

  visual.addEventListener('pointerenter', () => say('Quack!'));
}

/** Feature cards tilt slightly towards the pointer. */
function setupTilt(): void {
  document.querySelectorAll<HTMLElement>('.card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--tilt-x', `${(-y * 8).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(x * 10).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  });
}

/** Keeps the duck ID badge in sync with the form. */
function setupBadgePreview(): void {
  const form = document.querySelector<HTMLFormElement>('[data-testid="register-form"]');
  const badge = document.querySelector<HTMLElement>('[data-badge]');
  if (!form || !badge) return;

  const nameOut = badge.querySelector<HTMLElement>('[data-badge-name]')!;
  const planOut = badge.querySelector<HTMLElement>('[data-badge-plan]')!;
  const serialOut = badge.querySelector<HTMLElement>('[data-badge-serial]')!;

  const update = () => {
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
    const plan = form.querySelector<HTMLInputElement>('input[name="plan"]:checked');
    nameOut.textContent = name || 'Your name';
    serialOut.textContent = `RD-${serial(name)}`;

    const value = plan?.value ?? 'junior';
    if (badge.dataset.plan !== value) {
      badge.dataset.plan = value;
      planOut.textContent = plan?.dataset.label ?? 'Junior Duck';
      if (motion()) {
        badge.classList.remove('is-bumped');
        void badge.offsetWidth;
        badge.classList.add('is-bumped');
      }
    }
  };

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

function serial(name: string): string {
  let hash = 7;
  for (const char of name.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return String(hash).padStart(4, '0');
}

/** A small burst of ducks from the submit button. */
function celebrate(): void {
  const origin = document.querySelector('[data-testid="submit"]')?.getBoundingClientRect();
  if (!origin) return;
  const x = origin.left + origin.width / 2;
  const y = origin.top + origin.height / 2;

  for (let i = 0; i < 16; i++) {
    const duck = document.createElement('span');
    duck.className = 'duck-burst';
    duck.setAttribute('aria-hidden', 'true');
    duck.textContent = i % 4 === 0 ? '✨' : '🦆';
    const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
    const distance = 120 + Math.random() * 140;
    duck.style.left = `${x}px`;
    duck.style.top = `${y}px`;
    duck.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    duck.style.setProperty('--dy', `${Math.sin(angle) * distance - 80}px`);
    duck.style.setProperty('--rot', `${Math.round(Math.random() * 360 - 180)}deg`);
    duck.style.setProperty('--size', `${22 + Math.round(Math.random() * 18)}px`);
    document.body.append(duck);
    duck.addEventListener('animationend', () => duck.remove());
  }
}
