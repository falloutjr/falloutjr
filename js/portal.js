import { icon, escapeHtml, api, toast, navigate } from './shared.js';

const authPaths = new Set(['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/unauthorized']);
const workspacePaths = new Set(['/dashboard', '/profile', '/settings', '/notifications', '/admin', '/admin/users', '/admin/permissions', '/admin/analytics', '/admin/content', '/admin/settings', '/admin/logs']);
const titles = { '/dashboard': 'Your workspace', '/profile': 'Your profile', '/settings': 'Account settings', '/notifications': 'Notifications', '/admin': 'Overview', '/admin/users': 'User management', '/admin/permissions': 'Roles & permissions', '/admin/analytics': 'Analytics', '/admin/content': 'Content studio', '/admin/settings': 'System settings', '/admin/logs': 'Activity log' };
const descriptions = { '/dashboard': 'A clear view of your account, updates, and what comes next.', '/profile': 'Make this space your own. Manage the details people see.', '/settings': 'Your account. Your preferences. Your control.', '/notifications': 'Stay connected to what’s happening in your workspace.', '/admin': 'Everything that matters, in one place.', '/admin/users': 'Manage your community and keep access in the right hands.', '/admin/permissions': 'Clear responsibilities. Intentional access.', '/admin/analytics': 'Understand how your workspace is being used.', '/admin/content': 'Shape the stories and updates in your workspace.', '/admin/settings': 'Configure the essentials behind your workspace.', '/admin/logs': 'A transparent record of important workspace events.' };
const e = value => escapeHtml(String(value ?? ''));
const date = value => value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(typeof value === 'number' && value < 100000000000 ? value * 1000 : value)) : '—';
const count = value => new Intl.NumberFormat('en').format(Number(value) || 0);
const initials = name => String(name || 'You').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
const badge = (label, variant = 'neutral') => `<span class="portal-badge ${variant}">${e(label)}</span>`;
const empty = (title, message, symbol = 'layers') => `<div class="portal-empty">${icon(symbol, 30)}<h3>${e(title)}</h3><p>${e(message)}</p></div>`;
const loading = () => `<div class="portal-loading" role="status"><span class="portal-skeleton"></span><span class="portal-skeleton"></span><span class="portal-skeleton"></span><span class="sr-only">Loading workspace</span></div>`;

export function isPortalPath(path) {
  const pathname = path.split('?')[0].replace(/\/$/, '') || '/';
  return authPaths.has(pathname) || workspacePaths.has(pathname);
}

function field(name, label, options = {}) {
  const { type = 'text', required = true, autocomplete = '', placeholder = '', value = '', minlength, maxlength, hint = '', textarea = false } = options;
  const attrs = `id="${e(name)}" name="${e(name)}" ${required ? 'required' : ''} ${autocomplete ? `autocomplete="${e(autocomplete)}"` : ''} ${minlength ? `minlength="${minlength}"` : ''} ${maxlength ? `maxlength="${maxlength}"` : ''} placeholder="${e(placeholder)}" aria-describedby="${e(name)}-hint ${e(name)}-error"`;
  return `<div class="field"><label for="${e(name)}">${e(label)}${required ? '<span aria-hidden="true"> *</span>' : ''}</label><div class="input-wrap">${textarea ? `<textarea ${attrs} rows="5">${e(value)}</textarea>` : `<input ${attrs} type="${type}" value="${e(value)}">`}${type === 'password' ? `<button type="button" class="password-toggle" data-toggle-password="${e(name)}" aria-label="Show password" aria-pressed="false">${icon('eye', 18)}</button>` : ''}</div><span id="${e(name)}-hint" class="field-hint">${e(hint)}</span><span id="${e(name)}-error" class="field-error" aria-live="polite"></span></div>`;
}

