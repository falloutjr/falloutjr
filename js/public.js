import { icon, api, escapeHtml, toast } from "./shared.js";
const arrow = icon("arrow-up-right", 19);
const github = "https://github.com/falloutjr";
const projects = [
  {
    id: "game",
    type: "Game development",
    title: "Worlds worth getting lost in.",
    short: "Unreal Engine game",
    text: "An evolving, narrative-driven game exploring immersive environments, responsive gameplay, and interactive storytelling.",
    tags: ["Unreal Engine", "C++", "Blueprints"],
    asset: "game-world.svg",
    status: "In development",
  },
  {
    id: "web",
    type: "Web engineering",
    title: "Small details. Powerful tools.",
    short: "Web tools & utilities",
    text: "Responsive web applications that bring thoughtful interfaces and performance-focused engineering together.",
    tags: ["JavaScript", "Node.js", "HTML & CSS"],
    asset: "web-tools.svg",
    status: "Active exploration",
  },
  {
    id: "lab",
    type: "Creative coding",
    title: "A little curiosity goes a long way.",
    short: "The creative lab",
    text: "An ongoing playground for gameplay mechanics, interface systems, and the interesting space between code and creativity.",
    tags: ["C++", "JavaScript", "Prototyping"],
    asset: "creative-lab.svg",
    status: "Ongoing experiments",
  },
];
const label = (text, num = "") =>
  `<div class="eyebrow"><span class="tiny-square"></span>${text}${num ? `<span class="section-index">${num}</span>` : ""}</div>`;
const cta = () =>
  `<section class="cta-section container" data-reveal><div class="cta-orbit" aria-hidden="true"></div><div>${label("GOOD THINGS START WITH A CONVERSATION")}<h2>Your next idea.<br><span>Let’s make it real.</span></h2><a class="button button-primary" href="/contact">Start a conversation ${arrow}</a></div><span class="cta-note">Open to collaboration<br>and interesting challenges.</span></section>`;
const projectCard = (p, i) =>
  `<article class="work-card" data-reveal data-category="${p.id}"><button class="work-image" data-project="${p.id}" aria-label="Explore ${p.short} — ${p.status}"><img src="/assets/${p.asset}" alt="${p.id === "game" ? "Concept illustration of a violet canyon and illuminated gateway" : p.id === "web" ? "Illustrative desktop and mobile dashboard interface" : "Abstract sculpture made from violet particles"}" width="800" height="560" loading="lazy"><span class="image-label"><span class="status-dot">${p.status}</span>${icon("arrow-up-right", 18)}</span></button><div class="work-meta"><span>0${i + 1} / ${p.type}</span><span>${p.tags[0]}</span></div><h3><button data-project="${p.id}">${p.short} ${arrow}</button></h3><p>${p.text}</p><div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div></article>`;
