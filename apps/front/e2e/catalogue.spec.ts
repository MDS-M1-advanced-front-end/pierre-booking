import { expect, test } from '@playwright/test';

test('le catalogue affiche des salles', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Quorum/);
  await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
});