function authPage(path) {
  const config = {
    '/login': ['WELCOME BACK', 'Good to have you back.', 'Sign in to your FalloutJr workspace.'],
    '/register': ['A NEW BEGINNING', 'Make room for possibility.', 'Create your account and step into the workspace.'],
    '/forgot-password': ['LET’S GET YOU BACK IN', 'Forgot your password?', 'It happens. We’ll send you a secure link to reset it.'],
    '/reset-password': ['A FRESH START', 'Set a new password.', 'Choose a strong password to secure your account.'],
    '/verify-email': ['ONE MORE THING', 'Verify your email.', 'Confirm your email address to complete your account.'],
    '/unauthorized': ['ACCESS RESTRICTED', 'This space is protected.', 'Your account doesn’t have permission to view this page.']
  }[path];
  let form = '';
  if (path === '/login') form = `<form id="auth-form" novalidate>${field('email', 'Email address', { type: 'email', autocomplete: 'email', placeholder: 'you@example.com' })}${field('password', 'Password', { type: 'password', autocomplete: 'current-password', placeholder: 'Enter your password', minlength: 1 })}<div class="form-actions"><span class="field-hint">Secure, private access</span><a data-link href="/forgot-password">Forgot password?</a></div><div class="form-error" role="alert" hidden></div><button class="btn btn-primary" type="submit">Sign in ${icon('arrow-right', 18)}</button></form><p class="auth-foot">New around here? <a data-link href="/register">Create an account</a></p>`;
  if (path === '/register') form = `<form id="auth-form" novalidate>${field('name', 'Full name', { autocomplete: 'name', placeholder: 'Your name', minlength: 2, maxlength: 100 })}${field('email', 'Email address', { type: 'email', autocomplete: 'email', placeholder: 'you@example.com' })}${field('password', 'Password', { type: 'password', autocomplete: 'new-password', placeholder: 'Create a strong password', minlength: 12, maxlength: 128, hint: 'At least 12 characters. A unique passphrase works well.' })}<p class="field-hint">Your account starts with User access. Only an administrator can assign management roles.</p><div class="form-error" role="alert" hidden></div><button class="btn btn-primary" type="submit">Create account ${icon('arrow-right', 18)}</button></form><p class="auth-foot">Already have an account? <a data-link href="/login">Sign in</a></p>`;
  if (path === '/forgot-password') form = `<form id="auth-form" novalidate>${field('email', 'Email address', { type: 'email', autocomplete: 'email', placeholder: 'you@example.com' })}<div class="form-error" role="alert" hidden></div><div class="form-success" role="status" hidden></div><button class="btn btn-primary" type="submit">Send reset link ${icon('arrow-right', 18)}</button></form><p class="auth-foot"><a data-link href="/login">${icon('arrow-right', 14)} Back to sign in</a></p>`;
  if (path === '/reset-password') form = `<form id="auth-form" novalidate>${field('password', 'New password', { type: 'password', autocomplete: 'new-password', minlength: 12, maxlength: 128, hint: 'Use a unique password or passphrase with at least 12 characters.' })}${field('confirmPassword', 'Confirm password', { type: 'password', autocomplete: 'new-password', minlength: 12, maxlength: 128 })}<div class="form-error" role="alert" hidden></div><div class="form-success" role="status" hidden></div><button class="btn btn-primary" type="submit">Update password ${icon('arrow-right', 18)}</button></form><p class="auth-foot"><a data-link href="/forgot-password">Need a new reset link?</a></p>`;
  if (path === '/verify-email') form = `<div id="verification-status" class="portal-auth-status" role="status"><div class="portal-auth-icon">${icon('mail', 30)}</div><p>Use the secure verification link in your email. If you just registered, check your inbox and spam folder.</p></div><div class="form-error" role="alert" hidden></div><button class="btn btn-primary" id="resend-verification" type="button">Send another verification email ${icon('arrow-right', 18)}</button><p class="auth-foot"><a data-link href="/dashboard">Continue to workspace</a></p>`;
  if (path === '/unauthorized') form = `<div class="portal-auth-status"><div class="portal-auth-icon">${icon('shield', 32)}</div><p>If you need access, contact your workspace administrator. Your current account and data are safe.</p></div><a data-link href="/dashboard" class="btn btn-primary">Back to workspace ${icon('arrow-right', 18)}</a><p class="auth-foot"><a data-link href="/">Return to the website</a></p>`;
  return `<main id="main" class="portal-auth"><section class="auth-story" aria-label="FalloutJr"><a data-link href="/" class="auth-brand"><span class="brand-mark">${icon('code', 25)}</span>falloutjr<span class="brand-period">.</span></a><div class="auth-story-copy"><span class="auth-eyebrow">BUILT WITH INTENTION</span><h2>Great ideas deserve<br>a place to become real.</h2><p>Thoughtful engineering. Immersive experiences.<br>A workspace for what comes next.</p></div><div class="auth-art" aria-hidden="true"><div class="auth-art-grid"></div><div class="auth-art-orbit"></div><div class="auth-art-core"><span>f.</span></div></div><div class="auth-story-bottom"><span>Independent spirit. Limitless possibility.</span><span>© ${new Date().getFullYear()} FalloutJr</span></div></section><section class="auth-form-wrap"><a data-link href="/" class="auth-back">${icon('arrow-right', 15)} Back to website</a><div class="auth-card"><span class="auth-eyebrow">${config[0]}</span><h1>${config[1]}</h1><p class="auth-description">${config[2]}</p>${form}</div><span class="auth-security">${icon('lock', 13)} Protected with secure, encrypted sessions</span></section></main>`;
}

function navItem(path, href, label, symbol) {
  return `<a data-link class="portal-nav-item ${path === href ? 'active' : ''}" href="${href}" ${path === href ? 'aria-current="page"' : ''}>${icon(symbol, 19)}<span>${label}</span>${path === href ? '<i aria-hidden="true"></i>' : ''}</a>`;
}

function workspace(path, user) {
  const admin = user?.role === 'admin';
  const manager = admin || user?.role === 'moderator';
  return `<div class="portal" data-route="${e(path)}"><div class="portal-mobile-overlay" data-close-sidebar></div><aside class="portal-sidebar" aria-label="Workspace navigation"><a data-link href="/" class="portal-logo"><span class="brand-mark">${icon('code', 23)}</span>falloutjr<span class="brand-period">.</span><span class="portal-logo-tag">WORKSPACE</span></a><div class="portal-nav-label">WORKSPACE</div><nav class="portal-nav">${navItem(path, '/dashboard', 'Overview', 'grid')}${navItem(path, '/profile', 'My profile', 'user')}${navItem(path, '/notifications', 'Notifications', 'bell')}${navItem(path, '/settings', 'Account settings', 'settings')}</nav>${manager ? `<div class="portal-nav-label">MANAGEMENT</div><nav class="portal-nav">${admin ? navItem(path, '/admin', 'Admin overview', 'chart') + navItem(path, '/admin/users', 'People', 'users') + navItem(path, '/admin/permissions', 'Roles & permissions', 'shield') + navItem(path, '/admin/analytics', 'Analytics', 'chart') : ''}${navItem(path, '/admin/content', 'Content studio', 'file')}${navItem(path, '/admin/logs', 'Activity log', 'activity')}${admin ? navItem(path, '/admin/settings', 'System settings', 'settings') : ''}</nav>` : ''}<div class="portal-sidebar-foot"><a data-link href="/" class="portal-quick-link">${icon('external-link', 16)} View website ${icon('arrow-up-right', 14)}</a><div class="portal-user"><span class="avatar">${e(initials(user?.name))}</span><div><strong>${e(user?.name || 'Workspace')}</strong><span>${e(user?.role || 'User')}</span></div><button type="button" data-logout class="portal-icon-button" aria-label="Sign out">${icon('logout', 18)}</button></div></div></aside><main id="main" class="portal-main"><header class="portal-topbar"><button type="button" class="portal-mobile-toggle portal-icon-button" aria-label="Open workspace menu" aria-expanded="false" aria-controls="workspace-navigation">${icon('menu', 21)}</button><span class="portal-breadcrumb">Workspace <span>/</span> <strong>${e(titles[path])}</strong></span><div class="portal-topbar-actions"><a data-link href="/notifications" class="portal-icon-button" aria-label="Notifications">${icon('bell', 19)}</a><details class="portal-profile-menu"><summary aria-label="Open profile menu"><span class="avatar">${e(initials(user?.name))}</span>${icon('chevron-down', 14)}</summary><div><strong>${e(user?.name)}</strong><span>${e(user?.email)}</span><a data-link href="/profile">My profile</a><a data-link href="/settings">Account settings</a><button data-logout type="button">Sign out</button></div></details></div></header><div class="portal-content"><div class="portal-heading"><div><span class="auth-eyebrow">${path.startsWith('/admin') ? 'CONTROL CENTER' : 'YOUR PERSONAL SPACE'}</span><h1>${e(titles[path])}${path === '/admin' ? '<span class="portal-heading-dot">.</span>' : ''}</h1><p>${e(descriptions[path])}</p></div><div class="portal-heading-actions">${badge(user?.role || 'user', 'purple')}<span class="portal-date">${date(Date.now())}</span></div></div><div id="portal-view">${loading()}</div></div><footer class="portal-footer"><span>FalloutJr Workspace</span><span>Thoughtfully built. Secure by design.</span></footer></main></div>`;
}

