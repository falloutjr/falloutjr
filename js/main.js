'use strict';

const doc = document;
const root = doc.documentElement;
const navToggle = doc.getElementById('navToggle');
const navMenu = doc.getElementById('navMenu');
const navbar = doc.querySelector('.navbar');
const navLinks = [...doc.querySelectorAll('.nav-link')];
const sections = [...doc.querySelectorAll('main section[id]')];
const reveals = [...doc.querySelectorAll('.reveal')];
const counters = [...doc.querySelectorAll('.counter')];
const progressFills = [...doc.querySelectorAll('.progress-fill')];
const faqTriggers = [...doc.querySelectorAll('.faq-trigger')];
const modeButtons = [...doc.querySelectorAll('.toggle-btn')];
const tiers = [...doc.querySelectorAll('.tier')];
const themeToggle = doc.getElementById('themeToggle');
const copyEmailButton = doc.getElementById('copyEmail');
const modal = doc.getElementById('projectModal');
const modalTitle = doc.getElementById('modalTitle');
const modalBody = doc.getElementById('modalBody');
const modalLink = doc.getElementById('modalLink');
const toastRegion = doc.getElementById('toastRegion');
const contactForm = doc.getElementById('contactForm');
const formStatus = doc.getElementById('formStatus');
const submitButton = doc.getElementById('submitButton');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const modalContent = {
  projectUnreal: {
    title: 'Unreal Engine narrative game',
    body: 'A long-form gameplay project centered on narrative pacing, systems-level mechanics, and performance-focused C++ implementation in Unreal Engine.'
  },
  projectWeb: {
    title: 'Web tools and utilities',
    body: 'A collection of responsive JavaScript interfaces and utilities that prioritize maintainable architecture, accessible interaction patterns, and practical UX.'
  },
  projectCreative: {
    title: 'Creative coding experiments',
    body: 'Fast-turn prototypes for gameplay ideas, interface mechanics, and technical experiments connecting game development and modern web workflows.'
  }
};

let activeModalTrigger = null;

function toast(message) {
  if (!toastRegion || !message) return;
  const item = doc.createElement('div');
  item.className = 'toast';
  item.textContent = message;
  toastRegion.appendChild(item);
  window.setTimeout(() => item.remove(), 3200);
}

function closeNav() {
  if (!navMenu || !navToggle) return;
  navMenu.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open menu');
}

function setTheme(theme) {
  if (!themeToggle) return;
  const isLight = theme === 'light';
  if (isLight) root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');
  themeToggle.setAttribute('aria-pressed', String(isLight));
  try {
    localStorage.setItem('themePreference', isLight ? 'light' : 'dark');
  } catch {
    // Ignore storage failures in restrictive browser modes.
  }
}

function initTheme() {
  if (!themeToggle) return;
  let stored = null;
  try {
    stored = localStorage.getItem('themePreference');
  } catch {
    stored = null;
  }
  const preferred = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(preferred);
  themeToggle.addEventListener('click', () => {
    const nextTheme = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    toast(`Theme switched to ${nextTheme}.`);
  });
}

function updateActiveLink(id) {
  navLinks.forEach((link) => {
    const active = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('active', active);
  });
}

function handleStickyNav() {
  if (!navbar) return;
  navbar.classList.toggle('scrolled', window.scrollY > 8);
}

function animateCounter(el) {
  const target = Number(el.dataset.target || 0);
  const suffix = el.dataset.suffix || '';
  if (Number.isNaN(target)) return;

  if (reduceMotion) {
    el.textContent = `${target}${suffix}`;
    return;
  }

  const duration = 1150;
  const startTime = performance.now();

  const frame = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.round(target * progress);
    el.textContent = `${value}${suffix}`;
    if (progress < 1) window.requestAnimationFrame(frame);
  };

  window.requestAnimationFrame(frame);
}

function setProgressBar(el) {
  const value = Math.min(100, Math.max(0, Number(el.dataset.progress || 0)));
  el.style.width = `${value}%`;
}

function initObservers() {
  if (!('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in-view'));
    if (sections[0]) updateActiveLink(sections[0].id);
    counters.forEach(animateCounter);
    progressFills.forEach(setProgressBar);
    return;
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in-view');
      if (entry.target.classList.contains('counter')) animateCounter(entry.target);
      if (entry.target.classList.contains('progress-fill')) setProgressBar(entry.target);
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

  [...reveals, ...counters, ...progressFills].forEach((el) => revealObserver.observe(el));

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveLink(entry.target.id);
    });
  }, { threshold: 0.55 });

  sections.forEach((section) => sectionObserver.observe(section));
}

function initNavigation() {
  if (!navToggle || !navMenu) return;

  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => closeNav());
  });

  doc.addEventListener('click', (event) => {
    if (!navMenu.classList.contains('open')) return;
    if (navMenu.contains(event.target) || navToggle.contains(event.target)) return;
    closeNav();
  });
}

function initFAQ() {
  faqTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const panel = doc.getElementById(trigger.getAttribute('aria-controls'));
      if (!panel) return;
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      panel.classList.toggle('open', !expanded);
    });
  });
}

