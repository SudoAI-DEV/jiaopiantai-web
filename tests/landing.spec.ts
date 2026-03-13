import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load landing page on desktop', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/蕉片台/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should load landing page on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page).toHaveTitle(/蕉片台/i);
  });
});

test.describe('Navigation', () => {
  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');
    // Check for CTA buttons - the landing page has "立即试用" (Try Now) button
    const ctaButtons = page.locator('a:has-text("立即试用")');
    await expect(ctaButtons.first()).toBeVisible();
  });
});