export function renderPortal(path, user) {
  const pathname = path.split('?')[0].replace(/\/$/, '') || '/';
  return authPaths.has(pathname) ? authPage(pathname) : workspace(pathname, user);
}

function showFieldError(form, name, message) {
  const input = form.elements.namedItem(name);
  const error = form.querySelector(`#${CSS.escape(name)}-error`);
  if (input) input.setAttribute('aria-invalid', 'true');
  if (error) error.textContent = message;
}

function clearErrors(form) {
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  const error = form.querySelector('.form-error');
  if (error) { error.hidden = true; error.textContent = ''; }
}

function validate(form) {
  clearErrors(form);
  let valid = true;
  for (const input of form.querySelectorAll('input,textarea,select')) {
    if (!input.checkValidity() || (input.required && input.type !== 'password' && !input.value.trim())) {
      let message = (input.validity.valueMissing || (input.required && input.type !== 'password' && !input.value.trim())) ? 'This field is required.' : input.validity.typeMismatch ? 'Enter a valid email address.' : input.validity.tooShort ? `Use at least ${input.minLength} characters.` : input.validationMessage;
      showFieldError(form, input.name, message);
      valid = false;
    }
  }
  if (form.elements.confirmNewPassword && form.elements.newPassword.value !== form.elements.confirmNewPassword.value) {
    showFieldError(form, 'confirmNewPassword', 'Your passwords don’t match.');
    valid = false;
  }
  if (form.elements.confirmPassword && form.elements.password.value !== form.elements.confirmPassword.value) {
    showFieldError(form, 'confirmPassword', 'Your passwords don’t match.');
    valid = false;
  }
  if (!valid) form.querySelector('[aria-invalid="true"]')?.focus();
  return valid;
}

function formError(form, error) {
  const box = form.querySelector('.form-error');
  if (box) { box.textContent = error.message || 'Something went wrong. Please try again.'; box.hidden = false; }
  if (error.fields) Object.entries(error.fields).forEach(([name, message]) => showFieldError(form, name, String(message)));
}

function wireForm(id, handler, successMessage) {
  const form = document.getElementById(id);
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validate(form)) return;
    const submit = form.querySelector('[type="submit"]');
    const original = submit.innerHTML;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = 'Please wait…';
    try {
      await handler(Object.fromEntries(new FormData(form)), form);
      if (successMessage) toast(successMessage, 'success');
    } catch (error) {
      formError(form, error);
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.innerHTML = original;
    }
  });
}

function wirePasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    if (button.dataset.toggleWired) return;
    button.dataset.toggleWired = 'true';
    button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    button.setAttribute('aria-pressed', String(show));
    });
  });
}

function initAuth(path, user) {
  wirePasswordToggles();
  wireForm('auth-form', async (data, form) => {
    if (path === '/login') {
      await api('/api/auth/login', { method: 'POST', body: { email: data.email, password: data.password } });
      const next = new URLSearchParams(location.search).get('next');
      await navigate(next && next.startsWith('/') && !next.startsWith('//') && workspacePaths.has(next.split('?')[0]) ? next : '/dashboard');
      toast('Welcome back.', 'success');
    } else if (path === '/register') {
      const result = await api('/api/auth/register', { method: 'POST', body: { name: data.name, email: data.email, password: data.password } });
      await navigate(result.emailDelivery === false ? '/verify-email?delivery=unavailable' : '/verify-email');
      toast(result.emailDelivery === false ? 'Account created. Email delivery is unavailable; ask your administrator to enable verification emails.' : 'Account created. Check your email to verify your address.', result.emailDelivery === false ? 'error' : 'success');
    } else if (path === '/forgot-password') {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email: data.email } });
      const success = form.querySelector('.form-success');
      success.hidden = false;
      success.textContent = 'If an account matches that address, a password reset link is on its way. Check your inbox and spam folder.';
      form.reset();
    } else if (path === '/reset-password') {
      const token = new URLSearchParams(location.search).get('token');
      if (!token) throw new Error('This reset link is missing its secure token. Request a new link below.');
      await api('/api/auth/reset-password', { method: 'POST', body: { token, password: data.password } });
      await navigate('/login');
      toast('Password updated. Sign in with your new password.', 'success');
    }
  });
  if (path === '/verify-email') {
    const token = new URLSearchParams(location.search).get('token');
    const status = document.getElementById('verification-status');
    if (new URLSearchParams(location.search).get('delivery') === 'unavailable') {
      status.innerHTML = `<div class="portal-auth-icon">${icon('mail', 30)}</div><p>Your account is ready, but verification email delivery is currently unavailable. Ask the workspace administrator to configure email delivery, then request a new link.</p>`;
    }
    if (token) {
      status.innerHTML = `<div class="portal-auth-icon">${icon('clock', 30)}</div><p>Verifying your email address…</p>`;
      api('/api/auth/verify-email', { method: 'POST', body: { token } }).then(() => {
        status.innerHTML = `<div class="portal-auth-icon">${icon('check', 30)}</div><h3>You’re verified.</h3><p>Your email address is confirmed. You’re ready to explore your workspace.</p>`;
        document.getElementById('resend-verification')?.remove();
        history.replaceState(null, '', '/verify-email');
      }).catch(error => {
        status.innerHTML = `<div class="portal-auth-icon">${icon('mail', 30)}</div><p>${e(error.message)}</p>`;
      });
    } else if (user?.verified) status.innerHTML = `<div class="portal-auth-icon">${icon('check', 30)}</div><h3>You’re already verified.</h3><p>Your email address is confirmed.</p>`;
    document.getElementById('resend-verification')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await api('/api/auth/resend-verification', { method: 'POST', body: {} });
        toast('If verification is needed, a fresh link has been sent.', 'success');
      } catch (error) {
        const box = document.querySelector('.form-error');
        box.hidden = false;
        box.textContent = error.status === 401 ? 'Sign in first to request a verification email.' : error.message;
      } finally { button.disabled = false; }
    });
  }
}

function metric(label, value, symbol, foot) {
  return `<article class="portal-card portal-metric"><div class="portal-metric-label"><span>${e(label)}</span><span class="metric-icon">${icon(symbol, 18)}</span></div><strong class="portal-metric-value">${count(value)}</strong><span class="portal-metric-foot">${e(foot)}</span></article>`;
}