function home() {
  return `<main id="main"><section class="hero container"><div class="hero-copy"><div class="availability"><span></span>Independent developer. Endless possibilities.</div><h1>Digital craft.<br><span class="serif-word">Engineered.</span></h1><p class="hero-description">I turn complex ideas into thoughtful digital experiences. From immersive game worlds to the web tools you’ll love to use.</p><div class="hero-actions"><a class="button button-primary" href="#projects">Explore my work ${icon("arrow-right", 18)}</a><a class="text-link" href="/about">Meet the developer ${arrow}</a></div><div class="hero-proof"><span class="code-monogram">&lt;/&gt;</span><div><strong>Built with curiosity. Backed by code.</strong><span>Java · C++ · JavaScript · Unreal Engine</span></div></div></div><div class="hero-visual"><div class="hero-orbits" aria-hidden="true"></div><img class="hero-art" src="/assets/hero-art.svg" width="1000" height="1000" alt="An intricate chrome and lavender knot, representing the connection between creative ideas and engineering" fetchpriority="high"><span class="art-caption"><span>FIG. 001</span>WHERE LOGIC MEETS IMAGINATION</span><div class="floating-note"><span class="status-dot">Currently building</span><strong>A world of possibilities</strong><span>Unreal Engine / C++ ${arrow}</span></div></div><div class="hero-bottom"><span>GOOD IDEAS DESERVE GREAT EXECUTION.</span><a href="#projects">SCROLL TO EXPLORE <span>↓</span></a></div></section>
<section class="tech-strip"><div class="container"><span>THE TOOLS BEHIND THE CRAFT</span><div><b class="tech-java">${icon("terminal", 26)} <span>Java</span></b><b>${icon("code", 28)} C++</b><b><span class="js-mark">JS</span> JavaScript</b><b><span class="unreal-mark">U</span> Unreal Engine</b><b>${icon("github", 24)} GitHub</b></div></div></section>
<section class="section container" id="projects"><div class="section-heading" data-reveal><div>${label("SELECTED WORK", "01 /")}<h2>Ideas in motion.<br><span>Code with purpose.</span></h2></div><div class="heading-aside"><p>A few things I’m building, exploring,<br>and getting a little obsessed with.</p><a class="text-link" href="${github}?tab=repositories" target="_blank" rel="noopener noreferrer">All repositories ${arrow}</a></div></div><div class="filter-tabs" role="group" aria-label="Filter selected work">${[
    ["all", "All work"],
    ["game", "Game development"],
    ["web", "Web engineering"],
    ["lab", "Creative lab"],
  ]
    .map(
      ([id, text]) =>
        `<button data-filter="${id}" aria-pressed="${id === "all"}">${text}${id === "all" ? "<span>03</span>" : ""}</button>`,
    )
    .join(
      "",
    )}</div><div class="work-grid">${projects.map(projectCard).join("")}</div></section>
<section class="section expertise-section"><div class="container"><div class="section-heading" data-reveal><div>${label("WHAT I BRING TO THE TABLE", "02 /")}<h2>Creative thinking.<br><span>Technical precision.</span></h2></div><a class="text-link" href="/services">Explore my expertise ${arrow}</a></div><div class="expertise-grid">${[
    [
      "gamepad",
      "Game systems engineering",
      "From the first prototype to the mechanics that make a world feel alive. Unreal Engine, C++, and a healthy respect for performance.",
      "01",
    ],
    [
      "globe",
      "Web development",
      "Thoughtful interfaces, scalable architecture, and responsive experiences that work beautifully on every screen.",
      "02",
    ],
    [
      "sparkles",
      "Creative development",
      "Where “what if?” becomes a working prototype. Exploring interaction, UI systems, and new ways to bring ideas to life.",
      "03",
    ],
  ]
    .map(
      ([ico, title, desc, num]) =>
        `<a class="expertise-card" href="/services" data-reveal><div class="card-top"><span class="icon-tile">${icon(ico, 25)}</span><span>${num}</span></div><h3>${title}</h3><p>${desc}</p><span class="round-arrow">${arrow}</span></a>`,
    )
    .join("")}</div></div></section>
<section class="section container about-preview" data-reveal><div class="about-composition"><div class="code-window"><div class="window-chrome"><i></i><i></i><i></i><span>developer.config</span></div><code><span class="muted">// Always a work in progress.</span><br><span class="purple">const</span> developer = {<br> &nbsp; name: <span class="green">'FalloutJr'</span>,<br> &nbsp; mindset: <span class="green">'Stay curious'</span>,<br> &nbsp; focus: [<br> &nbsp; &nbsp; <span class="green">'Great experiences'</span>,<br> &nbsp; &nbsp; <span class="green">'Clean architecture'</span><br> &nbsp; ],<br> &nbsp; learning: <span class="purple">true</span><br>};</code><span class="code-footer"><span class="status-dot">Always learning</span>UTF-8</span></div><span class="floating-symbol">{ }</span></div><div>${label("THE PERSON BEHIND THE PIXELS", "03 /")}<h2>A builder at heart.<br><span>Curious by default.</span></h2><p>I’m FalloutJr, an independent software developer working at the intersection of web technology and game systems.</p><p>I care about how things work. And how they feel. That means clean code, purposeful design, and the small details that turn something functional into something memorable.</p><a class="text-link" href="/about">A little more about me ${arrow}</a><div class="small-metrics"><div><strong>05</strong><span>Core languages</span></div><div><strong>03</strong><span>Creative disciplines</span></div><div><strong>∞</strong><span>Things to explore</span></div></div></div></section>
<section class="quote-section container" data-reveal><span class="quote-mark">“</span><blockquote>Good software solves a problem.<br><span>Great software makes you feel something.</span></blockquote><div class="quote-author"><span class="avatar-letter">f.</span><div><strong>The thinking behind the work</strong><span>FalloutJr · Independent developer</span></div></div></section>${cta()}</main>`;
}
function about() {
  return `<main id="main"><section class="page-hero container">${label("INDEPENDENT BY DESIGN")}<h1>Behind every pixel,<br><span class="serif-word">a curious mind.</span></h1><p>Hi, I’m FalloutJr. I build software, explore game worlds, and follow the interesting questions.</p></section><section class="container story-grid section-tight" data-reveal><div class="story-art"><img src="/assets/creative-lab.svg" width="800" height="560" alt="Lavender particle sculpture, an illustration of creative exploration"><span>EXPERIMENT. LEARN. BUILD. REPEAT.</span></div><div>${label("A LITTLE BACKSTORY")}<h2>Two worlds.<br><span>One builder.</span></h2><p>My work spans web development and game systems engineering. I’m drawn to the mix of precision and possibility: a C++ gameplay mechanic, an expressive interface, or a web tool that makes someone’s day a little easier.</p><p>Right now, I’m developing a narrative-driven game in Unreal Engine, building web tools, and exploring creative coding. Some projects are still taking shape. That’s part of the process.</p><a class="text-link" href="${github}" target="_blank" rel="noopener noreferrer">Follow the work on GitHub ${arrow}</a></div></section><section class="section container">${label("THE PRINCIPLES")}<h2>How I like to build.</h2><div class="values-grid">${[
    [
      "01",
      "Craft over shortcuts",
      "Choose thoughtful architecture, readable code, and decisions that will make sense to the next person.",
    ],
    [
      "02",
      "Performance is a feature",
      "A beautiful experience should also feel fast, responsive, and reliable.",
    ],
    [
      "03",
      "Keep the curiosity",
      "Prototype, ask questions, and make room to learn something unexpected.",
    ],
  ]
    .map(
      ([n, t, p]) =>
        `<article class="value-card" data-reveal><span>${n}</span><h3>${t}</h3><p>${p}</p></article>`,
    )
    .join(
      "",
    )}</div></section><section class="section expertise-section"><div class="container story-grid"><div>${label("THE NEXT CHAPTER")}<h2>Always in<br><span>development.</span></h2><p>There’s no finish line for learning. Here’s what’s on the workbench.</p></div><div class="timeline">${[
    [
      "NOW",
      "Narrative-driven game",
      "Building immersive environments and gameplay systems in Unreal Engine.",
    ],
    [
      "IN PROGRESS",
      "Web tools & experiments",
      "Exploring full-stack applications, API design, and interface engineering.",
    ],
    [
      "CONTINUOUS",
      "Going deeper",
      "Advanced C++, memory management, optimization, and Unreal C++ integration with Blueprints.",
    ],
  ]
    .map(
      ([n, t, p]) =>
        `<article data-reveal><span>${n}</span><h3>${t}</h3><p>${p}</p></article>`,
    )
    .join(
      "",
    )}</div></div></section><section class="section container team-section">${label("SMALL STUDIO ENERGY")}<h2>One developer.<br><span>A collaborative mindset.</span></h2><div class="developer-card" data-reveal><span class="developer-avatar">f.</span><div><h3>FalloutJr</h3><p>Software developer · Game systems & web engineering</p><div class="tags"><span>Java</span><span>C++</span><span>JavaScript</span></div></div><a class="icon-button" href="${github}" aria-label="FalloutJr on GitHub" target="_blank" rel="noopener noreferrer">${icon("github", 25)}</a></div></section>${cta()}</main>`;
}
function services() {
  return `<main id="main"><section class="page-hero container">${label("EXPERTISE & POSSIBILITIES")}<h1>From “what if”<br><span class="serif-word">to what’s next.</span></h1><p>Creative problem solving, thoughtful interfaces, and the engineering that brings it all together.</p></section>${projects.map((p, i) => `<section class="container service-detail section-tight ${i % 2 ? "reverse" : ""}" data-reveal><div class="service-illustration"><img src="/assets/${p.asset}" alt="${p.type} concept illustration" width="800" height="560" loading="lazy"><span>ILLUSTRATIVE CONCEPT / 0${i + 1}</span></div><div>${label("0" + (i + 1) + " / " + p.type.toUpperCase())}<h2>${p.title}</h2><p>${p.text}</p><ul class="check-list">${(i === 0 ? ["Performance-conscious gameplay systems", "C++ and Blueprint integration", "Interactive storytelling prototypes"] : i === 1 ? ["Responsive, accessible interfaces", "Clean APIs and server architecture", "Practical tools built for real use"] : ["Rapid interaction prototyping", "Expressive UI and motion systems", "Experiments across web and games"]).map((t) => `<li>${icon("check", 17)}${t}</li>`).join("")}</ul><div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div><a class="text-link" href="/contact?subject=${encodeURIComponent(p.type)}">Talk about your idea ${arrow}</a></div></section>`).join("")}<section class="section expertise-section"><div class="container">${label("A THOUGHTFUL PROCESS")}<h2>Clarity at every step.</h2><div class="process-grid">${[
    [
      "01",
      "Discover",
      "Start with the problem, the people, and what success should look like.",
    ],
    [
      "02",
      "Shape",
      "Explore possibilities, define a clear scope, and prototype the important parts.",
    ],
    [
      "03",
      "Build",
      "Make it real with maintainable code, purposeful design, and regular check-ins.",
    ],
    [
      "04",
      "Refine",
      "Test across devices, improve the details, and hand over something you can build on.",
    ],
  ]
    .map(
      ([n, t, d]) =>
        `<article data-reveal><span>${n} ${icon("arrow-right", 17)}</span><h3>${t}</h3><p>${d}</p></article>`,
    )
    .join("")}</div></div></section>${cta()}</main>`;
}
const pricingPlans = [
  {
    name: "Explore",
    description: "For the curious. Get to know the work.",
    price: "Free",
    note: "Always open to explore",
    features: [
      "Public projects & source code",
      "Game development progress",
      "Creative coding experiments",
      "GitHub collaboration",
    ],
    cta: "Explore GitHub",
    href: github,
  },
  {
    name: "Collaborate",
    description: "A focused idea, thoughtfully brought to life.",
    price: "1,500",
    annual: "1,350",
    note: "Illustrative monthly project budget",
    features: [
      "A clearly scoped project",
      "Web or game systems development",
      "Regular progress check-ins",
      "Source code & handover",
    ],
    cta: "Discuss a project",
    href: "/contact?subject=Project%20collaboration",
    popular: true,
  },
  {
    name: "Partner",
    description: "More space for ambitious possibilities.",
    price: "4,000",
    annual: "3,600",
    note: "Illustrative monthly project budget",
    features: [
      "A broader development roadmap",
      "Iterative design & development",
      "Ongoing technical collaboration",
      "Documentation & knowledge sharing",
    ],
    cta: "Let’s talk scope",
    href: "/contact?subject=Development%20partnership",
  },
];
function pricing() {
  return `<main id="main"><section class="page-hero container centered">${label("WAYS TO WORK TOGETHER")}<h1>A good fit.<br><span class="serif-word">A great beginning.</span></h1><p>Explore the open-source work or start a conversation about something new.</p><div class="billing-toggle" role="group" aria-label="Budget planning period"><button data-billing="monthly" aria-pressed="true">Monthly</button><button data-billing="yearly" aria-pressed="false">Yearly <span>Plan ahead</span></button></div><p class="pricing-disclaimer">Example budgets for planning, not a published service offer.<br>Final pricing, availability, and scope are agreed in a written proposal.</p></section><section class="container pricing-grid">${pricingPlans.map((p) => `<article class="price-card ${p.popular ? "recommended" : ""}" data-reveal>${p.popular ? '<span class="recommended-tag">A GREAT STARTING POINT</span>' : ""}<span class="plan-icon">${icon(p.name === "Explore" ? "code" : p.name === "Collaborate" ? "layers" : "sparkles", 25)}</span><h2>${p.name}</h2><p>${p.description}</p><div class="price">${p.price === "Free" ? "<strong>Free</strong>" : `<strong>$<span data-monthly="${p.price}" data-yearly="${p.annual}">${p.price}</span></strong><span>/ month</span>`}</div><small>${p.note}</small><a class="button ${p.popular ? "button-primary" : "button-outline"}" href="${p.href}" ${p.href === github ? 'target="_blank" rel="noopener noreferrer"' : ""}>${p.cta} ${arrow}</a><ul class="check-list">${p.features.map((f) => `<li>${icon("check", 17)}${f}</li>`).join("")}</ul></article>`).join("")}</section><section class="section container"><div class="section-heading">${label("THE DETAILS")}<h2>Find your starting point.</h2></div><div class="table-scroll"><table class="comparison-table"><caption>Comparison of engagement options</caption><thead><tr><th scope="col">What’s included</th><th scope="col">Explore</th><th scope="col">Collaborate</th><th scope="col">Partner</th></tr></thead><tbody>${[
    ["Public source code", "Included", "Included", "Included"],
    ["Private project workspace", "—", "Included", "Included"],
    ["Defined deliverables", "—", "Per project", "Roadmap"],
    ["Progress check-ins", "GitHub updates", "Per milestone", "Ongoing"],
    ["Final scope & availability", "Open source", "By proposal", "By proposal"],
  ]
    .map(
      (row) =>
        `<tr>${row.map((c, i) => (i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`)).join("")}</tr>`,
    )
    .join(
      "",
    )}</tbody></table></div></section><section class="section container faq-section"><div>${label("A FEW GOOD QUESTIONS")}<h2>Before we<br><span>get started.</span></h2><p>Something else on your mind?<br><a class="text-link" href="/contact">Let’s talk ${arrow}</a></p></div><div class="faq-list">${[
    [
      "Are these fixed prices?",
      "No. These are illustrative planning budgets. Every project has its own goals, complexity, and schedule. A written proposal sets the actual price, deliverables, and terms.",
    ],
    [
      "Can I contribute to the open-source projects?",
      "Absolutely. Explore the repositories on GitHub, review the project guidance, and start a discussion or propose a contribution.",
    ],
    [
      "What kind of projects are a good fit?",
      "Web tools, thoughtful interfaces, Unreal Engine gameplay systems, and creative prototypes are the main areas of focus.",
    ],
    [
      "Is this a subscription or checkout?",
      "No payments are collected on this website. The monthly and yearly controls help compare example planning budgets. Get in touch to discuss a real engagement.",
    ],
    [
      "How do we begin?",
      "Send a brief introduction through the contact form. Share the idea, the problem you want to solve, and any timing or constraints you have in mind.",
    ],
  ]
    .map(
      ([q, a]) =>
        `<details><summary>${q}${icon("plus", 17)}</summary><p>${a}</p></details>`,
    )
    .join("")}</div></section>${cta()}</main>`;
}
function contact() {
  return `<main id="main"><section class="page-hero container">${label("LET’S MAKE SOMETHING GOOD")}<h1>A small hello.<br><span class="serif-word">A big possibility.</span></h1><p>A new project, a technical question, or an interesting idea. I’d love to hear what you’re thinking.</p></section><section class="container contact-layout section-tight"><aside><div class="contact-intro">${icon("mail", 32)}<h2>Start a conversation.</h2><p>Tell me a little about yourself and what you’d like to build. No perfect brief required.</p></div><a class="contact-social" href="${github}" target="_blank" rel="noopener noreferrer">${icon("github", 26)}<span><strong>Find me on GitHub</strong><small>@falloutjr</small></span>${arrow}</a><button class="text-link" id="copy-profile" type="button">Copy GitHub profile ${icon("external-link", 15)}</button><div class="contact-note"><span class="status-dot">Open to interesting challenges</span><p>Independent developer.<br>Web technology & game systems.<br>Working wherever curiosity leads.</p></div></aside><form id="contact-form" class="form-card" novalidate><div class="form-row"><div class="field"><label for="contact-name">Your name <span>*</span></label><input id="contact-name" name="name" autocomplete="name" placeholder="Alex Morgan" required minlength="2" maxlength="100"><span class="field-error" id="name-error"></span></div><div class="field"><label for="contact-email">Email address <span>*</span></label><input id="contact-email" type="email" name="email" autocomplete="email" placeholder="alex@example.com" required maxlength="254"><span class="field-error" id="email-error"></span></div></div><div class="field"><label for="contact-subject">What’s on your mind? <span>*</span></label><input id="contact-subject" name="subject" placeholder="A project, a collaboration, an idea…" required minlength="3" maxlength="180"><span class="field-error" id="subject-error"></span></div><div class="field"><label for="contact-message">Tell me a little more <span>*</span></label><textarea id="contact-message" name="message" rows="6" placeholder="The idea, the challenge, the possibilities…" required minlength="20" maxlength="5000"></textarea><span class="field-error" id="message-error"></span></div><div class="form-message" id="contact-status" role="status" aria-live="polite"></div><div class="form-bottom"><p>By sending, you agree to the <a href="/privacy">privacy policy</a>.<br>Required fields are marked *.</p><button class="button button-primary" type="submit">Send your message ${arrow}</button></div></form></section></main>`;
}
function legal(path) {
  const privacy = path === "/privacy";
  return `<main id="main" class="container legal-page"><a class="text-link" href="/">← Back home</a><h1>${privacy ? "Privacy policy" : "Website terms"}</h1><p class="muted">Last updated October 22, 2026</p>${privacy ? `<h2>What this site stores</h2><p>When you create an account, the site stores your name, email, securely hashed password, role, preferences, and account status. Session cookies keep you signed in. Account security events are recorded in an audit log.</p><h2>Messages and email</h2><p>The contact form stores the name, email, subject, and message you submit so the site owner can respond. Account verification and password recovery messages use a configured transactional email service. Your password is never sent by email.</p><h2>Your choices</h2><p>You can update your profile and preferences in your workspace. Contact FalloutJr through the contact page to request access to or deletion of your account data. Security logs may be retained when needed to protect the service.</p><h2>Cookies and external links</h2><p>The site uses essential session cookies and local preferences only. Fonts and artwork are hosted with the site. GitHub links take you to an external service with its own privacy policy.</p>` : `<h2>Using this website</h2><p>This site presents FalloutJr’s development work and provides a collaboration workspace. Use it lawfully and respect the security and privacy of other users.</p><h2>Project examples and budgets</h2><p>Concept artwork, interface mockups, and planning budgets illustrate possible work. They are not testimonials, actual client results, a binding offer, or a payment subscription. Any paid engagement requires a separate written agreement.</p><h2>Accounts</h2><p>Keep your credentials private and provide accurate contact information. Access is role-based. The site owner may suspend accounts that misuse the service.</p><h2>Source and intellectual property</h2><p>Repository source is governed by the license in its respective repository. Viewing this site does not grant additional rights to third-party names or trademarks.</p>`}<h2>Get in touch</h2><p>For questions, use the <a href="/contact">contact form</a> or connect through <a href="${github}">GitHub</a>.</p></main>`;
}
export function renderPublic(path) {
  if (path === "/") return home();
  if (path === "/about") return about();
  if (["/services", "/features"].includes(path)) return services();
  if (path === "/pricing") return pricing();
  if (path === "/contact") return contact();
  if (["/privacy", "/terms"].includes(path)) return legal(path);
  return `<main id="main" class="container empty-page">${label("404 / A LITTLE OFF THE PATH")}<h1>This page is<br><span>still a possibility.</span></h1><p>The page you’re looking for doesn’t exist.</p><a class="button button-primary" href="/">Back to the good stuff ${icon("arrow-right")}</a></main>`;
}
function openProject(id) {
  const p = projects.find((p) => p.id === id);
  if (!p) return;
  const trigger = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.className = "project-dialog";
  dialog.innerHTML = `<button class="dialog-close icon-button" aria-label="Close project">${icon("x")}</button><img src="/assets/${p.asset}" width="800" height="560" alt="${p.type} concept illustration"><div class="dialog-body">${label(p.type.toUpperCase())}<h2>${p.short}</h2><p>${p.text}</p><p class="muted">${p.id === "game" ? "The game is in development. Details will be shared as the project evolves." : "Explore the public repositories for current projects and source code."} Artwork shown here is an illustrative concept.</p><div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div><a class="button button-primary" href="${github}?tab=repositories" target="_blank" rel="noopener noreferrer">Explore GitHub ${arrow}</a></div>`;
  document.body.append(dialog);
  dialog.showModal();
  dialog
    .querySelector("button")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    trigger?.focus();
  });
}
export function initPublic(path) {
  document
    .querySelectorAll("[data-project]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openProject(button.dataset.project),
      ),
    );
  document.querySelectorAll("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-filter]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      document.querySelectorAll("[data-category]").forEach((card) => {
        card.hidden =
          button.dataset.filter !== "all" &&
          card.dataset.category !== button.dataset.filter;
      });
    }),
  );
  document.querySelectorAll("[data-billing]").forEach((button) =>
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-billing]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      document.querySelectorAll("[data-monthly]").forEach((el) => {
        el.textContent = el.dataset[button.dataset.billing];
      });
      document.querySelectorAll(".price-card small").forEach((el, i) => {
        if (i)
          el.textContent =
            button.dataset.billing === "yearly"
              ? "Monthly equivalent for annual planning"
              : "Illustrative monthly project budget";
      });
    }),
  );
  if (path === "/contact") {
    document
      .getElementById("copy-profile")
      ?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(github);
          toast("GitHub profile link copied.");
        } catch {
          toast("Copy this link: " + github, "error");
        }
      });
    const form = document.getElementById("contact-form");
    form.elements.subject.value =
      new URLSearchParams(location.search).get("subject") || "";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(form));
      let invalid = false;
      for (const input of form.querySelectorAll("input,textarea")) {
        const error = document.getElementById(input.name + "-error");
        const message = input.validity.valueMissing
          ? "This field is required."
          : input.validity.typeMismatch
            ? "Please enter a valid email address."
            : input.value.trim().length < Number(input.minLength)
              ? `Please enter at least ${input.minLength} characters.`
              : "";
        error.textContent = message;
        input.setAttribute("aria-invalid", String(!!message));
        input.setAttribute("aria-describedby", error.id);
        if (message && !invalid) {
          input.focus();
          invalid = true;
        }
      }
      if (invalid) return;
      const button = form.querySelector('button[type="submit"]');
      const status = document.getElementById("contact-status");
      button.disabled = true;
      button.innerHTML = "Sending…";
      status.textContent = "";
      try {
        await api("/api/contact", { method: "POST", body });
        status.className = "form-message success";
        status.textContent =
          "Your message is safely received. Thanks for starting a conversation.";
        form.reset();
        toast("Message received. Thank you!");
      } catch (error) {
        status.className = "form-message error";
        status.textContent = error.message;
        for (const [key, message] of Object.entries(error.fields || {})) {
          const el = document.getElementById(key + "-error");
          if (el) el.textContent = escapeHtml(message);
        }
      } finally {
        button.disabled = false;
        button.innerHTML = "Send your message " + arrow;
      }
    });
  }
}
