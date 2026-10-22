import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';

test.describe.configure({ mode: 'serial' });
const pageErrors = new WeakMap();
const identity = () => ({
  name: 'Browser Test Member',
  email: `browser-${Date.now()}-${randomBytes(4).toString('hex')}@example.test`,
  password: randomBytes(22).toString('base64url'),
});
async function visit(page, path) {
  await page.goto(path);
  await expect(page.locator('h1')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
}
async function noOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function accessible(page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
}
async function register(page, member) {
  await visit(page, '/register');
  await page.locator('#name').fill(member.name);
  await page.locator('#email').fill(member.email);
  await page.locator('#password').fill(member.password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/verify-email/);
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('selected work filters, project dialog, focus restoration, and navigation work', async ({ page }) => {
  await visit(page, '/');
  await expect(page.locator('.work-card:visible')).toHaveCount(3);
  await page.getByRole('button', { name: 'Game development', exact: true }).click();
  await expect(page.locator('.work-card:visible')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Game development', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const trigger = page.getByRole('button', { name: 'Explore Unreal Engine game — In development', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Unreal Engine game' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: /All work/ }).click();
  await expect(page.locator('.work-card:visible')).toHaveCount(3);
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL('/about');
  await expect(page.locator('h1')).toContainText('a curious mind');
});

test('pricing changes planning budgets, opens FAQs, and prefills project contact', async ({ page }) => {
  await visit(page, '/pricing');
  const recommended = page.locator('.price-card.recommended');
  await expect(recommended.locator('[data-monthly]')).toHaveText('1,500');
  await page.getByRole('button', { name: /Yearly/ }).click();
  await expect(recommended.locator('[data-monthly]')).toHaveText('1,350');
  await expect(page.getByRole('button', { name: /Yearly/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Monthly', exact: true }).click();
  await expect(recommended.locator('[data-monthly]')).toHaveText('1,500');
  await page.getByText('Are these fixed prices?', { exact: true }).click();
  await expect(page.getByText(/These are illustrative planning budgets/)).toBeVisible();
  await recommended.getByRole('link', { name: 'Discuss a project' }).click();
  await expect(page).toHaveURL(/\/contact\?subject=Project%20collaboration/);
  await expect(page.locator('#contact-subject')).toHaveValue('Project collaboration');
});

test('contact validates fields, disables submission while loading, and stores a real message', async ({ page }) => {
  await visit(page, '/contact');
  const submit = page.getByRole('button', { name: 'Send your message' });
  await submit.click();
  await expect(page.locator('#contact-form [aria-invalid="true"]')).toHaveCount(4);
  await expect(page.locator('#contact-name')).toBeFocused();
  await page.locator('#contact-name').fill('Browser Test Visitor');
  await page.locator('#contact-email').fill('invalid-email');
  await page.locator('#contact-subject').fill('A browser-verified project');
  await page.locator('#contact-message').fill('A real integration-test message about a thoughtful web project.');
  await submit.click();
  await expect(page.locator('#email-error')).toHaveText('Please enter a valid email address.');
  await page.locator('#contact-email').fill('visitor@example.test');
  // Delay the actual request to observe pending state without replacing the API.
  await page.route('**/api/contact', async route => {
    await new Promise(resolve => setTimeout(resolve, 250));
    await route.continue();
  });
  const response = page.waitForResponse(result => result.url().endsWith('/api/contact') && result.request().method() === 'POST');
  await submit.click();
  await expect(page.getByRole('button', { name: 'Sending…' })).toBeDisabled();
  expect((await response).status()).toBe(201);
  await expect(page.locator('#contact-status')).toHaveText('Your message is safely received. Thanks for starting a conversation.');
  await expect(page.locator('#contact-message')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Send your message' })).toBeEnabled();
});

test('public pages stay within 390px and 320px viewports and mobile navigation works', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/', '/about', '/services', '/pricing', '/contact', '/privacy', '/terms']) {
      await visit(page, path);
      await noOverflow(page);
    }
  }
  await visit(page, '/');
  const toggle = page.getByRole('button', { name: 'Open menu', exact: true });
  await toggle.click();
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await page.locator('#mobile-nav').getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL('/contact');
  await expect(page.locator('#mobile-nav')).toBeHidden();
});

test('a user can register, edit their account, change password, use mobile navigation, and sign out', async ({ page }) => {
  const member = identity();
  await visit(page, '/register');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.locator('#auth-form [aria-invalid="true"]')).toHaveCount(3);
  await register(page, member);
  await expect(page.getByText(/verification email delivery is currently unavailable/)).toBeVisible();
  await visit(page, '/dashboard');
  await expect(page.getByRole('heading', { name: 'Your workspace', exact: true })).toBeVisible();
  await visit(page, '/profile');
  await page.locator('#name').fill('Updated Browser Member');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.portal-sidebar .portal-user strong')).toHaveText('Updated Browser Member');
  await visit(page, '/settings');
  await page.getByLabel('Email notifications').uncheck();
  await page.getByLabel('Project news').check();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Your preferences have been saved.')).toBeVisible();
  await visit(page, '/settings');
  await expect(page.getByLabel('Email notifications')).not.toBeChecked();
  await expect(page.getByLabel('Project news')).toBeChecked();
  const newPassword = randomBytes(22).toString('base64url');
  await page.locator('#currentPassword').fill(member.password);
  await page.locator('#newPassword').fill(newPassword);
  await page.locator('#confirmNewPassword').fill(newPassword);
  await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.getByText('Password updated. Your other sessions have been signed out.')).toBeVisible();
  await visit(page, '/notifications');
  await expect(page.getByText('Welcome to FalloutJr', { exact: true })).toBeVisible();
  await visit(page, '/admin');
  await expect(page).toHaveURL('/unauthorized');
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/dashboard');
  await noOverflow(page);
  const menu = page.getByRole('button', { name: 'Open workspace menu' });
  await menu.click();
  await expect(page.getByRole('dialog', { name: 'Workspace navigation' })).toBeVisible();
  expect(await page.locator('.portal-main').evaluate(node => node.inert)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  expect(await page.locator('.portal-main').evaluate(node => node.inert)).toBe(false);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.portal-sidebar [data-logout]').click();
  await expect(page).toHaveURL('/login');
  expect((await (await page.request.get('/api/auth/me')).json()).data.user).toBeNull();
  await visit(page, '/dashboard');
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.locator('#email').fill(member.email);
  await page.locator('#password').fill('Incorrect browser test password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.form-error')).toHaveText('Email or password is incorrect.');
  await page.locator('#password').fill(newPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('.portal-sidebar .portal-user strong')).toHaveText('Updated Browser Member');
});

test('home, login, and authenticated dashboard have no automated WCAG AA violations', async ({ page }) => {
  await visit(page, '/');
  await accessible(page);
  await visit(page, '/login');
  await accessible(page);
  const member = identity();
  const response = await page.request.post('/api/auth/register', {
    headers: { Origin: 'http://localhost:3100' },
    data: member,
  });
  expect(response.status()).toBe(201);
  await visit(page, '/dashboard');
  await expect(page.getByRole('heading', { name: 'Your account at a glance' })).toBeVisible();
  await accessible(page);
});