function chart(values = [], labels = [], label = 'Workspace activity') {
  const data = values.length ? values.map(v => Math.max(0, Number(v) || 0)) : Array(7).fill(0);
  const max = Math.max(4, ...data);
  const points = data.map((v, i) => `${36 + i * (628 / Math.max(1, data.length - 1))},${172 - v / max * 136}`);
  const fill = `M36,172 L${points.join(' L')} L664,172 Z`;
  const rows = [0, 1, 2, 3, 4].map(i => `<line x1="36" y1="${36 + i * 34}" x2="664" y2="${36 + i * 34}" stroke="currentColor" stroke-opacity=".08"/><text x="7" y="${40 + i * 34}" fill="currentColor" opacity=".45" font-size="10">${Math.round(max * (1 - i / 4))}</text>`).join('');
  return `<div class="portal-chart"><svg viewBox="0 0 700 205" role="img" aria-label="${e(label)}: ${e(data.join(', '))}"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a590ff" stop-opacity=".25"/><stop offset="1" stop-color="#a590ff" stop-opacity="0"/></linearGradient></defs>${rows}<path d="${fill}" fill="url(#chart-fill)"/><polyline points="${points.join(' ')}" fill="none" stroke="#a590ff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${data.map((v, i) => `<circle cx="${36 + i * (628 / Math.max(1, data.length - 1))}" cy="${172 - v / max * 136}" r="3" fill="#c4b5ff"/>`).join('')}${data.map((v, i) => `<text x="${36 + i * (628 / Math.max(1, data.length - 1))}" y="195" fill="currentColor" opacity=".5" font-size="10" text-anchor="middle">${e(labels[i] || `Day ${i + 1}`)}</text>`).join('')}</svg></div>`;
}

function activityList(items = []) {
  if (!items.length) return empty('A fresh start', 'Important account and management events will appear here.', 'activity');
  return `<ul class="portal-list">${items.slice(0, 6).map(item => `<li class="portal-list-item"><span class="portal-list-icon">${icon('activity', 16)}</span><div class="portal-list-body"><strong>${e(String(item.action || item.type || item.title || 'Activity').replace(/[._]/g, ' '))}</strong><span>${e(item.actorName || item.actorEmail || item.actor || item.email || item.details || 'Workspace event')}</span></div><time>${date(item.createdAt || item.created_at || item.timestamp)}</time></li>`).join('')}</ul>`;
}

async function loadDashboard(user) {
  const result = await api('/api/notifications');
  const notifications = result.notifications || result.items || (Array.isArray(result) ? result : []);
  return `<div class="portal-notice"><span class="portal-list-icon">${icon('code', 22)}</span><div><h2>Welcome ${e(user.name.split(' ')[0])}. Let’s build something.</h2><p>Your personal space for account details, updates, and new possibilities.</p></div><a data-link href="/services" class="btn btn-secondary">Explore the work ${icon('arrow-up-right', 16)}</a></div>${!user.verified ? `<div class="portal-notice warning">${icon('mail', 19)}<p>Verify your email address to keep your account up to date.</p><a data-link href="/verify-email">Verify email ${icon('arrow-right', 14)}</a></div>` : ''}<div class="portal-grid portal-grid-3">${metric('Account status', user.status === 'active' ? 1 : 0, 'shield', user.status === 'active' ? 'Your account is active' : `Status: ${user.status}`)}${metric('Unread updates', notifications.filter(n => !(n.read || n.readAt || n.read_at)).length, 'bell', 'You’re always in the loop')}${metric('Your workspace', 1, 'layers', `Member since ${date(user.createdAt)}`)}</div><div class="portal-grid portal-grid-2"><article class="portal-card"><div class="portal-card-head"><h2>Your account at a glance</h2>${badge(user.role, 'purple')}</div><div class="portal-account-summary"><span class="avatar large">${e(initials(user.name))}</span><h3>${e(user.name)}</h3><p>${e(user.email)}</p>${badge(user.verified ? 'Email verified' : 'Verification pending', user.verified ? 'success' : 'warning')}</div><a data-link href="/profile" class="portal-quick-link">Manage your profile ${icon('arrow-right', 17)}</a></article><article class="portal-card"><div class="portal-card-head"><h2>Make yourself at home</h2><span class="metric-icon">${icon('layers', 19)}</span></div><div class="portal-action-list"><a data-link href="/settings">${icon('settings', 21)}<div><strong>Fine-tune your account</strong><span>Preferences, privacy, and security</span></div>${icon('arrow-up-right', 17)}</a><a data-link href="/notifications">${icon('bell', 21)}<div><strong>Stay in the loop</strong><span>Your latest workspace updates</span></div>${icon('arrow-up-right', 17)}</a><a data-link href="/contact">${icon('mail', 21)}<div><strong>Start a conversation</strong><span>Ideas, questions, and collaborations</span></div>${icon('arrow-up-right', 17)}</a></div></article></div><article class="portal-card"><div class="portal-card-head"><h2>Latest updates</h2><a data-link href="/notifications">View all ${icon('arrow-right', 15)}</a></div>${notificationList(notifications.slice(0, 3), false)}</article>`;
}

async function loadAdmin() {
  const data = await api('/api/admin/overview');
  const stats = data.stats || {};
  const activity = (data.chart || data.activity || data.dailyActivity || []).slice(-7);
  return `<div class="portal-grid portal-grid-4">${metric('Total users', stats.users ?? stats.userCount, 'users', 'Registered workspace members')}${metric('Active sessions', stats.activeSessions, 'activity', 'Secure sessions right now')}${metric('Content updates', stats.content, 'file', 'Workspace drafts and publications')}${metric('Contact requests', stats.contacts, 'mail', 'Conversations started')}</div><div class="portal-grid portal-split"><article class="portal-card"><div class="portal-card-head"><div><h2>Workspace activity</h2><p>Successful logins over the last 7 days</p></div>${badge('Last 7 days', 'neutral')}</div>${chart(activity.map(d => d.logins || d.count || d.events || 0), activity.map(d => d.date ? new Date(d.date).toLocaleDateString('en', { weekday: 'short' }) : d.label || ''), 'Successful logins per day')}<div class="portal-chart-legend"><i></i> Successful logins <span>Live workspace data</span></div></article><article class="portal-card"><div class="portal-card-head"><h2>Quick actions</h2>${icon('arrow-up-right', 18)}</div><div class="portal-action-list"><a data-link href="/admin/users">${icon('users', 22)}<div><strong>Manage people</strong><span>Roles and account access</span></div>${icon('arrow-right', 17)}</a><a data-link href="/admin/content">${icon('file', 22)}<div><strong>Publish an update</strong><span>Create workspace content</span></div>${icon('arrow-right', 17)}</a><a data-link href="/admin/settings">${icon('settings', 22)}<div><strong>System settings</strong><span>Keep everything running</span></div>${icon('arrow-right', 17)}</a></div></article></div><article class="portal-card"><div class="portal-card-head"><div><h2>Recent activity</h2><p>Your workspace, in real time</p></div><a data-link href="/admin/logs">View activity log ${icon('arrow-right', 15)}</a></div>${activityList(data.recentActivity || data.recentLogs || [])}</article>`;
}