function openModal(modalKey, trigger) {
  if (!modal || !modalTitle || !modalBody) return;
  const content = modalContent[modalKey];
  if (!content) return;

  activeModalTrigger = trigger || null;
  modalTitle.textContent = content.title;
  modalBody.textContent = content.body;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');

  const focusTarget = modal.querySelector('.modal-content');
  if (focusTarget) focusTarget.focus();
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  if (activeModalTrigger) activeModalTrigger.focus();
}

function initModal() {
  const triggers = [...doc.querySelectorAll('[data-open-modal]')];
  if (!modal || triggers.length === 0) return;

  triggers.forEach((btn) => {
    btn.addEventListener('click', () => {
      openModal(btn.getAttribute('data-open-modal'), btn);
    });
  });

  modal.addEventListener('click', (event) => {
    const closeRequested = event.target instanceof Element && event.target.matches('[data-close-modal]');
    if (closeRequested) closeModal();
  });

  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNav();
      if (modal.classList.contains('is-open')) closeModal();
    }
  });

  if (modalLink) modalLink.href = 'https://github.com/falloutjr?tab=repositories';
}

function initModeToggle() {
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode;
      if (!mode) return;

      modeButtons.forEach((btn) => {
        const isCurrent = btn === button;
        btn.classList.toggle('is-active', isCurrent);
        btn.setAttribute('aria-pressed', String(isCurrent));
      });

      tiers.forEach((tier) => {
        const modeLabel = tier.dataset[mode];
        const price = tier.querySelector('.tier-price');
        const modePrice = price?.dataset[mode];
        if (modeLabel) {
          const paragraph = tier.querySelector('p:not(.tier-price)');
          if (paragraph) paragraph.textContent = modeLabel;
        }
        if (price && modePrice) price.textContent = modePrice;
      });
    });
  });
}

function initCopyEmail() {
  if (!copyEmailButton) return;
  copyEmailButton.addEventListener('click', async () => {
    const value = copyEmailButton.dataset.copy || '';
    if (!value) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const temp = doc.createElement('input');
        temp.value = value;
        doc.body.appendChild(temp);
        temp.select();
        doc.execCommand('copy');
        temp.remove();
      }
      toast('Contact email copied to clipboard.');
    } catch {
      toast('Could not copy email automatically.');
    }
  });
}

function validateFormField(field) {
  const errorEl = doc.getElementById(`${field.id}Error`);
  if (!errorEl) return true;

  let message = '';
  const value = field.value.trim();

  if (!value) message = 'This field is required.';
  else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    message = 'Enter a valid email address.';
  } else if (field.id === 'message' && value.length < 12) {
    message = 'Please include a bit more detail (12+ characters).';
  }

  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  errorEl.textContent = message;
  return !message;
}

function buildMailtoPayload(data) {
  const subject = encodeURIComponent(`[Portfolio Inquiry] ${data.subject}`);
  const body = encodeURIComponent(
    `Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`
  );
  return `mailto:falloutjr@users.noreply.github.com?subject=${subject}&body=${body}`;
}

function initForm() {
  if (!contactForm || !formStatus || !submitButton) return;
  const fields = [...contactForm.querySelectorAll('input, textarea')];

  fields.forEach((field) => {
    field.addEventListener('blur', () => validateFormField(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateFormField(field);
    });
  });

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const isValid = fields.every((field) => validateFormField(field));
    if (!isValid) {
      formStatus.textContent = 'Please correct the highlighted fields.';
      toast('Form has validation errors.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Preparing draft...';
    formStatus.textContent = 'Preparing your email draft...';

    const data = Object.fromEntries(new FormData(contactForm).entries());

    await new Promise((resolve) => window.setTimeout(resolve, 500));

    try {
      window.location.href = buildMailtoPayload(data);
      formStatus.textContent = 'Draft opened in your email client. Thank you!';
      toast('Inquiry draft ready.');
      contactForm.reset();
      fields.forEach((field) => {
        const errorEl = doc.getElementById(`${field.id}Error`);
        if (errorEl) errorEl.textContent = '';
        field.removeAttribute('aria-invalid');
      });
    } catch {
      formStatus.textContent = 'Unable to launch email client. Use GitHub contact link instead.';
      toast('Could not open email client.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send inquiry';
    }
  });
}

function initSmoothScroll() {
  const anchors = [...doc.querySelectorAll('a[href^="#"]')];
  anchors.forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = doc.querySelector(href);
      if (!target) return;
      event.preventDefault();
      const offsetTop = target.getBoundingClientRect().top + window.scrollY - (navbar?.offsetHeight || 0) - 8;
      window.scrollTo({ top: offsetTop, behavior: reduceMotion ? 'auto' : 'smooth' });
      if (window.location.hash !== href) {
        history.pushState(null, '', href);
      }
    });
  });
}

function setYear() {
  const year = doc.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
}

window.addEventListener('scroll', handleStickyNav, { passive: true });

handleStickyNav();
setYear();
initTheme();
initNavigation();
initObservers();
initFAQ();
initModal();
initModeToggle();
initCopyEmail();
initForm();
initSmoothScroll();
