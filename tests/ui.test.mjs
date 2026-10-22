import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, icon } from "../js/shared.js";
import { renderPortal, isPortalPath } from "../js/portal.js";
import { renderPublic } from "../js/public.js";

test("Untrusted strings cannot create HTML or break quoted attributes", () => {
  assert.equal(
    escapeHtml("<img src=x onerror=\"alert(1)\"> & 'test'"),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;test&#39;",
  );
  const html = renderPortal("/profile", {
    name: "<script>alert(1)</script>",
    email: "x@example.com",
    role: "user",
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});
test("Only management roles receive their allowed navigation", () => {
  const render = (role) =>
    renderPortal("/dashboard", {
      name: "Test",
      email: "test@example.com",
      role,
    });
  assert.ok(!render("user").includes('href="/admin/users"'));
  assert.ok(!render("user").includes('href="/admin/content"'));
  assert.ok(render("moderator").includes('href="/admin/content"'));
  assert.ok(!render("moderator").includes('href="/admin/users"'));
  assert.ok(render("admin").includes('href="/admin/users"'));
  assert.ok(render("admin").includes('href="/admin/permissions"'));
});
test("Authentication pages offer labeled required fields and accessible error feedback", () => {
  for (const path of [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ]) {
    const html = renderPortal(path, null);
    assert.match(html, /<h1>/);
    assert.match(html, /<label for="email"|<label for="password"/);
    assert.match(html, /role="alert"/);
    assert.match(html, /required/);
  }
  assert.ok(isPortalPath("/admin/users"));
  assert.ok(isPortalPath("/reset-password?token=x"));
  assert.ok(!isPortalPath("/about"));
});
test("All public pages include a primary heading and a stable main target", () => {
  for (const path of [
    "/",
    "/about",
    "/services",
    "/pricing",
    "/contact",
    "/privacy",
    "/terms",
  ]) {
    const html = renderPublic(path);
    assert.equal((html.match(/<h1[> ]/g) || []).length, 1);
    assert.match(html, /id="main"/);
  }
});
test("Decorative icons are hidden from assistive technology", () => {
  assert.match(icon("check"), /aria-hidden="true"/);
  assert.match(icon("unknown-name"), /<svg/);
});