async function loadProfile(user) {
  const data = await api('/api/profile');
  const profile = data.user || data.profile || data;
  return `<div class="portal-grid portal-split"><article class="portal-card"><div class="portal-card-head"><div><h2>Personal information</h2><p>A few details that make your workspace yours.</p></div>${icon('user', 20)}</div><form id="profile-form" class="portal-form" novalidate>${field('name', 'Full name', { value: profile.name || user.name, autocomplete: 'name', minlength: 2, maxlength: 100 })}<div class="field"><label for="profile-email">Email address</label><input id="profile-email" type="email" value="${e(profile.email || user.email)}" readonly aria-describedby="email-readonly-hint"><span class="field-hint" id="email-readonly-hint">Your email identifies your account and cannot be changed here.</span></div><div class="form-error" role="alert" hidden></div><button type="submit" class="btn btn-primary">Save changes ${icon('check', 16)}</button></form></article><article class="portal-card"><div class="portal-account-summary"><span class="avatar large">${e(initials(profile.name || user.name))}</span><h2>${e(profile.name || user.name)}</h2><p>${e(profile.email || user.email)}</p>${badge(user.role, 'purple')}</div><div class="portal-details"><div><span>Account status</span>${badge(user.status, user.status === 'active' ? 'success' : 'warning')}</div><div><span>Email</span>${badge(user.verified ? 'Verified' : 'Pending', user.verified ? 'success' : 'warning')}</div><div><span>Member since</span><strong>${date(user.createdAt)}</strong></div></div></article></div>`;
}

async function loadSettings() {
  const data = await api('/api/settings');
  const settings = data.settings || data;
  return `<article class="portal-card"><div class="portal-card-head"><div><h2>Workspace preferences</h2><p>Choose how you hear from the workspace.</p></div>${icon('settings', 20)}</div><form id="settings-form" class="portal-form" novalidate><label class="portal-settings-row" for="emailNotifications"><span class="portal-setting-copy"><strong>Email notifications</strong><span>Receive account updates and workspace notifications by email.</span></span><input id="emailNotifications" class="portal-toggle" type="checkbox" name="emailNotifications" ${settings.emailNotifications !== false ? 'checked' : ''}></label><label class="portal-settings-row" for="productUpdates"><span class="portal-setting-copy"><strong>Project news</strong><span>Occasional notes about new projects and releases.</span></span><input id="productUpdates" class="portal-toggle" type="checkbox" name="productUpdates" ${settings.productUpdates ? 'checked' : ''}></label><div class="form-error" role="alert" hidden></div><button type="submit" class="btn btn-primary">Save preferences ${icon('check', 16)}</button></form></article><article class="portal-card"><div class="portal-card-head"><div><h2>Password & security</h2><p>Keep your account protected with a strong, unique password.</p></div>${icon('shield', 20)}</div><form id="password-change-form" class="portal-form" novalidate>${field('currentPassword', 'Current password', { type: 'password', autocomplete: 'current-password', minlength: 1 })}${field('newPassword', 'New password', { type: 'password', autocomplete: 'new-password', minlength: 12, maxlength: 128, hint: 'Use at least 12 characters. Updating your password signs out your other sessions.' })}${field('confirmNewPassword', 'Confirm new password', { type: 'password', autocomplete: 'new-password', minlength: 12, maxlength: 128 })}<div class="form-error" role="alert" hidden></div><button class="btn btn-primary" type="submit">Update password ${icon('lock', 16)}</button></form><div class="portal-settings-row"><div class="portal-setting-copy"><strong>Can’t remember your password?</strong><span>Request a secure reset link at your registered email address.</span></div><button class="btn btn-secondary" id="change-password">Send reset link ${icon('arrow-up-right', 16)}</button></div></article><article class="portal-card portal-danger-zone"><div class="portal-settings-row"><div class="portal-setting-copy"><h2>End your session</h2><span>Sign out safely on this device. You can sign in again at any time.</span></div><button class="btn btn-secondary" data-logout>${icon('logout', 16)} Sign out</button></div></article>`;
}

function notificationList(items, interactive = true) {
  if (!items.length) return empty('You’re all caught up', 'New account and workspace updates will appear here.', 'bell');
  return `<ul class="portal-list">${items.map(item => `<li class="portal-list-item ${!(item.read || item.readAt || item.read_at) ? 'unread' : ''}"><span class="portal-list-icon">${icon('bell', 18)}</span><div class="portal-list-body"><strong>${e(item.title || 'Workspace update')}</strong><p>${e(item.message || item.body || '')}</p><time>${date(item.createdAt || item.created_at)}</time></div>${interactive && !(item.read || item.readAt || item.read_at) ? `<button type="button" class="portal-icon-button" data-read="${e(item.id)}" aria-label="Mark ${e(item.title || 'notification')} as read">${icon('check', 18)}</button>` : ''}</li>`).join('')}</ul>`;
}

async function loadNotifications() {
  const data = await api('/api/notifications');
  const items = data.notifications || data.items || (Array.isArray(data) ? data : []);
  return `<article class="portal-card"><div class="portal-card-head"><h2>Your updates</h2>${badge(`${items.filter(n => !(n.read || n.readAt || n.read_at)).length} unread`, 'purple')}</div>${notificationList(items)}</article>`;
}

