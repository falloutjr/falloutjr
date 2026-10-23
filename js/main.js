import { brand, icon, api, navigate } from "./shared.js";
import { applyTheme, toggleTheme, themeButton } from "./theme.js";
applyTheme();
const isPortalPath = (path) =>
  /^\/(?:login|register|forgot-password|reset-password|verify-email|unauthorized|dashboard|profile|settings|notifications|admin(?:\/(?:users|permissions|analytics|content|settings|logs))?)$/.test(
    path,
  );
let routeVersion = 0;
function header(path, user) {
  return `<header class="site-header"><div class="container nav-inner"><a class="brand" href="/" aria-label="FalloutJr home">${brand}</a><nav class="desktop-nav" aria-label="Main navigation">${[
    ["/", "Home"],
    ["/about", "About"],
    ["/services", "Expertise"],
    ["/pricing", "Pricing"],
    ["/contact", "Contact"],
  ]
    .map(
      ([href, text]) =>
        `<a href="${href}" ${path === href ? 'aria-current="page"' : ""}>${text}</a>`,
    )
    .join(
      "",
    )}</nav><div class="nav-actions">${themeButton()}<a class="nav-login" href="${user ? "/dashboard" : "/login"}">${user ? "Workspace" : "Log in"}</a><a class="button button-small button-light" href="/contact">Let’s talk ${icon("arrow-up-right", 16)}</a><button class="mobile-toggle icon-button" aria-label="Open menu" aria-controls="mobile-nav" aria-expanded="false">${icon("menu")}</button></div></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation" hidden>${[
    ["/", "Home"],
    ["/about", "About"],
    ["/services", "Expertise"],
    ["/pricing", "Pricing"],
    ["/contact", "Contact"],
    [user ? "/dashboard" : "/login", user ? "Workspace" : "Log in"],
  ]
    .map(
      ([href, text]) =>
        `<a href="${href}">${text}${icon("arrow-up-right", 18)}</a>`,
    )
    .join("")}</nav></header>`;
}
function footer() {
  return `<footer class="site-footer"><div class="container"><div class="footer-top"><div><a class="brand" href="/">${brand}</a><p>Thoughtful code.<br>Extraordinary possibilities.</p></div><div class="footer-links"><div><span>Explore</span><a href="/about">About</a><a href="/services">Expertise</a><a href="/pricing">Pricing</a></div><div><span>Connect</span><a href="/contact">Start a conversation</a><a href="https://github.com/falloutjr" target="_blank" rel="noopener noreferrer">GitHub ${icon("arrow-up-right", 13)}</a><a href="/login">Client workspace</a></div><div><span>The details</span><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="https://github.com/falloutjr/falloutjr" target="_blank" rel="noopener noreferrer">View source ${icon("arrow-up-right", 13)}</a></div></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} FalloutJr. Crafted with intention.</span><span class="status-dot">Independent developer. Always exploring.</span><a href="#main">Back to top ↑</a></div></div></footer>`;
}
async function render() {
  const version = ++routeVersion;
  const path = location.pathname.replace(/\/$/, "") || "/";
  let user = null;
  try {
    user = (await api("/api/auth/me")).user;
  } catch {
    /* Public pages stay available while the API reconnects. */
  }
  if (version !== routeVersion) return;
  const portal = isPortalPath(path);
  document.body.classList.toggle("portal-page", portal);
  const pageModule = portal
    ? await import("./portal.js")
    : await import("./public.js");
  if (version !== routeVersion) return;
  document.getElementById("app").innerHTML = portal
    ? pageModule.renderPortal(path, user)
    : header(path, user) + pageModule.renderPublic(path) + footer();
  const title =
    {
      "/": "Digital craft. Engineered.",
      "/about": "The developer behind the work",
      "/services": "Expertise",
      "/pricing": "Ways to work together",
      "/contact": "Let’s build something remarkable",
    }[path] ||
    path.split("/").filter(Boolean).pop()?.replaceAll("-", " ") ||
    "FalloutJr";
  document.title = `${title.charAt(0).toUpperCase() + title.slice(1)} — FalloutJr`;
  if (portal) await pageModule.initPortal(path, user);
  else pageModule.initPublic(path);
  applyTheme();
  document
    .querySelector("[data-theme-toggle]")
    ?.addEventListener("click", toggleTheme);
  const toggle = document.querySelector(".mobile-toggle");
  const mobile = document.getElementById("mobile-nav");
  if (toggle)
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      toggle.innerHTML = icon(open ? "x" : "menu");
      mobile.hidden = !open;
    });
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("reveal-ready");
    const ob = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            ob.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    ob.observe(el);
  });
  if (location.hash) {
    requestAnimationFrame(() =>
      document.getElementById(location.hash.slice(1))?.scrollIntoView(),
    );
  }
}
async function changeRoute(path, push = true) {
  if (push) history.pushState({}, "", path);
  window.scrollTo({ top: 0, behavior: "instant" });
  await render();
  document.querySelector("h1")?.setAttribute("tabindex", "-1");
  document.querySelector("h1")?.focus({ preventScroll: true });
}
document.addEventListener("click", (event) => {
  const anchor = event.target.closest("a");
  if (
    !anchor ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.target ||
    anchor.hasAttribute("download")
  )
    return;
  const url = new URL(anchor.href, location.href);
  if (
    url.origin !== location.origin ||
    !url.pathname.startsWith("/") ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (url.pathname === location.pathname && url.hash) return;
  event.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});
window.addEventListener("app:navigate", (event) => changeRoute(event.detail));
window.addEventListener("popstate", () =>
  changeRoute(location.pathname + location.search + location.hash, false),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const toggle = document.querySelector(
      '.mobile-toggle[aria-expanded="true"]',
    );
    toggle?.click();
    toggle?.focus();
  }
});
render();
