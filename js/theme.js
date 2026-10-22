const preferenceKey = 'themePreference';
let currentTheme = 'dark';
const sun = '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>';
const moon = '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a9 9 0 1 0 10 10Z"/></svg>';
function storedTheme() {
  try { return localStorage.getItem(preferenceKey) === 'light' ? 'light' : 'dark'; }
  catch { return currentTheme; }
}
function paint(theme) {
  currentTheme = theme;
  if (theme === 'light') document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.setAttribute('aria-pressed', String(theme === 'light'));
    button.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    button.setAttribute('title', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    button.innerHTML = theme === 'light' ? moon : sun;
  });
  const publicLight = theme === 'light' && !document.body?.classList.contains('portal-page');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', publicLight ? '#f8f7fa' : '#0b0c10');
  return theme;
}
/** Preserve the portfolio's existing preference; first-time visits remain dark. */
export function applyTheme() { return paint(storedTheme()); }
export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem(preferenceKey, next); } catch { /* Private browsing can deny storage. */ }
  return paint(next);
}
export function themeButton() {
  const light = document.documentElement.dataset.theme === 'light';
  const label = light ? 'Switch to dark theme' : 'Switch to light theme';
  return `<button type="button" class="icon-button theme-toggle" data-theme-toggle aria-pressed="${light}" aria-label="${label}" title="${label}">${light ? moon : sun}</button>`;
}
