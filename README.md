# FalloutJr Portfolio (GitHub Pages Static Site)

A polished, dark-first **signal / forge** personal portfolio for **falloutjr** built with only:

- `index.html`
- `css/style.css`
- `js/main.js`

No package manager, build tooling, backend, or database is required.

## Live Site

- Portfolio: https://falloutjr.github.io/falloutjr
- GitHub profile: https://github.com/falloutjr
- Repository: https://github.com/falloutjr/falloutjr

## Focus and Content

The portfolio keeps and elevates the core profile narrative:

- Software developer focused on **Unreal Engine/game systems**
- Strong **C++** and **JavaScript/web development** experience
- Creative coding and ongoing learning mindset
- Open collaboration and contact pathways via GitHub

## Site Architecture

Single-page static portfolio with hash navigation sections:

1. Home hero + metrics
2. About (story + values)
3. Featured work/services
4. Capabilities with animated progress bars
5. Learning milestones timeline
6. Workbench/dashboard visual preview (static concept)
7. Collaboration tiers + engagement toggle
8. FAQ accordion
9. Contact panel + static-safe inquiry form
10. Footer

## Interaction Features (Vanilla JS)

- Mobile menu open/close (Escape + outside click)
- Active nav link tracking with `IntersectionObserver`
- Scroll reveal animations with graceful fallback
- Animated counters and capability progress fills
- FAQ accordion (keyboard and screen reader friendly)
- Project details modal with focus return + Escape close
- Contact form validation with inline errors and loading/success states
- Safe static form handling via `mailto:` draft fallback (no secrets)
- Copy-to-clipboard contact action
- Toast notifications via live region
- Theme toggle (light/dark) with harmless `localStorage` persistence

## Accessibility and UX Notes

- Semantic headings and section structure
- Visible `:focus-visible` styles
- Keyboard-accessible navigation, FAQ, modal, and form controls
- `aria-expanded`, `aria-controls`, `aria-live`, and dialog attributes where needed
- Reduced-motion support using `prefers-reduced-motion`
- Responsive layout system with CSS custom properties + `clamp()`
- Defensive JS guards to avoid runtime errors if elements are missing
- Overflow-safe layout to avoid accidental horizontal scrolling

## Authentication / Admin Limitation (Important)

This repository is deployed on **GitHub Pages** and is static-only.

That means this project intentionally does **not** implement insecure/fake:

- password storage in client code
- client-only RBAC claims
- protected admin routes with real authorization
- server-side session management
- password reset/email verification flows
- audit logs backed by persistent storage

### Roadmap for Real Secure Auth/Admin

To support secure auth/admin in the future, add backend infrastructure such as:

1. API/backend service (Node, Go, etc.)
2. Database for users/roles/audit data
3. Server-side authentication + authorization checks
4. Session/JWT management with secure rotation and expiry
5. Password hashing and reset/email verification workflows
6. Protected API routes for admin/user operations
7. Logging, rate limiting, and security monitoring

No real credentials or secrets are included in this repository.

## Local Preview

Because this is static HTML/CSS/JS, you can run a simple local preview server from the repo root:

```bash
cd /home/runner/work/falloutjr/falloutjr
python3 -m http.server 8000
```

Then open:

- http://localhost:8000

## Deployment

Push changes to the default GitHub Pages source branch for this repository. GitHub Pages serves the static files directly.

## Verification Performed

- Static path checks (`index.html` -> `css/style.css`, `js/main.js`)
- Manual interaction validation in code for navigation, modal, FAQ, form states, and reduced motion handling
- No new dependencies introduced
- No secrets committed