let usersState = { page: 1, search: '', role: '' };
async function loadUsers() {
  const query = new URLSearchParams({ page: String(usersState.page), search: usersState.search, role: usersState.role });
  const data = await api(`/api/admin/users?${query}`);
  const users = data.users || data.items || [];
  const pagination = data.pagination || data;
  const page = pagination.page || usersState.page;
  const pages = pagination.pages || pagination.totalPages || Math.max(1, Math.ceil((pagination.total || users.length) / (pagination.pageSize || 10)));
  return `<article class="portal-card"><div class="portal-card-head"><div><h2>Workspace members</h2><p>${count(pagination.total ?? users.length)} members across your workspace</p></div>${badge('Access control', 'purple')}</div><form class="portal-filters" id="users-filter"><div class="input-wrap">${icon('search', 17)}<label class="sr-only" for="user-search">Search users</label><input id="user-search" name="search" type="search" placeholder="Search name or email…" maxlength="100" value="${e(usersState.search)}"></div><label class="sr-only" for="role-filter">Filter by role</label><select id="role-filter" name="role"><option value="">All roles</option>${['user', 'moderator', 'admin'].map(role => `<option value="${role}" ${usersState.role === role ? 'selected' : ''}>${role[0].toUpperCase() + role.slice(1)}</option>`).join('')}</select><button type="submit" class="btn btn-secondary">Search ${icon('arrow-right', 15)}</button></form><div class="portal-table-wrap"><table class="portal-table"><thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Joined</th><th scope="col">Update access</th></tr></thead><tbody>${users.map(user => `<tr><td><div class="portal-table-user"><span class="avatar">${e(initials(user.name))}</span><div><strong>${e(user.name)}</strong><span>${e(user.email)}</span></div></div></td><td>${badge(user.role, user.role === 'admin' ? 'purple' : 'neutral')}</td><td>${badge(user.status, user.status === 'active' ? 'success' : 'danger')}</td><td>${date(user.createdAt || user.created_at)}</td><td><form class="portal-inline-form" data-user-id="${e(user.id)}"><label class="sr-only" for="role-${e(user.id)}">Role for ${e(user.name)}</label><select id="role-${e(user.id)}" name="role">${['user', 'moderator', 'admin'].map(role => `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role}</option>`).join('')}</select><label class="sr-only" for="status-${e(user.id)}">Status for ${e(user.name)}</label><select id="status-${e(user.id)}" name="status">${['active', 'suspended'].map(status => `<option value="${status}" ${user.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select><button type="submit" class="portal-icon-button" aria-label="Save access for ${e(user.name)}">${icon('check', 17)}</button><span class="sr-only" role="status"></span></form></td></tr>`).join('') || '<tr><td colspan="5">No users match your search. Try another name or email.</td></tr>'}</tbody></table></div><div class="portal-pagination"><span>Page ${page} of ${pages}</span><div><button type="button" class="btn btn-secondary" data-page="${Math.max(1, page - 1)}" ${page <= 1 ? 'disabled' : ''}>Previous</button><button type="button" class="btn btn-secondary" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Next ${icon('arrow-right', 15)}</button></div></div></article>`;
}

async function loadPermissions() {
  const data = await api('/api/admin/permissions');
  const definitions = data.roles || data.permissions || data;
  const roles = [{ name: 'User', key: 'user', text: 'A personal space to stay connected.', items: ['Personal dashboard', 'Own profile and account settings', 'Own notifications'] }, { name: 'Moderator', key: 'moderator', text: 'Focused tools to support the workspace.', items: ['All User features', 'Manage workspace content', 'View permitted activity logs'] }, { name: 'Admin', key: 'admin', text: 'Complete oversight, with accountability.', items: ['All Moderator features', 'Manage users, roles, and account status', 'Analytics and system configuration', 'Complete activity and audit history'] }];
  return `<div class="portal-notice">${icon('shield', 23)}<p>Permissions are enforced by the server on every protected request. Change a member’s role in <a data-link href="/admin/users">User management</a>.</p></div><div class="portal-grid portal-grid-3">${roles.map(role => `<article class="portal-card portal-role-card"><span class="portal-list-icon">${icon(role.key === 'admin' ? 'shield' : role.key === 'moderator' ? 'layers' : 'user', 25)}</span><h2>${role.name}</h2><p>${role.text}</p><ul>${role.items.map(item => `<li>${icon('check', 15)}${e(item)}</li>`).join('')}</ul></article>`).join('')}</div><article class="portal-card"><div class="portal-card-head"><div><h2>Server permission definitions</h2><p>The active permission policy returned by your server.</p></div>${badge('Enforced', 'success')}</div><pre class="portal-code">${e(JSON.stringify(definitions, null, 2))}</pre><a data-link href="/admin/users" class="btn btn-primary">Manage member roles ${icon('arrow-right', 16)}</a></article>`;
}

async function loadAnalytics() {
  const data = await api('/api/admin/analytics');
  const daily = (data.chart || data.dailyActivity || data.activity || data.daily || []).slice(-7);
  const roles = data.roleCounts || data.roles || data.usersByRole || [];
  const roleEntries = Array.isArray(roles) ? roles.map(r => [r.role, r.count]) : Object.entries(roles);
  const total = roleEntries.reduce((sum, [, val]) => sum + Number(val), 0);
  return `<div class="portal-grid portal-grid-3">${metric('Total members', data.totals?.users ?? data.totalUsers ?? total, 'users', 'Current registered accounts')}${metric('Active sessions', data.totals?.sessions || data.activeSessions || data.stats?.activeSessions, 'activity', 'Authenticated sessions now')}${metric('Contact requests', data.totals?.contacts || 0, 'mail', 'Conversations started')}</div><article class="portal-card"><div class="portal-card-head"><div><h2>Workspace sign-ins</h2><p>Successful sign-ins recorded by the server.</p></div>${badge('Last 7 days', 'neutral')}</div>${chart(daily.map(d => d.logins || d.count || 0), daily.map(d => d.date ? new Date(d.date).toLocaleDateString('en', { weekday: 'short' }) : d.label), 'Daily successful sign-ins')}</article><article class="portal-card"><div class="portal-card-head"><h2>Community by role</h2>${icon('users', 20)}</div>${roleEntries.length ? `<div class="portal-role-breakdown">${roleEntries.map(([role, number]) => `<div><div><strong>${e(role)}</strong><span>${count(number)} members</span></div><div class="portal-progress"><i style="width:${total ? Number(number) / total * 100 : 0}%"></i></div></div>`).join('')}</div>` : empty('No members yet', 'Role distribution appears when members join.', 'users')}</article>`;
}

async function loadContent() {
  const data = await api('/api/admin/content');
  const items = data.content || data.items || (Array.isArray(data) ? data : []);
  return `<div class="portal-grid portal-split"><article class="portal-card"><div class="portal-card-head"><div><h2>Create an update</h2><p>Publish a clear, thoughtful workspace announcement.</p></div>${icon('file', 20)}</div><form id="content-form" class="portal-form" novalidate>${field('title', 'Title', { maxlength: 200, placeholder: 'What’s new?' })}${field('body', 'Content', { textarea: true, maxlength: 10000, placeholder: 'Share a project update, a milestone, or a useful note…' })}<div class="field"><label for="content-status">Status</label><select id="content-status" name="status"><option value="draft">Draft</option><option value="published">Published</option></select></div><div class="form-error" role="alert" hidden></div><button type="submit" class="btn btn-primary">Create update ${icon('plus', 16)}</button></form></article><article class="portal-card"><div class="portal-card-head"><div><h2>Your content</h2><p>${items.length} workspace ${items.length === 1 ? 'update' : 'updates'}</p></div>${badge('Editorial', 'purple')}</div>${items.length ? `<ul class="portal-list">${items.map(item => `<li class="portal-list-item"><span class="portal-list-icon">${icon('file', 18)}</span><div class="portal-list-body"><strong>${e(item.title)}</strong><p>${e(String(item.body || item.content || '').slice(0, 180))}</p><span>${date(item.createdAt || item.created_at)} · ${e(item.status || 'draft')}</span></div><div class="portal-content-actions"><button class="portal-icon-button" type="button" data-content-toggle="${e(item.id)}" data-current-status="${e(item.status)}" aria-label="${item.status === 'published' ? 'Unpublish' : 'Publish'} ${e(item.title)}">${icon(item.status === 'published' ? 'eye' : 'check', 17)}</button><button class="portal-icon-button" type="button" data-content-delete="${e(item.id)}" aria-label="Delete ${e(item.title)}">${icon('x', 17)}</button></div></li>`).join('')}</ul>` : empty('Your next story starts here', 'Create your first update. Drafts stay private until you publish.', 'file')}</article></div>`;
}

async function loadSystemSettings() {
  const data = await api('/api/admin/settings');
  const settings = data.settings || data;
  return `<article class="portal-card"><div class="portal-card-head"><div><h2>Workspace configuration</h2><p>Changes apply to the server immediately and are recorded in the audit log.</p></div>${icon('settings', 20)}</div><form id="system-settings-form" class="portal-form" novalidate>${field('siteName', 'Workspace name', { value: settings.siteName || 'FalloutJr', maxlength: 100 })}<label class="portal-settings-row" for="registrationOpen"><span class="portal-setting-copy"><strong>Allow new registrations</strong><span>Let visitors create a standard User account.</span></span><input id="registrationOpen" class="portal-toggle" type="checkbox" name="registrationOpen" ${settings.registrationOpen !== false ? 'checked' : ''}></label><label class="portal-settings-row" for="maintenance"><span class="portal-setting-copy"><strong>Maintenance mode</strong><span>Temporarily restrict new registrations and public contact submissions while you make updates.</span></span><input id="maintenance" class="portal-toggle" type="checkbox" name="maintenance" ${settings.maintenance ? 'checked' : ''}></label><div class="form-error" role="alert" hidden></div><button type="submit" class="btn btn-primary">Save system settings ${icon('check', 16)}</button></form></article><div class="portal-notice">${icon('lock', 21)}<p>Credentials, email delivery settings, and deployment secrets are configured in the server environment. They are never displayed in the dashboard.</p></div>`;
}

let logsPage = 1;
async function loadLogs() {
  const data = await api(`/api/admin/logs?page=${logsPage}`);
  const logs = data.logs || data.items || (Array.isArray(data) ? data : []);
  const pagination = data.pagination || data;
  const pages = pagination.pages || pagination.totalPages || Math.max(1, Math.ceil((pagination.total || logs.length) / (pagination.pageSize || 20)));
  return `<article class="portal-card"><div class="portal-card-head"><div><h2>Audit trail</h2><p>Server-recorded events for accountability and oversight.</p></div>${badge('Read only', 'neutral')}</div><div class="portal-table-wrap"><table class="portal-table"><thead><tr><th scope="col">Event</th><th scope="col">Actor</th><th scope="col">Details</th><th scope="col">Date</th></tr></thead><tbody>${logs.map(item => `<tr><td><span class="portal-event">${icon('activity', 15)}${e(String(item.action || item.type || 'event').replace(/[._]/g, ' '))}</span></td><td>${e(item.actorName || item.actorEmail || item.actor || item.email || 'System')}</td><td class="portal-log-details">${e(typeof item.details === 'object' ? JSON.stringify(item.details) : item.details || item.target || '—')}</td><td>${date(item.createdAt || item.created_at || item.timestamp)}</td></tr>`).join('') || '<tr><td colspan="4">No audit events to display.</td></tr>'}</tbody></table></div><div class="portal-pagination"><span>Page ${logsPage} of ${pages}</span><div><button type="button" class="btn btn-secondary" data-log-page="${logsPage - 1}" ${logsPage <= 1 ? 'disabled' : ''}>Previous</button><button type="button" class="btn btn-secondary" data-log-page="${logsPage + 1}" ${logsPage >= pages ? 'disabled' : ''}>Next ${icon('arrow-right', 15)}</button></div></div></article>`;
}

const loaders = { '/dashboard': loadDashboard, '/admin': loadAdmin, '/profile': loadProfile, '/settings': loadSettings, '/notifications': loadNotifications, '/admin/users': loadUsers, '/admin/permissions': loadPermissions, '/admin/analytics': loadAnalytics, '/admin/content': loadContent, '/admin/settings': loadSystemSettings, '/admin/logs': loadLogs };

let viewRequest = 0;
async function refreshView(path, user) {
  const request = ++viewRequest;
  const view = document.getElementById('portal-view');
  if (!view) return;
  try {
    const html = await loaders[path](user);
    if (request !== viewRequest || document.getElementById('portal-view') !== view || document.querySelector('.portal')?.dataset.route !== path) return;
    view.innerHTML = html;
    wireWorkspace(path, user);
  } catch (error) {
    if (request !== viewRequest || document.getElementById('portal-view') !== view || document.querySelector('.portal')?.dataset.route !== path) return;
    if (error.status === 401) return navigate(`/login?next=${encodeURIComponent(path)}`);
    if (error.status === 403) return navigate('/unauthorized');
    view.innerHTML = `<article class="portal-card">${empty('We couldn’t load this view', error.message || 'Please try again in a moment.', 'activity')}<button type="button" class="btn btn-secondary" id="portal-retry">Try again ${icon('arrow-right', 16)}</button></article>`;
    document.getElementById('portal-retry')?.addEventListener('click', () => { view.innerHTML = loading(); refreshView(path, user); });
  }
}

function wireLogout() {
  document.querySelectorAll('[data-logout]').forEach(button => {
    if (button.dataset.wired) return;
    button.dataset.wired = 'true';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await api('/api/auth/logout', { method: 'POST', body: {} });
        await navigate('/login');
        toast('You’ve been securely signed out.', 'success');
      } catch (error) { button.disabled = false; toast(error.message, 'error'); }
    });
  });
}

function wireWorkspace(path, user) {
  wireLogout();
  wirePasswordToggles();
  wireForm('password-change-form', async (data, form) => {
    await api('/api/settings', { method: 'PATCH', body: { currentPassword: data.currentPassword, newPassword: data.newPassword } });
    form.reset();
  }, 'Password updated. Your other sessions have been signed out.');
  wireForm('profile-form', async data => {
    await api('/api/profile', { method: 'PATCH', body: { name: data.name.trim() } });
    await navigate('/profile');
  }, 'Your profile has been updated.');
  wireForm('settings-form', async (_data, form) => {
    await api('/api/settings', { method: 'PATCH', body: { emailNotifications: form.elements.emailNotifications.checked, productUpdates: form.elements.productUpdates.checked } });
  }, 'Your preferences have been saved.');
  wireForm('system-settings-form', async (data, form) => {
    await api('/api/admin/settings', { method: 'PATCH', body: { siteName: data.siteName.trim(), registrationOpen: form.elements.registrationOpen.checked, maintenance: form.elements.maintenance.checked } });
  }, 'System settings have been saved.');
  document.getElementById('change-password')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email: user.email } });
      toast('Check your email for a secure password reset link.', 'success');
    } catch (error) { toast(error.message, 'error'); }
    finally { button.disabled = false; }
  });
  document.querySelectorAll('[data-read]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await api('/api/notifications', { method: 'PATCH', body: { id: button.dataset.read, read: true } });
      await refreshView(path, user);
    } catch (error) { button.disabled = false; toast(error.message, 'error'); }
  }));
  document.getElementById('users-filter')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    usersState = { page: 1, search: form.elements.search.value.trim(), role: form.elements.role.value };
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Searching…';
    await refreshView(path, user);
  });
  document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { usersState.page = Number(button.dataset.page); refreshView(path, user); }));
  document.querySelectorAll('[data-log-page]').forEach(button => button.addEventListener('click', () => { logsPage = Number(button.dataset.logPage); refreshView(path, user); }));
  document.querySelectorAll('[data-user-id]').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      await api(`/api/admin/users/${encodeURIComponent(form.dataset.userId)}`, { method: 'PATCH', body: { role: form.elements.role.value, status: form.elements.status.value } });
      toast('Member access updated.', 'success');
      await refreshView(path, user);
    } catch (error) { toast(error.message, 'error'); button.disabled = false; form.querySelector('[role="status"]').textContent = error.message; }
  }));
  wireForm('content-form', async (data, form) => {
    await api('/api/admin/content', { method: 'POST', body: { title: data.title.trim(), body: data.body.trim(), status: data.status } });
    form.reset();
    await refreshView(path, user);
  }, 'Workspace update created.');
  document.querySelectorAll('[data-content-toggle]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await api(`/api/admin/content/${encodeURIComponent(button.dataset.contentToggle)}`, { method: 'PATCH', body: { status: button.dataset.currentStatus === 'published' ? 'draft' : 'published' } });
      toast('Content status updated.', 'success');
      await refreshView(path, user);
    } catch (error) { button.disabled = false; toast(error.message, 'error'); }
  }));
  document.querySelectorAll('[data-content-delete]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Delete this update? This action cannot be undone.')) return;
    button.disabled = true;
    try {
      await api(`/api/admin/content/${encodeURIComponent(button.dataset.contentDelete)}`, { method: 'DELETE', body: {} });
      toast('Update deleted.', 'success');
      await refreshView(path, user);
    } catch (error) { button.disabled = false; toast(error.message, 'error'); }
  }));
}

let portalController;
export async function initPortal(path, user) {
  portalController?.abort();
  const pathname = path.split('?')[0].replace(/\/$/, '') || '/';
  if (authPaths.has(pathname)) return initAuth(pathname, user);
  if (!user) return navigate(`/login?next=${encodeURIComponent(pathname)}`);
  if (pathname.startsWith('/admin') && !(user.role === 'admin' || (user.role === 'moderator' && ['/admin/content', '/admin/logs'].includes(pathname)))) return navigate('/unauthorized');
  const portal = document.querySelector('.portal');
  const sidebar = document.querySelector('.portal-sidebar');
  const menu = document.querySelector('.portal-mobile-toggle');
  const main = document.querySelector('.portal-main');
  const media = matchMedia('(max-width:760px)');
  portalController = new AbortController();
  const controller = portalController;
  window.addEventListener('app:navigate', () => controller.abort(), { once: true, signal: controller.signal });
  window.addEventListener('popstate', () => controller.abort(), { once: true, signal: controller.signal });
  sidebar.id = 'workspace-navigation';
  let restoreFocus;
  const syncMenu = () => {
    const open = media.matches && portal.classList.contains('sidebar-open');
    sidebar.inert = media.matches && !open;
    main.inert = open;
    if (open) { sidebar.setAttribute('role', 'dialog'); sidebar.setAttribute('aria-modal', 'true'); }
    else { sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal'); }
  };
  media.addEventListener('change', syncMenu, { signal: controller.signal });
  const close = () => { portal.classList.remove('sidebar-open'); menu.setAttribute('aria-expanded', 'false'); syncMenu(); restoreFocus?.focus(); };
  menu.addEventListener('click', () => {
    const open = !portal.classList.contains('sidebar-open');
    if (open) restoreFocus = document.activeElement;
    portal.classList.toggle('sidebar-open', open);
    menu.setAttribute('aria-expanded', String(open));
    syncMenu();
    if (open) sidebar.querySelector('a')?.focus();
  });
  syncMenu();
  document.querySelector('[data-close-sidebar]').addEventListener('click', close);
  portal.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab' && portal.classList.contains('sidebar-open')) {
      const controls = [...sidebar.querySelectorAll('a,button')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  wireLogout();
  return refreshView(pathname, user);
}
